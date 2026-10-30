// End-to-end check: loads the unpacked extension into Chromium and serves a fake
// X timeline for https://x.com/home, so no real X account or network is touched.
// Usage: CHROMIUM=/usr/bin/chromium npm run e2e
import { chromium } from "playwright-core";
import { mkdtempSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = readFileSync(join(root, "test/fixtures/timeline.html"), "utf8");
const profile = readFileSync(join(root, "test/fixtures/profile.html"), "utf8");
const following = readFileSync(join(root, "test/fixtures/following.html"), "utf8");
const status = readFileSync(join(root, "test/fixtures/status.html"), "utf8");
const api = {
  HomeTimeline: readFileSync(join(root, "test/fixtures/home-timeline.json"), "utf8"),
  UserTweets: readFileSync(join(root, "test/fixtures/user-tweets.json"), "utf8"),
  Following: readFileSync(join(root, "test/fixtures/following.json"), "utf8"),
};

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "xh-")), {
  executablePath: process.env.CHROMIUM || "/usr/bin/chromium",
  headless: true,
  locale: "en-US",
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`, "--headless=new"],
});

// The content script runs in an isolated world, so the page can't see XH. Read storage from an
// extension page instead. An unpacked extension's id is derived from its folder path.
const extId = createHash("sha256").update(root).digest("hex").slice(0, 32).replace(/./g, (x) => String.fromCharCode(97 + parseInt(x, 16)));
async function storedSent() {
  const p = await ctx.newPage();
  try {
    await p.goto(`chrome-extension://${extId}/src/options/options.html`);
    return (await p.evaluate(() => chrome.storage.local.get("xh:sent")))["xh:sent"] || [];
  } finally {
    await p.close();
  }
}

async function storedPart(part) {
  const p = await ctx.newPage();
  try {
    await p.goto(`chrome-extension://${extId}/src/options/options.html`);
    return (await p.evaluate((k) => chrome.storage.local.get("xh:" + k), part))["xh:" + part];
  } finally {
    await p.close();
  }
}

async function updateSettings(patch) {
  const p = await ctx.newPage();
  try {
    await p.goto(`chrome-extension://${extId}/src/options/options.html`);
    await p.evaluate(async (patch) => {
      const cur = (await chrome.storage.local.get("xh:settings"))["xh:settings"] || {};
      await chrome.storage.local.set({ "xh:settings": { ...cur, ...patch } });
    }, patch);
  } finally {
    await p.close();
  }
}

async function setStoredPart(part, value) {
  const p = await ctx.newPage();
  try {
    await p.goto(`chrome-extension://${extId}/src/options/options.html`);
    await p.evaluate(async ({ part, value }) => {
      await chrome.storage.local.set({ ["xh:" + part]: value });
    }, { part, value });
  } finally {
    await p.close();
  }
}

async function clearPace() {
  await setStoredPart("pace", { follows: [], unfollows: [] });
}

let failed = false;
const step = async (name, fn) => {
  try {
    await fn();
    console.log("ok  ", name);
  } catch (e) {
    failed = true;
    console.log("FAIL", name, "\n     ", e.message);
  }
};

try {
  await ctx.route("https://x.com/**", (r) => {
    const friendship = r.request().url().match(/\/friendships\/(create|destroy)\.json$/);
    if (friendship) {
      // X answers a follow/unfollow with the account (REST v1.1 user object).
      const body = new URLSearchParams(r.request().postData() || "");
      const h = body.get("screen_name");
      const user = { id_str: body.get("user_id"), screen_name: h, name: h[0].toUpperCase() + h.slice(1), following: friendship[1] === "create" };
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) });
    }
    const createTweet = r.request().url().match(/\/graphql\/[^/]+\/CreateTweet(\?|$)/);
    if (createTweet) {
      let data = {};
      try { data = JSON.parse(r.request().postData() || "{}"); } catch (_) {}
      const text = data.text || "";
      const to = data.to || "alice";
      if (text.includes("[reject]") || text.includes("[error]")) {
        return r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ errors: [{ code: 187, message: "Status is a duplicate." }] }),
        });
      }
      const full_text = `@${to} ${text}`;
      const toCodePoints = Array.from(`@${to} `).length;
      const textCodePoints = Array.from(text).length;
      const body = {
        data: {
          create_tweet: {
            tweet_results: {
              result: {
                legacy: {
                  full_text,
                  display_text_range: [toCodePoints, toCodePoints + textCodePoints],
                  in_reply_to_status_id_str: to === "bob" ? "222" : "111",
                  in_reply_to_screen_name: to,
                  is_quote_status: false,
                },
              },
            },
          },
        },
      };
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    }
    const name = Object.keys(api).find((k) => r.request().url().endsWith("/" + k));
    if (name) return r.fulfill({ status: 200, contentType: "application/json", body: api[name] });
    if (new URL(r.request().url()).pathname === "/me_test/following") return r.fulfill({ status: 200, contentType: "text/html", body: following });
    if (new URL(r.request().url()).pathname === "/me_test") return r.fulfill({ status: 200, contentType: "text/html", body: profile.replace(/@eve/g, "@me_test").replace(/Eve/g, "Me") });
    if (new URL(r.request().url()).pathname === "/eve") return r.fulfill({ status: 200, contentType: "text/html", body: profile });
    if (new URL(r.request().url()).pathname === "/alice/status/111") return r.fulfill({ status: 200, contentType: "text/html", body: status });
    return r.fulfill({ status: 200, contentType: "text/html", body: fixture });
  });
  const page = await ctx.newPage();
  await page.goto("https://x.com/home");
  await page.bringToFront();

  await step("badges show views per hour, old post is marked stale", async () => {
    await page.waitForSelector("#fresh .xh-badge");
    await page.waitForFunction(() => /15K\/h/.test(document.querySelector("#fresh .xh-badge")?.textContent), null, { timeout: 5000 });
    await page.waitForFunction(() => /^694\/h · old post/.test(document.querySelector("#old .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#old .xh-chip.xh-stale"));
  });

  await step("views per hour colour the age chip: hot, warm, normal, none without data", async () => {
    // alice: 30000 views in 2 h. carol: 600 views in 10 min (counted as 30 min).
    // eve: 100 views in 15 min. dan: no view data.
    await page.waitForFunction(() => /^15K\/h/.test(document.querySelector("#fresh .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#fresh .xh-chip.xh-hot"));
    assert.ok(await page.$("#fresh .xh-chip.xh-hot svg"));
    await page.waitForFunction(() => /^1\.2K\/h/.test(document.querySelector("#carol .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#carol .xh-chip.xh-warm"));
    await page.waitForFunction(() => /^200\/h/.test(document.querySelector("#eve .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#eve .xh-chip.xh-age"));
    assert.strictEqual(await page.$("#dan .xh-chip.xh-age, #dan .xh-chip.xh-hot, #dan .xh-chip.xh-warm, #dan .xh-chip.xh-stale"), null);
  });


  await step("follow relationships from fetch and XHR responses show on badges", async () => {
    await page.waitForFunction(() => /⇄ mutual/.test(document.querySelector("#fresh .xh-badge")?.textContent), null, { timeout: 5000 });
    await page.waitForFunction(() => /← follows you/.test(document.querySelector("#old .xh-badge")?.textContent), null, { timeout: 5000 });
    await page.waitForFunction(() => /→ you follow/.test(document.querySelector("#carol .xh-badge")?.textContent), null, { timeout: 5000 });

    // When neither follows the other any more, the relationship chip goes away.
    const sendRel = (following) =>
      page.evaluate((following) => {
        window.dispatchEvent(
          new CustomEvent("xh-relations", {
            detail: JSON.stringify({ u: [{ handle: "dan", following, followedBy: false }], v: [], f: [], at: Date.now() }),
          })
        );
      }, following);
    await sendRel(true);
    await page.waitForSelector("#dan .xh-chip.xh-rel-following", { timeout: 5000 });
    await sendRel(false);
    await page.waitForFunction(() => !document.querySelector("#dan .xh-chip[class*='xh-rel-']"), null, { timeout: 5000 });
  });

  await step("liking counts in the HUD and the author's badge", async () => {
    await page.click("#fresh [data-testid=like]");
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=likes] b")?.textContent === "1");
    await page.waitForFunction(() => /1× · today/.test(document.querySelector("#fresh .xh-badge").textContent));
  });

  const box = '[data-testid="tweetTextarea_0"]';
  const text = "This is a great idea, I use n8n for the same kind of automation";

  await step("sending a reply counts as a reply to that author", async () => {
    await page.click("#fresh [data-testid=reply]");
    await page.fill(box, text);
    await page.click('[data-testid="tweetButton"]');
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=replies] b")?.textContent === "1");
    await page.waitForFunction(() => /2× · today/.test(document.querySelector("#fresh .xh-badge").textContent));
  });

  await step("typing a near-duplicate shows the warning", async () => {
    await page.waitForFunction((sel) => document.querySelector(sel).textContent === "", box);
    await page.fill(box, "This is a great idea, I use n8n for the same sort of automation!");
    await page.waitForSelector(".xh-dup:not([hidden])", { timeout: 3000 });
    assert.match(await page.textContent(".xh-dup"), /similar to what you sent .* to @alice/);
  });

  await step("an unrelated reply hides the warning", async () => {
    await page.fill(box, "Completely different thought about weekend hiking plans");
    await page.waitForSelector(".xh-dup[hidden]", { state: "attached", timeout: 3000 });
  });

  await step("X keyboard shortcuts: l on a focused post counts, l again un-counts", async () => {
    await page.focus("#old");
    await page.keyboard.press("l");
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=likes] b")?.textContent === "2");
    await page.keyboard.press("l");
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=likes] b")?.textContent === "1");
  });

  await step("X keyboard shortcuts: r then send counts as a reply to the focused author", async () => {
    await page.focus("#old");
    await page.keyboard.press("r");
    await page.fill(box, "Bob, the old post still holds up after three days");
    await page.click('[data-testid="tweetButton"]');
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=replies] b")?.textContent === "2");
    await page.waitForFunction(() => /1× · today/.test(document.querySelector("#old .xh-badge").textContent));
  });

  await step("typing l inside the composer is not counted as a like", async () => {
    await page.click(box);
    await page.keyboard.type("l");
    await page.waitForTimeout(500);
    assert.strictEqual(await page.textContent(".xh-hud [data-k=likes] b"), "1");
    await page.fill(box, "");
  });

  await step("nested composer text is recorded once", async () => {
    const count = await page.evaluate(() => document.querySelectorAll('[data-testid^="tweetTextarea_"]').length);
    assert.strictEqual(count, 3, "fixture has 3 nested elements");
    await page.click("#fresh [data-testid=reply]");
    await page.fill(box, "Testing nested composer recorded once");
    await page.click('[data-testid="tweetButton"]');
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=replies] b")?.textContent === "3");
    const lastSent = (await storedSent()).at(-1);
    assert.strictEqual(lastSent.text, "Testing nested composer recorded once");
  });

  await step("a confirmed reply counts once, to X's named author", async () => {
    await page.focus("#old");
    await page.keyboard.press("r");
    await page.fill(box, "Bob, this confirms author comes from X");
    await page.click('[data-testid="tweetButton"]');
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=replies] b")?.textContent === "4");
    await page.waitForFunction(() => /2× · today/.test(document.querySelector("#old .xh-badge").textContent));
    const lastSent = (await storedSent()).at(-1);
    assert.strictEqual(lastSent.to, "bob");
    assert.strictEqual(lastSent.kind, "reply");
  });

  await step("a rejected send is not recorded or counted", async () => {
    await page.click("#fresh [data-testid=reply]");
    await page.fill(box, "This reply will be rejected [reject]");
    await page.click('[data-testid="tweetButton"]');
    await page.waitForTimeout(600);
    assert.strictEqual(await page.textContent(".xh-hud [data-k=replies] b"), "4");
    const sentTexts = (await storedSent()).map((x) => x.text);
    assert.ok(!sentTexts.includes("This reply will be rejected [reject]"));
  });

  await step("text from a rejected send does not warn", async () => {
    await page.waitForFunction((sel) => document.querySelector(sel).textContent === "", box);
    await page.fill(box, "This reply will be rejected [reject]");
    await page.waitForTimeout(600);
    assert.strictEqual(await page.$(".xh-dup:not([hidden])"), null);
    await page.fill(box, "");
  });

  await step("the third identical short reply warns", async () => {
    await page.click("#fresh [data-testid=reply]");
    await page.fill(box, "谢谢");
    await page.click('[data-testid="tweetButton"]');
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=replies] b")?.textContent === "5");

    // The same text within 1.5 s counts as one send (click + Ctrl+Enter); a person is never that fast.
    await page.waitForTimeout(1600);
    await page.click("#fresh [data-testid=reply]");
    await page.fill(box, "谢谢");
    await page.click('[data-testid="tweetButton"]');
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=replies] b")?.textContent === "6");

    await page.waitForFunction((sel) => document.querySelector(sel).textContent === "", box);
    await page.fill(box, "谢谢");
    await page.waitForSelector(".xh-dup:not([hidden])", { timeout: 3000 });
    assert.match(await page.textContent(".xh-dup"), /sent.*2 times/i);
    await page.fill(box, "");
    await page.waitForSelector(".xh-dup[hidden]", { state: "attached", timeout: 2000 });
  });

  await step("with no post request, the send is recorded from the composer after 3 s", async () => {
    await page.evaluate(() => { window.__noCreateTweet = true; });
    await page.click("#fresh [data-testid=reply]");
    await page.fill(box, "Fallback recording when no post request is seen");
    await page.click('[data-testid="tweetButton"]');

    await page.waitForTimeout(1000);
    assert.strictEqual(await page.textContent(".xh-hud [data-k=replies] b"), "6");

    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=replies] b")?.textContent === "7", null, { timeout: 5000 });
    const lastSent = (await storedSent()).at(-1);
    assert.strictEqual(lastSent.text, "Fallback recording when no post request is seen");
    assert.strictEqual(lastSent.to, "alice");
    await page.evaluate(() => { window.__noCreateTweet = false; });
  });

  await step("a forged confirmation without a send is ignored", async () => {
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("xh-relations", {
          detail: JSON.stringify({
            u: [],
            v: [],
            f: [],
            c: [{ ok: true, kind: "reply", text: "Forged reply text", to: "alice" }],
            at: Date.now(),
          }),
        })
      );
    });
    await page.waitForTimeout(500);
    assert.strictEqual(await page.textContent(".xh-hud [data-k=replies] b"), "7");
    const sentTexts = (await storedSent()).map((x) => x.text);
    assert.ok(!sentTexts.includes("Forged reply text"));
  });

  await step("Shift+F on someone you already follow just says so", async () => {
    await page.focus("#fresh");
    await page.keyboard.press("Shift+F");
    await page.waitForFunction(() => /already follow @alice/.test(document.querySelector(".xh-toast")?.textContent));
  });

  await step("Shift+F focuses Follow in the hover card the user opened; Enter follows", async () => {
    await page.hover("#old [data-testid=UserAvatar-Container-bob]"); // a real pointer, like the user's
    await page.waitForSelector(".hc");
    await page.focus("#old");
    await page.keyboard.press("Shift+F");
    await page.waitForSelector(".xh-follow-focus", { timeout: 4000 });
    assert.strictEqual(await page.evaluate(() => document.activeElement.dataset.testid), "2-follow");
    if (process.env.SHOTS) await page.screenshot({ path: join(process.env.SHOTS, "light-follow.png") });
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=follows] b")?.textContent === "1");
    await page.waitForFunction(() => /⇄ mutual/.test(document.querySelector("#old .xh-badge").textContent));
  });

  await step("Esc cancels the follow assistant without following", async () => {
    await page.hover("#dan [data-testid=UserAvatar-Container-dan]");
    await page.waitForSelector(".hc button[aria-label='Follow @dan']");
    await page.focus("#dan");
    await page.keyboard.press("Shift+F");
    await page.waitForSelector(".xh-follow-focus", { timeout: 4000 });
    await page.keyboard.press("Escape");
    await page.waitForSelector(".xh-follow-focus", { state: "detached", timeout: 2000 });
    assert.strictEqual(await page.textContent(".xh-hud [data-k=follows] b"), "1");
  });

  await step("following from a post's ⋯ menu counts too; other menu items don't", async () => {
    await page.click("#carol [data-testid=caret]");
    await page.click("#mi-mute");
    await page.waitForTimeout(500);
    assert.strictEqual(await page.textContent(".xh-hud [data-k=follows] b"), "1");
    await page.click("#carol [data-testid=caret]");
    await page.click("#mi-follow");
    await page.waitForFunction(() => /Followed @carol/.test(document.querySelector(".xh-toast")?.textContent), null, { timeout: 3000 });
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=follows] b")?.textContent === "2", null, { timeout: 3000 });
  });

  await step("Shift+F while typing does nothing", async () => {
    await page.click(box);
    await page.keyboard.press("Shift+F");
    await page.waitForTimeout(600);
    assert.strictEqual(await page.$(".xh-follow-focus"), null);
    await page.fill(box, "");
  });

  await step("theme follows X's background", async () => {
    assert.strictEqual(await page.evaluate(() => document.documentElement.dataset.xhTheme), "light");
    await page.evaluate(() => document.body.classList.add("dark"));
    await page.waitForFunction(() => document.documentElement.dataset.xhTheme === "dark", null, { timeout: 7000 });
    if (process.env.SHOTS) {
      await page.hover("#dan [data-testid=UserAvatar-Container-dan]");
      await page.waitForSelector(".hc button");
      await page.focus("#dan");
      await page.keyboard.press("Shift+F");
      await page.waitForSelector(".xh-follow-focus", { timeout: 4000 });
      await page.fill(box, "This is a great idea, I use n8n for the same sort of automation!");
      await page.waitForTimeout(800);
      await page.screenshot({ path: join(process.env.SHOTS, "dark.png") });
      await page.keyboard.press("Escape");
      await page.fill(box, "");
      await page.evaluate(() => document.body.classList.remove("dark"));
      await page.fill(box, "This is a great idea, I use n8n for the same sort of automation!");
      await page.waitForTimeout(800);
      await page.screenshot({ path: join(process.env.SHOTS, "light.png") });
      await page.fill(box, "");
    }
  });

  await step("Alt+H hides the HUD", async () => {
    await page.keyboard.press("Alt+KeyH");
    await page.waitForSelector(".xh-hud[hidden]", { state: "attached", timeout: 3000 });
  });

  await step("extension never clicks anything by itself", async () => {
    // The fixture only changes through our own page.click/fill calls above; count clicks the page saw.
    const clicks = await page.evaluate(() => {
      let n = 0;
      document.addEventListener("click", (e) => e.isTrusted || n++, true);
      return new Promise((r) => setTimeout(() => r(n), 2000));
    });
    assert.strictEqual(clicks, 0);
  });
  await step("no hover card: Shift+F falls back to the author's profile, Enter follows there", async () => {
    await page.focus("#eve");
    await page.keyboard.press("Shift+F");
    await page.waitForURL("https://x.com/eve", { timeout: 6000 });
    await page.waitForSelector(".xh-follow-focus", { timeout: 6000 });
    assert.strictEqual(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Follow @eve");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => /Alt\+← back/.test(document.querySelector(".xh-toast")?.textContent), null, { timeout: 3000 });
    await page.keyboard.press("Alt+KeyH"); // stats bar was hidden by an earlier step
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=follows] b")?.textContent === "3", null, { timeout: 3000 });
  });

  await step("extension never fakes mouse or pointer events", async () => {
    // Counted by the fixture since the first page load, so this covers every Shift+F above.
    assert.strictEqual(await page.evaluate(() => +(sessionStorage.syntheticPointer || 0)), 0);
  });

  const panelText = () => page.evaluate(() => document.querySelector(".xh-panel")?.textContent || "");

  await step("Alt+U on your Following page lists only who doesn't follow you back", async () => {
    await page.goto("https://x.com/me_test/following");
    await page.waitForSelector("#zed");
    // Any script on x.com can send this event; a forged handle must not become a "//evil.com" link.
    await page.evaluate(() => {
      const u = [{ handle: "/evil.com", following: true, followedBy: false }, { handle: "fake", id: '1"]', following: true }];
      window.dispatchEvent(new CustomEvent("xh-relations", { detail: JSON.stringify({ u, v: [], at: Date.now() }) }));
    });
    await page.waitForTimeout(1500); // relationships are written in a 1 s batch
    await page.keyboard.press("Alt+KeyU");
    await page.waitForSelector(".xh-panel:not([hidden])", { timeout: 3000 });
    await page.waitForFunction(() => /Following page last read/.test(document.querySelector(".xh-panel").textContent), null, { timeout: 3000 });
    const text = await panelText();
    assert.match(text, /@zed/);
    assert.match(text, /Ann Lee@ann/);
    assert.match(text, /@quoted_dave/); // seen earlier on the home timeline
    assert.doesNotMatch(text, /@mia/); // mutual
    assert.doesNotMatch(text, /@alice/); // mutual
    assert.doesNotMatch(text, /@me_test/); // yourself
    assert.doesNotMatch(text, /evil/);
    assert.strictEqual(await page.$('.xh-panel a[href^="//"]'), null);
    assert.match(text, /@fake/); // well-formed handle kept, its broken id dropped
    assert.strictEqual(await page.getAttribute('.xh-panel a[href="/ann"]', "href"), "/ann");
    assert.strictEqual(await page.$(".xh-panel [data-testid$='-unfollow'], .xh-panel button:not(.xh-panel-close)"), null);
    if (process.env.SHOTS) await page.screenshot({ path: join(process.env.SHOTS, "panel.png") });
  });

  await step("panel search narrows by name or handle", async () => {
    await page.fill(".xh-panel-search", "lee");
    await page.waitForFunction(() => !/@zed/.test(document.querySelector(".xh-panel-list").textContent));
    assert.match(await panelText(), /@ann/);
    await page.fill(".xh-panel-search", "");
  });

  await step("Esc closes the panel", async () => {
    await page.keyboard.press("Escape");
    await page.waitForSelector(".xh-panel[hidden]", { state: "attached", timeout: 2000 });
  });

  await step("unfollowing by hand on X is counted and drops off the list", async () => {
    await page.click("#zed [data-testid='20-unfollow']");
    await page.click("[data-testid=confirmationSheetConfirm]");
    await page.waitForFunction(() => /Unfollowed @zed/.test(document.querySelector(".xh-toast")?.textContent), null, { timeout: 3000 });
    await page.keyboard.press("Alt+KeyU");
    await page.waitForFunction(() => /Unfollows today: 1\/20/.test(document.querySelector(".xh-panel").textContent), null, { timeout: 3000 });
    assert.doesNotMatch(await page.textContent(".xh-panel-list"), /@zed/);
  });

  await step("a mutual who stops following back shows on top of the panel until dismissed", async () => {
    const send = (u) => page.evaluate((u) => {
      window.dispatchEvent(new CustomEvent("xh-relations", { detail: JSON.stringify({ u, v: [], at: Date.now() }) }));
    }, u);
    await send([{ handle: "lost_lia", name: "Lia", following: true, followedBy: true }]);
    await page.waitForTimeout(1500); // relationships are written in a 1 s batch
    await send([
      { handle: "lost_lia", name: "Lia", following: true, followedBy: false },
      { handle: "never_kim", following: true, followedBy: false }, // never mutual: no alert
    ]);
    await page.waitForTimeout(1500);
    if (await page.$(".xh-panel[hidden]")) await page.keyboard.press("Alt+KeyU");
    await page.waitForSelector('.xh-panel-recent a[href="/lost_lia"]', { timeout: 3000 });
    assert.match(await page.textContent(".xh-panel-list"), /Recently unfollowed you \(1\)/);
    assert.match(await page.textContent('.xh-panel-recent a[href="/lost_lia"]'), /unfollow noticed just now · still mutual just now/);
    assert.strictEqual(await page.$('.xh-panel-recent a[href="/never_kim"]'), null);
    assert.ok(await page.$('.xh-panel-list li:not(.xh-panel-recent) a[href="/never_kim"]'));
    if (process.env.SHOTS) await page.screenshot({ path: join(process.env.SHOTS, "panel-recent.png") });

    await page.click(".xh-panel-recent .xh-panel-dismiss");
    await page.waitForSelector(".xh-panel-recent", { state: "detached", timeout: 3000 });
    assert.ok(await page.$('.xh-panel-list li:not(.xh-panel-recent) a[href="/lost_lia"]'));
    assert.doesNotMatch(await page.textContent(".xh-panel-list"), /Recently unfollowed you/);
    const lia = (await storedPart("rel")).lost_lia;
    assert.strictEqual(typeof lia.ackAt, "number");
    assert.strictEqual(typeof lia.lostAt, "number");
    assert.strictEqual(typeof lia.mAt, "number");
    await page.keyboard.press("Escape");
  });

  await step("long display names stay on one line with ellipsis and keep panel width", async () => {
    if (await page.$(".xh-panel[hidden]")) await page.keyboard.press("Alt+KeyU");
    await page.waitForSelector(".xh-panel:not([hidden])", { timeout: 3000 });
    const widthBefore = await page.evaluate(() => Math.round(document.querySelector(".xh-panel").getBoundingClientRect().width));

    const longName = "Alice With A Very Long Display Name For Testing UI"; // 50 chars
    assert.strictEqual(longName.length, 50);
    await page.evaluate((name) => {
      window.dispatchEvent(
        new CustomEvent("xh-relations", {
          detail: JSON.stringify({
            u: [{ handle: "long_user", name, following: true, followedBy: false }],
            v: [],
            f: [],
            at: Date.now(),
          }),
        })
      );
    }, longName);
    await page.waitForTimeout(1500); // 1s batch delay
    await page.waitForSelector('.xh-panel a[href="/long_user"]', { timeout: 3000 });

    const widthAfter = await page.evaluate(() => Math.round(document.querySelector(".xh-panel").getBoundingClientRect().width));
    assert.strictEqual(widthAfter, widthBefore, "panel width must not change with long display names");

    const rowMetrics = await page.evaluate(() => {
      const row = document.querySelector('.xh-panel a[href="/long_user"]');
      const user = row.querySelector(".xh-panel-user");
      const name = row.querySelector(".xh-panel-name");
      const rUser = user.getBoundingClientRect();
      return {
        userHeight: rUser.height,
        nameScrollWidth: name.scrollWidth,
        nameClientWidth: name.clientWidth,
      };
    });
    assert.ok(rowMetrics.userHeight <= 26, `name line wrapped: height is ${rowMetrics.userHeight}`);
    assert.ok(rowMetrics.nameScrollWidth > rowMetrics.nameClientWidth, "long display name must overflow and be truncated");
    await page.keyboard.press("Escape");
  });

  await step("a confirmed reply marks the post as replied", async () => {
    await page.goto("https://x.com/home");
    await page.waitForSelector("#old .xh-badge");
    // #old was replied to in an earlier step and confirmed by X
    await page.waitForFunction(() => /✓ replied/.test(document.querySelector("#old .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#old .xh-chip.xh-replied"));

    // Check storage holds the replied id
    const replied = await storedPart("replied");
    assert.ok(replied && typeof replied["222"] === "number");

    // Survives reload
    await page.reload();
    await page.waitForSelector("#old .xh-badge");
    await page.waitForFunction(() => /✓ replied/.test(document.querySelector("#old .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#old .xh-chip.xh-replied"));
  });

  await step("a reply from another device (in a response) marks the post", async () => {
    assert.strictEqual(await page.$("#carol .xh-chip.xh-replied"), null);
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("xh-relations", {
          detail: JSON.stringify({
            u: [],
            v: [{ id: "8888", author: "me_test", inReplyTo: "444" }],
            f: [],
            at: Date.now(),
          }),
        })
      );
    });
    await page.waitForFunction(() => /✓ replied/.test(document.querySelector("#carol .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#carol .xh-chip.xh-replied"));

    // Wait for the 2 s batch write and verify it was persisted
    await page.waitForTimeout(2200);
    const replied = await storedPart("replied");
    assert.ok(replied && typeof replied["444"] === "number");
  });

  await step("post replies and author size badge chip shows all data, no own count, and switches off", async () => {
    // 1. Scenario: Own follower count unknown (relMeta.me has no followers yet)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("xh-relations", {
          detail: JSON.stringify({
            u: [],
            v: [{ id: "555", replies: 23, author: "dan", authorFollowers: 46000 }],
            f: [],
            at: Date.now(),
          }),
        })
      );
    });
    await page.waitForFunction(() => /💬 23(?! ·)/.test(document.querySelector("#dan .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#dan .xh-chip.xh-replies"));

    // 2. Scenario: All data known (own follower count 3800 arrives for me_test)
    // 46000 / 3800 = 12.105... -> 12x
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("xh-relations", {
          detail: JSON.stringify({
            u: [{ handle: "me_test", followers: 3800 }],
            v: [{ id: "555", replies: 23, author: "dan", authorFollowers: 46000 }],
            f: [],
            at: Date.now(),
          }),
        })
      );
    });
    await page.waitForFunction(() => /💬 23 · 12×/.test(document.querySelector("#dan .xh-badge")?.textContent), null, { timeout: 5000 });

    // Wait for relMeta.me batch write (2 s) and verify persisted
    await page.waitForTimeout(2200);
    const relMeta = await storedPart("relMeta");
    assert.strictEqual(relMeta?.me?.followers, 3800);
    assert.strictEqual(relMeta?.me?.handle, "me_test");

    // 3. Scenario: No data for the post (#eve has no reply_count)
    assert.strictEqual(await page.$("#eve .xh-chip.xh-replies"), null);

    // 4. Scenario: Switched off (showReplies false hides reply chips, showReplied false hides replied chips)
    await updateSettings({ showReplies: false });
    await page.waitForFunction(() => !document.querySelector(".xh-chip.xh-replies"), null, { timeout: 3000 });

    await updateSettings({ showReplies: true, showReplied: false });
    await page.waitForFunction(() => !document.querySelector(".xh-chip.xh-replied") && !!document.querySelector(".xh-chip.xh-replies"), null, { timeout: 3000 });
    assert.ok(await page.$("#dan .xh-chip.xh-replies"));

    // Restore settings
    await updateSettings({ showReplied: true });
    await page.waitForFunction(() => !!document.querySelector("#old .xh-chip.xh-replied"), null, { timeout: 3000 });
  });
  await step("your own posts show no relationship or interaction chips; liking them only counts for the day", async () => {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("xh-relations", { detail: JSON.stringify({
        u: [{ handle: "me_test", following: false, followedBy: false }],
        v: [{ id: "777", replies: 14, author: "me_test", authorFollowers: 4600 }],
        f: [], at: Date.now(),
      }) }));
    });
    await page.waitForFunction(() => /💬 14/.test(document.querySelector("#mine .xh-badge")?.textContent), null, { timeout: 5000 });
    const before = Number(await page.textContent(".xh-hud [data-k=likes] b"));
    await page.click("#mine [data-testid=like]");
    await page.waitForFunction((n) => document.querySelector(".xh-hud [data-k=likes] b")?.textContent === String(n), before + 1);
    await page.waitForTimeout(400);
    const badge = await page.textContent("#mine .xh-badge");
    assert.doesNotMatch(badge, /not following|you:|\d+×/, "no relationship or interaction chip on your own post");
    assert.doesNotMatch(badge, /4\.6K/, "no follower count of your own account");
  });

  await step("a notifications response counts likes and replies from others", async () => {
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("xh-relations", {
          detail: JSON.stringify({
            u: [],
            v: [],
            f: [],
            n: [
              { kind: "like", from: { handle: "liker_bob", id: "102" }, key: "L:102:501", at: Date.now() },
              { kind: "like", from: { handle: "liker_carol", id: "103" }, key: "L:103:502", at: Date.now() },
              { kind: "like", from: { handle: "liker_carol", id: "103" }, key: "L:103:503", at: Date.now() },
              { kind: "reply", from: { handle: "replier_frank", id: "106" }, key: "P:601", at: Date.now() },
              { kind: "like", from: { handle: "me_test", id: "9999" }, key: "L:9999:501", at: Date.now() },
            ],
            at: Date.now(),
          }),
        })
      );
    });

    await page.waitForTimeout(2200);

    const inSeen = await storedPart("inSeen");
    assert.ok(inSeen && typeof inSeen["L:102:501"] === "number");
    assert.ok(inSeen && typeof inSeen["L:103:502"] === "number");
    assert.ok(inSeen && typeof inSeen["L:103:503"] === "number");
    assert.ok(inSeen && typeof inSeen["P:601"] === "number");
    assert.strictEqual(inSeen["L:9999:501"], undefined, "self-like not recorded");

    const people = await storedPart("people");
    assert.strictEqual(people?.liker_bob?.in?.likes, 1);
    assert.strictEqual(people?.liker_carol?.in?.likes, 2);
    assert.strictEqual(people?.replier_frank?.in?.replies, 1);
    assert.strictEqual(people?.me_test?.in, undefined, "user has no in count");
  });

  await step("loading the same notifications twice does not change counts", async () => {
    const beforePeople = await storedPart("people");
    const bobLikesBefore = beforePeople?.liker_bob?.in?.likes;
    const carolLikesBefore = beforePeople?.liker_carol?.in?.likes;
    const frankRepliesBefore = beforePeople?.replier_frank?.in?.replies;

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("xh-relations", {
          detail: JSON.stringify({
            u: [],
            v: [],
            f: [],
            n: [
              { kind: "like", from: { handle: "liker_bob", id: "102" }, key: "L:102:501", at: Date.now() },
              { kind: "like", from: { handle: "liker_carol", id: "103" }, key: "L:103:502", at: Date.now() },
              { kind: "like", from: { handle: "liker_carol", id: "103" }, key: "L:103:503", at: Date.now() },
              { kind: "reply", from: { handle: "replier_frank", id: "106" }, key: "P:601", at: Date.now() },
            ],
            at: Date.now(),
          }),
        })
      );
    });

    await page.waitForTimeout(2200);

    const afterPeople = await storedPart("people");
    assert.strictEqual(afterPeople?.liker_bob?.in?.likes, bobLikesBefore);
    assert.strictEqual(afterPeople?.liker_carol?.in?.likes, carolLikesBefore);
    assert.strictEqual(afterPeople?.replier_frank?.in?.replies, frankRepliesBefore);
  });

  await step("two-direction interaction chip shows both sides, author-only, and honors showInbound", async () => {
    // Bob has 2 replies so far; click like on #old to bring user interactions to 3
    await page.click("#old [data-testid=like]");

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("xh-relations", {
          detail: JSON.stringify({
            u: [],
            v: [],
            f: [],
            n: [
              { kind: "like", from: { handle: "carol", id: "3" }, key: "L:3:901", at: Date.now() },
              { kind: "like", from: { handle: "carol", id: "3" }, key: "L:3:902", at: Date.now() },
              { kind: "like", from: { handle: "bob", id: "2" }, key: "L:2:910", at: Date.now() },
              { kind: "like", from: { handle: "bob", id: "2" }, key: "L:2:911", at: Date.now() },
              { kind: "like", from: { handle: "bob", id: "2" }, key: "L:2:912", at: Date.now() },
              { kind: "reply", from: { handle: "bob", id: "2" }, key: "P:913", at: Date.now() },
              { kind: "reply", from: { handle: "bob", id: "2" }, key: "P:914", at: Date.now() },
            ],
            at: Date.now(),
          }),
        })
      );
    });

    // Scenario 2: Only author interacted (Carol: 0 user interactions, 2 from Carol)
    await page.waitForFunction(() => /you 0 · them 2 · today/.test(document.querySelector("#carol .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#carol .xh-chip.xh-seen"));

    // Scenario 1: Both directions (Bob: 3 user interactions, 5 from Bob)
    await page.waitForFunction(() => /you 3 · them 5 · today/.test(document.querySelector("#old .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#old .xh-chip.xh-seen"));

    // Scenario 3: Reverse view off
    await updateSettings({ showInbound: false });
    await page.waitForFunction(() => /3× · today/.test(document.querySelector("#old .xh-badge")?.textContent), null, { timeout: 5000 });
    await page.waitForFunction(() => !/them|you \d/.test(document.querySelector("#carol .xh-badge")?.textContent), null, { timeout: 5000 });

    // Restore showInbound setting
    await updateSettings({ showInbound: true });
    await page.waitForFunction(() => /you 0 · them 2 · today/.test(document.querySelector("#carol .xh-badge")?.textContent), null, { timeout: 5000 });
    await page.waitForFunction(() => /you 3 · them 5 · today/.test(document.querySelector("#old .xh-badge")?.textContent), null, { timeout: 5000 });

    await page.waitForTimeout(2200);
    const people = await storedPart("people");
    assert.strictEqual(people?.carol?.in?.likes, 2);
    assert.strictEqual(people?.bob?.in?.likes, 3);
    assert.strictEqual(people?.bob?.in?.replies, 2);
  });

  await step("age chip switch hides the age chip and empty badges are removed", async () => {
    // 1. Initial state: #fresh and #dan have badges and age chips
    await page.waitForSelector("#fresh .xh-badge");
    assert.ok(await page.$("#fresh .xh-chip.xh-hot, #fresh .xh-chip.xh-age"));

    // 2. Scenario: Age chip off - hides age chip, posts with other chips keep badge
    await updateSettings({ showAge: false });
    await page.waitForFunction(() => !document.querySelector(".xh-chip.xh-age, .xh-chip.xh-hot, .xh-chip.xh-warm, .xh-chip.xh-stale"), null, { timeout: 3000 });
    assert.ok(await page.$("#fresh .xh-badge"));
    assert.match(await page.textContent("#fresh .xh-badge"), /⇄ mutual/);
    assert.doesNotMatch(await page.textContent("#fresh .xh-badge"), /15K\/h/);

    // 3. Scenario: Nothing left to show - empty badges are removed
    await updateSettings({ showAge: false, showReplies: false, keyAccounts: false });
    await page.waitForFunction(() => document.querySelector("#dan .xh-badge") === null, null, { timeout: 3000 });
    assert.strictEqual(await page.$("#dan .xh-badge"), null);

    // With all chips off, all badges are removed
    await updateSettings({ showAge: false, showRel: false, showReplies: false, showSeen: false, showReplied: false, keyAccounts: false });
    await page.waitForFunction(() => document.querySelectorAll(".xh-badge").length === 0, null, { timeout: 3000 });
    assert.strictEqual(await page.$(".xh-badge"), null);

    // 4. Restore settings to defaults
    await updateSettings({ showAge: true, showRel: true, showReplies: true, showSeen: true, showReplied: true, keyAccounts: true });
    await page.waitForFunction(() => !!document.querySelector("#fresh .xh-badge") && !!document.querySelector("#dan .xh-badge"), null, { timeout: 3000 });
    assert.match(await page.textContent("#fresh .xh-badge"), /15K\/h/);
  });

  await step("interaction chip switch hides both forms", async () => {
    // 1. Initial state: #old shows two-direction interaction chip ("you 3 · them 5 · today")
    await page.waitForFunction(() => /you 3 · them 5 · today/.test(document.querySelector("#old .xh-badge")?.textContent), null, { timeout: 3000 });
    assert.ok(await page.$("#old .xh-chip.xh-seen"));

    // 2. Scenario: showSeen off hides the two-direction form (even with showInbound true)
    await updateSettings({ showSeen: false });
    await page.waitForFunction(() => !document.querySelector(".xh-chip.xh-seen"), null, { timeout: 3000 });
    assert.strictEqual(await page.$("#old .xh-chip.xh-seen"), null);
    assert.strictEqual(await page.$("#carol .xh-chip.xh-seen"), null);

    // 3. Scenario: showSeen off also hides the single-direction form (when showInbound false)
    await updateSettings({ showSeen: false, showInbound: false });
    await page.waitForTimeout(400);
    assert.strictEqual(await page.$(".xh-chip.xh-seen"), null);

    // 4. Turning showSeen on restores single-direction form when showInbound is false
    await updateSettings({ showSeen: true, showInbound: false });
    await page.waitForFunction(() => /3× · today/.test(document.querySelector("#old .xh-badge")?.textContent), null, { timeout: 3000 });
    assert.ok(await page.$("#old .xh-chip.xh-seen"));

    // 5. Turning showInbound on restores two-direction form
    await updateSettings({ showSeen: true, showInbound: true });
    await page.waitForFunction(() => /you 3 · them 5 · today/.test(document.querySelector("#old .xh-badge")?.textContent), null, { timeout: 3000 });
    assert.ok(await page.$("#old .xh-chip.xh-seen"));

    // 6. Restore settings to defaults
    await updateSettings({ showSeen: true, showInbound: true });
  });

  await step("duplicate warning switch turns the warning off", async () => {
    const dupText = "Identical reply for duplicate warning switch test";

    // 1. Turn dupWarn off
    await updateSettings({ dupWarn: false });

    // 2. Open reply composer and send the first copy
    await page.click("#fresh [data-testid=reply]");
    await page.fill(box, dupText);
    const repliesBefore = Number(await page.textContent(".xh-hud [data-k=replies] b"));
    await page.click('[data-testid="tweetButton"]');
    await page.waitForFunction((n) => Number(document.querySelector(".xh-hud [data-k=replies] b")?.textContent) === n, repliesBefore + 1, { timeout: 5000 });

    // 3. Pause 1.6 s between identical sends (guard against < 1.5 s de-dupe)
    await page.waitForTimeout(1600);

    // 4. Open reply again and type the identical text
    await page.click("#fresh [data-testid=reply]");
    await page.fill(box, dupText);
    await page.waitForTimeout(600); // debounce timer is 400ms

    // 5. Warning does NOT appear because dupWarn is off
    assert.strictEqual(await page.$(".xh-dup:not([hidden])"), null);

    // 6. Send the duplicate anyway
    await page.click('[data-testid="tweetButton"]');
    await page.waitForFunction((n) => Number(document.querySelector(".xh-hud [data-k=replies] b")?.textContent) === n, repliesBefore + 2, { timeout: 5000 });

    // 7. Verify both sends are recorded in storage even with dupWarn off
    const sent = await storedSent();
    const count = sent.filter((x) => x.text === dupText).length;
    assert.strictEqual(count, 2, "both sends are recorded in storage");

    // 8. Pause 1.6 s before typing the next duplicate
    await page.waitForTimeout(1600);

    // 9. Turn dupWarn back on and verify the warning now appears for identical text
    await updateSettings({ dupWarn: true });
    await page.click("#fresh [data-testid=reply]");
    await page.fill(box, dupText);
    await page.waitForSelector(".xh-dup:not([hidden])", { timeout: 3000 });
    assert.match(await page.textContent(".xh-dup"), /similar to what you sent|sent/i);

    // 10. Clean up composer and restore settings
    await page.fill(box, "");
    await page.waitForSelector(".xh-dup[hidden]", { state: "attached", timeout: 2000 });
    await updateSettings({ dupWarn: true });
  });

  await step("follow times are stored and bounded", async () => {
    await clearPace();

    // 1. Confirmed follow stores timestamp in follows
    await page.evaluate(() => {
      fetch("/i/api/1.1/friendships/create.json", {
        method: "POST",
        body: new URLSearchParams({ screen_name: "bounded_f", user_id: "601" }),
      });
    });
    await page.waitForFunction(() => /Followed @bounded_f/.test(document.querySelector(".xh-toast")?.textContent), null, { timeout: 5000 });

    // 2. Confirmed unfollow stores timestamp in unfollows
    await page.evaluate(() => {
      fetch("/i/api/1.1/friendships/destroy.json", {
        method: "POST",
        body: new URLSearchParams({ screen_name: "bounded_f", user_id: "601" }),
      });
    });
    await page.waitForFunction(() => /Unfollowed @bounded_f/.test(document.querySelector(".xh-toast")?.textContent), null, { timeout: 5000 });

    const pace1 = await storedPart("pace");
    assert.strictEqual(pace1?.follows?.length, 1);
    assert.strictEqual(pace1?.unfollows?.length, 1);
    assert.ok(typeof pace1.follows[0] === "number");
    assert.ok(typeof pace1.unfollows[0] === "number");

    // 3. Stored times are bounded at 100 entries max. 105 recent times pass the pace, so turn
    // reminders off to get the ordinary toast; this step checks storage, not the reminder.
    await updateSettings({ followWarn: false });
    const now = Date.now();
    const overflowTimes = [];
    for (let i = 1; i <= 105; i++) overflowTimes.push(now - 1000 + i);
    await setStoredPart("pace", { follows: overflowTimes, unfollows: [] });

    await page.evaluate(() => {
      fetch("/i/api/1.1/friendships/create.json", {
        method: "POST",
        body: new URLSearchParams({ screen_name: "bounded_over", user_id: "602" }),
      });
    });
    await page.waitForFunction(() => /Followed @bounded_over/.test(document.querySelector(".xh-toast")?.textContent), null, { timeout: 5000 });

    const pace2 = await storedPart("pace");
    assert.strictEqual(pace2?.follows?.length, 100);

    // Restore defaults and clear pace
    await clearPace();
    await updateSettings({ followLimit: 20, unfollowLimit: 20, followPace: 10, unfollowPace: 10, paceMinutes: 60, followWarn: true });
  });

  await step("11th follow within the window shows the pace toast", async () => {
    await clearPace();
    // Daily followLimit high (50) so only pace triggers
    await updateSettings({ followLimit: 50, followPace: 10, paceMinutes: 60, followWarn: true });

    const followsBefore = Number(await page.textContent(".xh-hud [data-k=follows] b"));

    // Follow 10 accounts
    for (let i = 1; i <= 10; i++) {
      await page.evaluate((i) => {
        fetch("/i/api/1.1/friendships/create.json", {
          method: "POST",
          body: new URLSearchParams({ screen_name: `puser_${i}`, user_id: String(200 + i) }),
        });
      }, i);
    }
    await page.waitForFunction(
      (target) => Number(document.querySelector(".xh-hud [data-k=follows] b")?.textContent) === target,
      followsBefore + 10,
      { timeout: 5000 }
    );

    // 11th follow within 60 minutes triggers pace toast
    await page.evaluate(() => {
      fetch("/i/api/1.1/friendships/create.json", {
        method: "POST",
        body: new URLSearchParams({ screen_name: "puser_11", user_id: "211" }),
      });
    });
    await page.waitForFunction(
      () => /Over 10 follows in an hour/i.test(document.querySelector(".xh-toast")?.textContent),
      null,
      { timeout: 5000 }
    );
    assert.match(await page.textContent(".xh-toast"), /Over 10 follows in an hour\. Following fast can get the account limited\./);

    // Restore defaults and clear pace
    await clearPace();
    await updateSettings({ followLimit: 20, unfollowLimit: 20, followPace: 10, unfollowPace: 10, paceMinutes: 60, followWarn: true });
  });

  await step("daily limit toast wins over pace", async () => {
    await clearPace();
    const followsBefore = Number(await page.textContent(".xh-hud [data-k=follows] b"));

    // Set daily followLimit to followsBefore + 2, and followPace to 2
    await updateSettings({ followLimit: followsBefore + 2, followPace: 2, paceMinutes: 60, followWarn: true });

    // Follow 1
    await page.evaluate(() => {
      fetch("/i/api/1.1/friendships/create.json", {
        method: "POST",
        body: new URLSearchParams({ screen_name: "win_1", user_id: "301" }),
      });
    });
    await page.waitForFunction((n) => Number(document.querySelector(".xh-hud [data-k=follows] b")?.textContent) === n, followsBefore + 1, { timeout: 5000 });

    // Follow 2
    await page.evaluate(() => {
      fetch("/i/api/1.1/friendships/create.json", {
        method: "POST",
        body: new URLSearchParams({ screen_name: "win_2", user_id: "302" }),
      });
    });
    await page.waitForFunction((n) => Number(document.querySelector(".xh-hud [data-k=follows] b")?.textContent) === n, followsBefore + 2, { timeout: 5000 });

    // Follow 3 passes BOTH daily limit (followsBefore + 3 > followsBefore + 2) and pace (3 > 2)
    await page.evaluate(() => {
      fetch("/i/api/1.1/friendships/create.json", {
        method: "POST",
        body: new URLSearchParams({ screen_name: "win_3", user_id: "303" }),
      });
    });
    await page.waitForFunction((n) => Number(document.querySelector(".xh-hud [data-k=follows] b")?.textContent) === n, followsBefore + 3, { timeout: 5000 });

    // Toast priority: daily limit wins over pace
    await page.waitForFunction(() => /Over \d+ follows today/i.test(document.querySelector(".xh-toast")?.textContent), null, { timeout: 3000 });
    assert.match(await page.textContent(".xh-toast"), /Over \d+ follows today\. Following fast can get the account limited\./);
    assert.doesNotMatch(await page.textContent(".xh-toast"), /hour|minutes/i);

    // Restore defaults and clear pace
    await clearPace();
    await updateSettings({ followLimit: 20, unfollowLimit: 20, followPace: 10, unfollowPace: 10, paceMinutes: 60, followWarn: true });
  });

  await step("reminders off shows only the ordinary toast", async () => {
    await clearPace();
    // followWarn false: both daily limit and pace exceeded but reminders disabled
    await updateSettings({ followWarn: false, followLimit: 0, followPace: 0 });

    await page.evaluate(() => {
      fetch("/i/api/1.1/friendships/create.json", {
        method: "POST",
        body: new URLSearchParams({ screen_name: "nowarn_user", user_id: "401" }),
      });
    });
    await page.waitForFunction(() => /Followed @nowarn_user/.test(document.querySelector(".xh-toast")?.textContent), null, { timeout: 5000 });
    assert.doesNotMatch(await page.textContent(".xh-toast"), /today|hour|minutes|limited/i);

    // Restore defaults and clear pace
    await clearPace();
    await updateSettings({ followLimit: 20, unfollowLimit: 20, followPace: 10, unfollowPace: 10, paceMinutes: 60, followWarn: true });
  });

  await step("HUD follow count is warn when followWarn is on and the daily limit or the pace is passed", async () => {
    await clearPace();
    // Daily followLimit high so only pace determines warn
    await updateSettings({ followLimit: 99999, followPace: 1, paceMinutes: 60, followWarn: true });

    assert.notStrictEqual(await page.getAttribute(".xh-hud [data-k=follows]", "data-state"), "warn");

    // Follow 1: pace is 1 (<= 1), not warn
    await page.evaluate(() => {
      fetch("/i/api/1.1/friendships/create.json", {
        method: "POST",
        body: new URLSearchParams({ screen_name: "hud_u1", user_id: "501" }),
      });
    });
    await page.waitForFunction(() => /Followed @hud_u1/.test(document.querySelector(".xh-toast")?.textContent), null, { timeout: 5000 });
    assert.notStrictEqual(await page.getAttribute(".xh-hud [data-k=follows]", "data-state"), "warn");

    // Follow 2: pace is 2 (> 1), HUD turns orange (state="warn")
    await page.evaluate(() => {
      fetch("/i/api/1.1/friendships/create.json", {
        method: "POST",
        body: new URLSearchParams({ screen_name: "hud_u2", user_id: "502" }),
      });
    });
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=follows]")?.dataset.state === "warn", null, { timeout: 5000 });
    assert.strictEqual(await page.getAttribute(".xh-hud [data-k=follows]", "data-state"), "warn");

    // With followWarn off, orange state disappears
    await updateSettings({ followWarn: false });
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=follows]")?.dataset.state !== "warn", null, { timeout: 5000 });
    assert.strictEqual(await page.getAttribute(".xh-hud [data-k=follows]", "data-state"), null);

    // Restore defaults and clear pace
    await clearPace();
    await updateSettings({ followLimit: 20, unfollowLimit: 20, followPace: 10, unfollowPace: 10, paceMinutes: 60, followWarn: true });
  });

  await step("star adds and removes a key account on all of its posts", async () => {
    await setStoredPart("keys", {});
    await page.waitForSelector("#fresh .xh-star");
    await page.waitForSelector("#fresh2 .xh-star");

    // Both posts initially have unpressed star, no key chip, no target highlight
    assert.strictEqual(await page.getAttribute("#fresh .xh-star", "aria-pressed"), "false");
    assert.strictEqual(await page.getAttribute("#fresh2 .xh-star", "aria-pressed"), "false");
    assert.strictEqual(await page.$("#fresh .xh-chip.xh-key"), null);
    assert.strictEqual(await page.$("#fresh2 .xh-chip.xh-key"), null);
    assert.strictEqual(await page.$("#fresh.xh-target"), null);
    assert.strictEqual(await page.$("#fresh2.xh-target"), null);

    // Click star on fresh (alice)
    await page.click("#fresh .xh-star");
    await page.waitForSelector('#fresh .xh-star[aria-pressed="true"]', { timeout: 3000 });
    await page.waitForSelector('#fresh2 .xh-star[aria-pressed="true"]', { timeout: 3000 });

    // Both posts now show the highlight; the filled star is the only key marker
    assert.strictEqual(await page.$("#fresh .xh-chip.xh-key"), null);
    assert.strictEqual(await page.$("#fresh2 .xh-chip.xh-key"), null);
    assert.ok(await page.$("#fresh.xh-target"));
    assert.ok(await page.$("#fresh2.xh-target"));

    // Storage updated
    const k = await storedPart("keys");
    assert.ok(k && k.alice);
    assert.strictEqual(k.alice.h, "alice");

    // Click star on fresh2 to remove
    await page.click("#fresh2 .xh-star");
    await page.waitForSelector('#fresh .xh-star[aria-pressed="false"]', { timeout: 3000 });
    await page.waitForSelector('#fresh2 .xh-star[aria-pressed="false"]', { timeout: 3000 });

    assert.strictEqual(await page.$("#fresh .xh-chip.xh-key"), null);
    assert.strictEqual(await page.$("#fresh2 .xh-chip.xh-key"), null);
    assert.strictEqual(await page.$("#fresh.xh-target"), null);
    assert.strictEqual(await page.$("#fresh2.xh-target"), null);

    const kAfter = await storedPart("keys");
    assert.strictEqual(kAfter.alice, undefined);

    await setStoredPart("keys", {});
  });

  await step("clicking the star does not open the post or click anything on X", async () => {
    const urlBefore = page.url();
    assert.strictEqual(urlBefore, "https://x.com/home");

    // Track clicks that reach article
    await page.evaluate(() => {
      window.__articleClicks = 0;
      document.getElementById("old")?.addEventListener("click", () => {
        window.__articleClicks++;
      });
    });

    await page.click("#old .xh-star");
    await page.waitForSelector('#old .xh-star[aria-pressed="true"]', { timeout: 3000 });

    const articleClicks = await page.evaluate(() => window.__articleClicks);
    assert.strictEqual(articleClicks, 0, "star click must not reach X article click handler");
    assert.strictEqual(page.url(), urlBefore);

    // Unstar
    await page.click("#old .xh-star");
    await page.waitForSelector('#old .xh-star[aria-pressed="false"]', { timeout: 3000 });
    assert.strictEqual(page.url(), urlBefore);

    await setStoredPart("keys", {});
  });

  await step("a badge that doesn't fit in the name row moves above the post text, with nothing cut off", async () => {
    await page.waitForSelector("#narrow .xh-badge.xh-badge-row", { timeout: 5000 });
    const r = await page.evaluate(() => {
      const b = document.querySelector("#narrow .xh-badge");
      return {
        beforeText: b.nextElementSibling?.dataset.testid === "tweetText",
        inNameRow: !!b.closest('[data-testid="User-Name"]'),
        clipped: b.scrollWidth > b.clientWidth + 1,
        star: !!b.querySelector(".xh-star"),
      };
    });
    assert.deepStrictEqual(r, { beforeText: true, inNameRow: false, clipped: false, star: true });
    // Badges that fit stay in the name row.
    assert.ok(await page.$('#fresh [data-testid="User-Name"] .xh-badge'));
    assert.strictEqual(await page.$("#fresh .xh-badge-row"), null);
  });

  await step("a post with no text whose badge doesn't fit gets its own row below the name row", async () => {
    await page.waitForSelector("#narrow2 .xh-badge.xh-badge-row", { timeout: 5000 });
    const r = await page.evaluate(() => {
      const b = document.querySelector("#narrow2 .xh-badge");
      return {
        inNameRow: !!b.closest('[data-testid="User-Name"]'),
        afterName: b.previousElementSibling?.dataset.testid === "User-Name",
        clipped: b.scrollWidth > b.clientWidth + 1,
        star: !!b.querySelector(".xh-star"),
      };
    });
    assert.deepStrictEqual(r, { inNameRow: false, afterName: true, clipped: false, star: true });
  });

  await step("when X reuses a post's element for another post, the badge starts over and the star stars the new author", async () => {
    await setStoredPart("keys", {});
    await page.waitForSelector("#narrow .xh-badge.xh-badge-row", { timeout: 5000 });
    // Like X's virtual list: the same element now shows a post by alice, with room for the badge.
    await page.evaluate(() => {
      const a = document.querySelector("#narrow");
      a.style.width = "";
      const name = a.querySelector('[data-testid="User-Name"]');
      name.querySelector("a").setAttribute("href", "/alice");
      const link = document.createElement("a");
      link.href = "/alice/status/113";
      const time = document.createElement("time");
      time.setAttribute("datetime", new Date(Date.now() - 3600e3).toISOString());
      link.append(time);
      name.querySelector('a[href*="/status/"]').replaceWith(link);
    });
    await page.waitForFunction(() => {
      const b = document.querySelector("#narrow .xh-badge");
      return b && b.closest('[data-testid="User-Name"]') && !b.classList.contains("xh-badge-row");
    }, null, { timeout: 5000 });
    await page.click("#narrow .xh-star");
    const keys = await (async () => {
      for (let i = 0; i < 30; i++) {
        const k = await storedPart("keys");
        if (k && Object.keys(k).length) return k;
        await new Promise((r) => setTimeout(r, 100));
      }
      return {};
    })();
    assert.ok(keys.alice, "the star stars the post now shown");
    assert.strictEqual(keys.nina, undefined);
    await setStoredPart("keys", {});
  });

  await step("on a status page the focal post badge stays in its name row when it fits, like a reply", async () => {
    const p = await ctx.newPage();
    try {
      await p.goto("https://x.com/alice/status/111");
      await p.waitForSelector("#focal .xh-badge", { timeout: 5000 });
      await p.waitForSelector("#reply .xh-badge", { timeout: 5000 });

      const focal = await p.evaluate(() => {
        const b = document.querySelector("#focal .xh-badge");
        return {
          beforeText: b.nextElementSibling?.dataset.testid === "tweetText",
          inNameRow: !!b.closest('[data-testid="User-Name"]'),
          hasRowClass: b.classList.contains("xh-badge-row"),
        };
      });
      assert.deepStrictEqual(focal, { beforeText: false, inNameRow: true, hasRowClass: false });

      const reply = await p.evaluate(() => {
        const b = document.querySelector("#reply .xh-badge");
        return {
          inNameRow: !!b.closest('[data-testid="User-Name"]'),
          hasRowClass: b.classList.contains("xh-badge-row"),
        };
      });
      assert.deepStrictEqual(reply, { inNameRow: true, hasRowClass: false });
    } finally {
      await p.close();
    }
  });

  await step("own posts have no star", async () => {
    assert.strictEqual(await page.$("#mine .xh-star"), null);
  });

  await step("key accounts switch hides star and highlight", async () => {
    await setStoredPart("keys", { alice: { h: "alice", t: Date.now() } });
    await page.waitForSelector('#fresh .xh-star[aria-pressed="true"]', { timeout: 3000 });
    assert.strictEqual(await page.$("#fresh .xh-chip.xh-key"), null);
    assert.ok(await page.$("#fresh.xh-target"));

    // Turn feature off
    await updateSettings({ keyAccounts: false });
    await page.waitForFunction(
      () => !document.querySelector("#fresh .xh-star") && !document.querySelector("#fresh .xh-chip.xh-key") && !document.querySelector("#fresh.xh-target"),
      null,
      { timeout: 5000 }
    );
    assert.strictEqual(await page.$("#old .xh-star"), null);

    // Turn feature back on
    await updateSettings({ keyAccounts: true });
    await page.waitForSelector('#fresh .xh-star[aria-pressed="true"]', { timeout: 5000 });
    assert.strictEqual(await page.$("#fresh .xh-chip.xh-key"), null);
    assert.ok(await page.$("#fresh.xh-target"));

    await setStoredPart("keys", {});
  });

  await step("Alt+S toggles the selected post's author", async () => {
    await setStoredPart("keys", {});
    await page.focus("#old");
    await page.keyboard.press("Alt+KeyS");
    await page.waitForFunction(
      () => /Added @bob to key accounts|已将 @bob 设为重点账号/.test(document.querySelector(".xh-toast")?.textContent || ""),
      null,
      { timeout: 3000 }
    );

    let k = await storedPart("keys");
    assert.ok(k && k.bob);
    await page.waitForSelector('#old .xh-star[aria-pressed="true"]', { timeout: 3000 });

    // Press Alt+S again to remove
    await page.keyboard.press("Alt+KeyS");
    await page.waitForFunction(
      () => /Removed @bob from key accounts|已将 @bob 移出重点账号/.test(document.querySelector(".xh-toast")?.textContent || ""),
      null,
      { timeout: 3000 }
    );

    k = await storedPart("keys");
    assert.strictEqual(k.bob, undefined);
    await page.waitForSelector('#old .xh-star[aria-pressed="false"]', { timeout: 3000 });

    // Alt+S does nothing while typing in composer
    const boxSel = '[data-testid="tweetTextarea_0"]';
    await page.click(boxSel);
    await page.keyboard.press("Alt+KeyS");
    await page.waitForTimeout(500);
    k = await storedPart("keys");
    assert.strictEqual(k.bob, undefined);

    await setStoredPart("keys", {});
  });

  await step("key accounts panel sorts by silence and marks quiet accounts", async () => {
    const now = Date.now();
    const dayMs = 86400000;
    // Seed people and keys data with storage helpers. Test handles at most 15 chars.
    await setStoredPart("people", {
      carol: { likes: 1, replies: 0, last: now - 20 * dayMs, in: { likes: 1, replies: 0, quotes: 0, mentions: 0, last: now - 16 * dayMs } },
      dan: { likes: 0, replies: 0, last: 0 },
      dave: { likes: 0, replies: 0, last: 0, in: { likes: 0, replies: 1, quotes: 0, mentions: 0, last: now - 1 * dayMs } },
    });
    await setStoredPart("keys", {
      carol: { h: "carol", t: now - 50 * dayMs },
      dan: { h: "dan", t: now - 40 * dayMs },
      dave: { h: "dave", t: now - 30 * dayMs },
    });

    await page.keyboard.press("Alt+KeyK");
    await page.waitForSelector(".xh-panel:not([hidden])", { timeout: 3000 });

    // Header shows quiet count (2 of 3 are quiet: dan never, carol 16d ago)
    assert.match(await page.textContent(".xh-panel-head"), /2 quiet|2 个沉寂/);

    // Sorted by silence ascending: dan (never), carol (16d), dave (1d)
    const handles = await page.$$eval(".xh-panel-list .xh-panel-handle", (els) => els.map((el) => el.textContent.trim()));
    assert.deepStrictEqual(handles, ["@dan", "@carol", "@dave"]);

    // Quiet marks on dan and carol, not on dave
    assert.ok(await page.$('.xh-panel-list a[href="/dan"] .xh-quiet-mark'));
    assert.ok(await page.$('.xh-panel-list a[href="/carol"] .xh-quiet-mark'));
    assert.strictEqual(await page.$('.xh-panel-list a[href="/dave"] .xh-quiet-mark'), null);

    // Both directions' last interaction via XH.ago
    const carolMeta = await page.$eval('.xh-panel-list a[href="/carol"] .xh-panel-meta', (el) => el.textContent);
    assert.match(carolMeta, /you:.*20 d ago.*them:.*16 d ago|我：.*20天前.*他：.*16天前/);
    const danMeta = await page.$eval('.xh-panel-list a[href="/dan"] .xh-panel-meta', (el) => el.textContent);
    assert.match(danMeta, /you:.*never.*them:.*never|我：.*无.*他：.*无/);

    // Empty hint
    await setStoredPart("keys", {});
    await page.waitForFunction(
      () => /No key accounts yet|还没有重点账号/.test(document.querySelector(".xh-panel-list")?.textContent || ""),
      null,
      { timeout: 3000 }
    );

    // Press Alt+K again to close
    await page.keyboard.press("Alt+KeyK");
    await page.waitForSelector(".xh-panel[hidden]", { state: "attached", timeout: 2000 });

    // Clean up
    await setStoredPart("keys", {});
    await setStoredPart("people", {});
  });

  await step("settings page shows switches and saves them", async () => {
    const p = await ctx.newPage();
    try {
      await p.goto(`chrome-extension://${extId}/src/options/options.html`);
      await p.waitForSelector("section");

      // 1. Verify the features section heading
      const featuresTitle = await p.textContent("section:nth-of-type(2) h2");
      assert.match(featuresTitle, /Features/);

      // 2. Verify all switches are present in the features section
      for (const id of ["showAge", "showHeat", "showSeen", "showInbound", "showReplies", "showReplied", "showRel", "dupWarn", "followWarn", "hud", "keyAccounts", "topPosts", "localNotes"]) {
        assert.ok(await p.$(`section:nth-of-type(2) #${id}`), `switch #${id} should be in features section`);
      }

      // 3. Verify dependent switches disable/enable based on parent
      assert.strictEqual(await p.isChecked("#showAge"), true);
      assert.strictEqual(await p.isDisabled("#showHeat"), false);
      await p.uncheck("#showAge");
      assert.strictEqual(await p.isDisabled("#showHeat"), true);
      await p.check("#showAge");
      assert.strictEqual(await p.isDisabled("#showHeat"), false);

      assert.strictEqual(await p.isChecked("#showSeen"), true);
      assert.strictEqual(await p.isDisabled("#showInbound"), false);
      await p.uncheck("#showSeen");
      assert.strictEqual(await p.isDisabled("#showInbound"), true);
      await p.check("#showSeen");
      assert.strictEqual(await p.isDisabled("#showInbound"), false);

      // 4. Change switches and pace numbers, then save
      await p.uncheck("#showAge");
      await p.uncheck("#showSeen");
      await p.uncheck("#dupWarn");
      await p.uncheck("#followWarn");
      await p.uncheck("#keyAccounts");
      await p.fill("#followPace", "15");
      await p.fill("#unfollowPace", "25");
      await p.fill("#paceMinutes", "45");

      await p.click("#save");
      await p.waitForFunction(() => document.getElementById("status")?.textContent.includes("Saved"), null, { timeout: 3000 });

      // 5. Verify saved settings in storage via storedPart
      const s = await storedPart("settings");
      assert.strictEqual(s.showAge, false);
      assert.strictEqual(s.showSeen, false);
      assert.strictEqual(s.dupWarn, false);
      assert.strictEqual(s.followWarn, false);
      assert.strictEqual(s.keyAccounts, false);
      assert.strictEqual(s.followPace, 15);
      assert.strictEqual(s.unfollowPace, 25);
      assert.strictEqual(s.paceMinutes, 45);

      // 6. Restore default settings
      await updateSettings({
        showAge: true,
        showSeen: true,
        dupWarn: true,
        followWarn: true,
        keyAccounts: true,
        followPace: 10,
        unfollowPace: 10,
        paceMinutes: 60,
      });
    } finally {
      await p.close();
    }
  });

  await step("switching language in storage turns x.com badges and stats bar to the other language without reload", async () => {
    const p = await ctx.newPage();
    try {
      await p.goto("https://x.com/home");
      await p.waitForSelector(".xh-hud");
      await p.waitForSelector(".xh-chip");

      // Initially browser is en-US and lang is auto -> English HUD and badges
      const initialHudText = await p.textContent(".xh-hud [data-k=time] .xh-hud-label");
      assert.strictEqual(initialHudText, "on X");

      // Switch language to zh in storage via updateSettings
      await updateSettings({ lang: "zh" });

      // Verify stats bar and badge switched to Chinese without reloading the page
      await p.waitForFunction(
        () => document.querySelector(".xh-hud [data-k=time] .xh-hud-label")?.textContent === "在线",
        null,
        { timeout: 5000 }
      );
      assert.strictEqual(await p.textContent(".xh-hud [data-k=likes] .xh-hud-label"), "赞");
      await p.waitForFunction(() => /→ 我关注/.test(document.querySelector("#carol .xh-badge")?.textContent), null, { timeout: 5000 });

      // Switch language back to en
      await updateSettings({ lang: "en" });
      await p.waitForFunction(
        () => document.querySelector(".xh-hud [data-k=time] .xh-hud-label")?.textContent === "on X",
        null,
        { timeout: 5000 }
      );
      assert.strictEqual(await p.textContent(".xh-hud [data-k=likes] .xh-hud-label"), "likes");
      await p.waitForFunction(() => /→ you follow/.test(document.querySelector("#carol .xh-badge")?.textContent), null, { timeout: 5000 });
    } finally {
      await updateSettings({ lang: "auto" });
      await p.close();
    }
  });

  await step("settings page in English shows no Chinese apart from the 中文 option", async () => {
    const p = await ctx.newPage();
    try {
      await updateSettings({ lang: "en" });
      await p.goto(`chrome-extension://${extId}/src/options/options.html`);
      await p.waitForSelector("section");

      const htmlLang = await p.getAttribute("html", "lang");
      assert.strictEqual(htmlLang, "en");

      const textWithoutZhOption = await p.evaluate(() => {
        const clone = document.body.cloneNode(true);
        const zhOpt = clone.querySelector('#lang option[value="zh"]');
        if (zhOpt) zhOpt.remove();
        return clone.innerText;
      });

      const cjkMatch = textWithoutZhOption.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
      assert.strictEqual(cjkMatch, null, `Expected no Chinese characters but found: ${cjkMatch?.join(", ")}`);
    } finally {
      await updateSettings({ lang: "auto" });
      await p.close();
    }
  });

  await step("settings page in Chinese shows no 'English / 中文' pairs", async () => {
    const p = await ctx.newPage();
    try {
      await updateSettings({ lang: "zh" });
      await p.goto(`chrome-extension://${extId}/src/options/options.html`);
      await p.waitForSelector("section");

      const htmlLang = await p.getAttribute("html", "lang");
      assert.strictEqual(htmlLang, "zh-CN");

      const text = await p.evaluate(() => document.body.innerText);
      assert.ok(!/ \/ /.test(text), `Expected no 'English / 中文' pairs in Chinese settings page`);
    } finally {
      await updateSettings({ lang: "auto" });
      await p.close();
    }
  });

  await step("picking a language saves at once and keeps unsaved fields", async () => {
    const p = await ctx.newPage();
    try {
      await p.goto(`chrome-extension://${extId}/src/options/options.html`);
      await p.waitForSelector("#lang");

      // Type unsaved inputs
      await p.fill("#keyPaste", "test_unsaved_handle");
      await p.fill("#dailyReplyGoal", "42");

      // Pick Chinese in language select
      await p.selectOption("#lang", "zh");

      // Verify that lang was saved immediately to storage via storedPart
      await p.waitForFunction(async () => {
        const s = (await chrome.storage.local.get("xh:settings"))["xh:settings"];
        return s && s.lang === "zh";
      }, null, { timeout: 3000 });

      const savedSettings = await storedPart("settings");
      assert.strictEqual(savedSettings.lang, "zh");
      assert.notStrictEqual(savedSettings.dailyReplyGoal, 42);

      // Verify that the page re-rendered into Chinese
      assert.strictEqual(await p.textContent("section:nth-of-type(2) h2"), "功能开关");

      // Verify that the unsaved form fields are still kept
      assert.strictEqual(await p.inputValue("#keyPaste"), "test_unsaved_handle");
      assert.strictEqual(await p.inputValue("#dailyReplyGoal"), "42");
    } finally {
      await updateSettings({ lang: "auto" });
      await p.close();
    }
  });

  await step("popup follows the chosen language", async () => {
    const p = await ctx.newPage();
    try {
      // 1. In Chinese
      await updateSettings({ lang: "zh" });
      await p.goto(`chrome-extension://${extId}/src/popup/popup.html`);
      await p.waitForSelector("#head th");

      const thTextsZh = await p.$$eval("#head th", (ths) => ths.map((th) => th.textContent.trim()));
      assert.deepStrictEqual(thTextsZh, ["日期", "赞", "回复", "发帖", "关注", "取关", "在线"]);
      assert.strictEqual(await p.textContent("#keys"), "重点账号 (Alt+K)");
      assert.strictEqual(await p.textContent("#nfb"), "我关注了、没回关我的 (Alt+U)");
      assert.match(await p.textContent("[data-i18n=pop_data]"), /数据只存在本浏览器/);

      // 2. In English
      await updateSettings({ lang: "en" });
      await p.reload();
      await p.waitForSelector("#head th");

      const thTextsEn = await p.$$eval("#head th", (ths) => ths.map((th) => th.textContent.trim()));
      assert.deepStrictEqual(thTextsEn, ["Day", "likes", "replies", "posts", "follows", "unfollows", "on X"]);
      assert.strictEqual(await p.textContent("#keys"), "Key accounts (Alt+K)");
      assert.strictEqual(await p.textContent("#nfb"), "Not following you back (Alt+U)");
      assert.match(await p.textContent("[data-i18n=pop_data]"), /Data stays in this browser/);
    } finally {
      await updateSettings({ lang: "auto" });
      await p.close();
    }
  });

  await step("settings page adds pasted key accounts and reports skipped lines", async () => {
    await setStoredPart("keys", {});
    const p = await ctx.newPage();
    try {
      await p.goto(`chrome-extension://${extId}/src/options/options.html`);
      await p.waitForSelector("#keyPaste");

      // Paste handles: @alice, bob, not a handle!
      await p.fill("#keyPaste", "@alice\nbob\nnot a handle!");
      await p.click("#keyAddBtn");

      // Report says one line was skipped
      await p.waitForFunction(
        () => /1 line skipped|已跳过 1 行/.test(document.getElementById("keyAddReport")?.textContent || ""),
        null,
        { timeout: 3000 }
      );
      assert.match(await p.textContent("#keyAddReport"), /1.*skip|跳过.*1/i);

      // Verify keys in storage
      const keys = await storedPart("keys");
      assert.ok(keys && keys.alice);
      assert.ok(keys && keys.bob);
      assert.strictEqual(keys["not a handle!"], undefined);

      // Verify list on page shows rows for @alice and @bob
      await p.waitForSelector('.key-row[data-handle="alice"]');
      await p.waitForSelector('.key-row[data-handle="bob"]');
    } finally {
      await setStoredPart("keys", {});
      await p.close();
    }
  });

  await step("removing a key account from settings takes effect at once", async () => {
    await setStoredPart("keys", {
      alice: { h: "alice", t: Date.now() },
      bob: { h: "bob", t: Date.now() },
    });
    const p = await ctx.newPage();
    try {
      await p.goto(`chrome-extension://${extId}/src/options/options.html`);
      await p.waitForSelector('.key-row[data-handle="alice"] button.remove');

      // Click remove on alice's row without clicking Save
      await p.click('.key-row[data-handle="alice"] button.remove');

      // Verify alice is removed from storage at once
      await p.waitForFunction(async () => {
        const k = (await chrome.storage.local.get("xh:keys"))["xh:keys"] || {};
        return !k.alice;
      }, null, { timeout: 3000 });

      const keys = await storedPart("keys");
      assert.strictEqual(keys.alice, undefined);
      assert.ok(keys.bob);

      // Verify alice row is removed from DOM while bob remains
      assert.strictEqual(await p.$('.key-row[data-handle="alice"]'), null);
      assert.ok(await p.$('.key-row[data-handle="bob"]'));
    } finally {
      await setStoredPart("keys", {});
      await p.close();
    }
  });
  await step("import is a labelled button and asks before replacing data", async () => {
    await updateSettings({ lang: "zh" });
    await setStoredPart("keys", { alice: { h: "alice", t: Date.now() } });
    const file = { name: "xhandy.json", mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ keys: { carol: { h: "carol", t: Date.now() } } })) };
    const p = await ctx.newPage();
    try {
      await p.goto(`chrome-extension://${extId}/src/options/options.html`);
      await p.waitForFunction(() => document.getElementById("import-btn").textContent === "导入 JSON");
      assert.ok(await p.$eval("#import", (el) => el.hidden), "native file input is hidden");

      let asked = 0;
      p.once("dialog", (d) => { asked++; d.dismiss(); });
      await p.setInputFiles("#import", file);
      await p.waitForTimeout(300);
      assert.strictEqual(asked, 1, "cancel dialog shown");
      assert.ok((await storedPart("keys")).alice, "cancel keeps current data");

      p.once("dialog", (d) => { asked++; d.accept(); });
      await p.setInputFiles("#import", file);
      await p.waitForFunction(async () => {
        const k = (await chrome.storage.local.get("xh:keys"))["xh:keys"] || {};
        return k.carol && !k.alice;
      }, null, { timeout: 3000 });
      assert.strictEqual(asked, 2);
    } finally {
      await setStoredPart("keys", {});
      await updateSettings({ lang: "auto" });
      await p.close();
    }
  });

  await step("profile shows one top posts button", async () => {
    await page.goto("https://x.com/eve");
    await page.waitForSelector("button.xh-top", { timeout: 5000 });
    const count = await page.$$eval("button.xh-top", (els) => els.length);
    assert.strictEqual(count, 1);
    const label = await page.$eval("button.xh-top", (el) => el.getAttribute("aria-label"));
    assert.match(label, /eve/i);
    const text = await page.$eval("button.xh-top", (el) => el.textContent);
    assert.match(text, /Top posts|高赞帖/);
  });

  await step("clicking top posts navigates to search in current tab and clicks nothing on X", async () => {
    await page.waitForSelector("button.xh-top");
    await Promise.all([
      page.waitForURL((url) => /from%3Aeve/.test(url.href || String(url))),
      page.click("button.xh-top"),
    ]);
    const url = page.url();
    assert.match(url, /from%3Aeve/);
    assert.match(url, /min_faves%3A/);
    assert.match(url, /f=top/);
    await page.goBack();
    await page.waitForSelector("button.xh-top", { timeout: 5000 });
    assert.strictEqual(page.url(), "https://x.com/eve");
    const followLabel = await page.$eval('[data-testid$="-unfollow"], [data-testid$="-follow"]', (el) => el.getAttribute("aria-label"));
    assert.ok(followLabel);
    assert.match(followLabel, /Follow @eve/);
  });

  await step("own profile has no top posts button", async () => {
    await page.goto("https://x.com/me_test");
    await page.waitForSelector('[data-testid="UserName"]', { timeout: 5000 });
    await page.waitForTimeout(400);
    const topBtn = await page.$("button.xh-top");
    assert.strictEqual(topBtn, null);
  });

  await step("Alt+B opens top posts for the selected post's author", async () => {
    await page.goto("https://x.com/home");
    await page.waitForSelector("#fresh .xh-badge", { timeout: 5000 });
    await page.focus("#fresh");
    await Promise.all([
      page.waitForURL((url) => /from%3Aalice/.test(url.href || String(url))),
      page.keyboard.press("Alt+KeyB"),
    ]);
    const url = page.url();
    assert.match(url, /from%3Aalice/);
    assert.match(url, /min_faves%3A/);
    assert.match(url, /f=top/);
    await page.goBack();
    await page.waitForSelector("#fresh .xh-badge", { timeout: 5000 });
  });

  await step("Alt+B with nothing selected shows a toast", async () => {
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press("Alt+KeyB");
    await page.waitForFunction(
      () => /Select a post|选中一条帖子/.test(document.querySelector(".xh-toast")?.textContent || ""),
      null,
      { timeout: 3000 }
    );
  });

  await step("top posts switch off hides the button", async () => {
    await page.goto("https://x.com/eve");
    await page.waitForSelector("button.xh-top", { timeout: 5000 });
    await updateSettings({ topPosts: false });
    await page.waitForFunction(() => !document.querySelector("button.xh-top"), null, { timeout: 3000 });
    const currentUrl = page.url();
    await page.keyboard.press("Alt+KeyB");
    await page.waitForTimeout(500);
    assert.strictEqual(page.url(), currentUrl);
    await updateSettings({ topPosts: true });
    await page.waitForSelector("button.xh-top", { timeout: 5000 });
  });

  await step("typing in the note editor does not trigger X shortcuts", async () => {
    await page.goto("https://x.com/home");
    await page.waitForSelector("#fresh .xh-badge", { timeout: 5000 });
    await page.focus("#fresh");
    const likesBefore = await page.$eval(".xh-hud-likes", (el) => el.textContent).catch(() => "0");
    await page.keyboard.press("Alt+KeyN");
    await page.waitForSelector("div.xh-note", { timeout: 3000 });
    // Type j and l inside the textarea
    await page.type("textarea.xh-note-text", "jl");
    const textVal = await page.$eval("textarea.xh-note-text", (el) => el.value);
    assert.strictEqual(textVal, "jl");
    // Selection still on fresh, like count unchanged
    const isInsideEditor = await page.evaluate(
      () =>
        document.activeElement &&
        (document.activeElement.classList.contains("xh-note-text") ||
          document.activeElement.closest("article")?.id === "fresh")
    );
    assert.ok(isInsideEditor);
    const likesAfter = await page.$eval(".xh-hud-likes", (el) => el.textContent).catch(() => "0");
    assert.strictEqual(likesAfter, likesBefore);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("div.xh-note"), null, { timeout: 3000 });
  });

  await step("editor saves status, tags and text", async () => {
    await page.goto("https://x.com/home");
    await page.waitForSelector("#fresh .xh-badge", { timeout: 5000 });
    await page.focus("#fresh");
    await page.keyboard.press("Alt+KeyN");
    await page.waitForSelector("div.xh-note", { timeout: 3000 });
    // Pick status 'reach'
    await page.click('button.xh-note-status[data-s="reach"]');
    // Add tag 'design'
    await page.fill("input.xh-note-tag", "design");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".xh-note-tag-chip", { timeout: 3000 });
    // Fill text
    await page.fill("textarea.xh-note-text", "Met at conference");
    // Click Save
    await page.click("button.xh-note-save");
    await page.waitForFunction(() => !document.querySelector("div.xh-note"), null, { timeout: 3000 });
    // Verify in storage
    const notes = await storedPart("notes");
    assert.ok(notes && notes.alice);
    assert.strictEqual(notes.alice.s, "reach");
    assert.deepStrictEqual(notes.alice.tags, ["design"]);
    assert.strictEqual(notes.alice.text, "Met at conference");
  });

  await step("profile note button opens the editor", async () => {
    await page.goto("https://x.com/eve");
    await page.waitForSelector("button.xh-note-btn", { timeout: 5000 });
    const text = await page.$eval("button.xh-note-btn", (el) => el.textContent);
    assert.match(text, /Note|备注/);
    await page.click("button.xh-note-btn");
    await page.waitForSelector("div.xh-note", { timeout: 3000 });
    const user = await page.$eval("div.xh-note-user", (el) => el.textContent);
    assert.match(user, /@eve/i);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("div.xh-note"), null, { timeout: 3000 });
  });

  await step("Alt+N opens the editor for the selected post's author", async () => {
    await page.goto("https://x.com/home");
    await page.waitForSelector("#fresh .xh-badge", { timeout: 5000 });
    await page.focus("#fresh");
    await page.keyboard.press("Alt+KeyN");
    await page.waitForSelector("div.xh-note", { timeout: 3000 });
    const user = await page.$eval("div.xh-note-user", (el) => el.textContent);
    assert.match(user, /@alice/i);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("div.xh-note"), null, { timeout: 3000 });
  });

  await step("own profile has no note button", async () => {
    await page.goto("https://x.com/me_test");
    await page.waitForSelector('[data-testid="UserName"]', { timeout: 5000 });
    await page.waitForTimeout(400);
    const noteBtn = await page.$("button.xh-note-btn");
    assert.strictEqual(noteBtn, null);
  });

  await step("note chip appears on all of the account's posts and updates after editing", async () => {
    await page.goto("https://x.com/home");
    await page.waitForSelector("#fresh .xh-badge .xh-note", { timeout: 5000 });
    const chipText = await page.$eval("#fresh .xh-badge .xh-note", (el) => el.textContent);
    assert.match(chipText, /To reach out|待破冰/);
    const title = await page.$eval("#fresh .xh-badge .xh-note", (el) => el.getAttribute("title"));
    assert.strictEqual(title, "Met at conference");

    // Edit note via Alt+N and verify chip updates
    await page.focus("#fresh");
    await page.keyboard.press("Alt+KeyN");
    await page.waitForSelector("div.xh-note", { timeout: 3000 });
    await page.fill("textarea.xh-note-text", "Updated conference note");
    await page.click("button.xh-note-save");
    await page.waitForFunction(() => !document.querySelector("div.xh-note"), null, { timeout: 3000 });

    await page.waitForFunction(
      () => document.querySelector("#fresh .xh-badge .xh-note")?.getAttribute("title") === "Updated conference note",
      null,
      { timeout: 3000 }
    );
  });

  await step("a relation with a known id moves the note to the new handle", async () => {
    const existing = (await storedPart("notes")) || {};
    await setStoredPart("notes", {
      ...existing,
      old_user: { h: "old_user", id: "777888", s: "work", text: "Important partner", t: 100, u: 100 },
    });
    await page.goto("https://x.com/home");
    await page.waitForSelector("#fresh .xh-badge", { timeout: 5000 });
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("xh-relations", {
          detail: JSON.stringify({
            u: [{ handle: "new_user", id: "777888", name: "New User", following: true, followedBy: false }],
            v: [],
            f: [],
            c: [],
            n: [],
            at: Date.now(),
          }),
        })
      );
    });
    await page.waitForTimeout(1400); // Wait for debounce and storage write
    const notes = await storedPart("notes");
    assert.strictEqual(notes.old_user, undefined);
    assert.ok(notes.new_user);
    assert.strictEqual(notes.new_user.s, "work");
    assert.strictEqual(notes.new_user.text, "Important partner");
  });

  await step("notes switch off hides notes and keeps them", async () => {
    await page.goto("https://x.com/eve");
    await page.waitForSelector("button.xh-note-btn", { timeout: 5000 });
    await updateSettings({ localNotes: false });
    await page.waitForFunction(() => !document.querySelector("button.xh-note-btn"), null, { timeout: 3000 });

    await page.goto("https://x.com/home");
    await page.waitForSelector("#fresh .xh-badge", { timeout: 5000 });
    const noteChips = await page.$$("#fresh .xh-badge .xh-note");
    assert.strictEqual(noteChips.length, 0);

    await page.focus("#fresh");
    await page.keyboard.press("Alt+KeyN");
    await page.waitForTimeout(500);
    const pop = await page.$("div.xh-note");
    assert.strictEqual(pop, null);

    // Stored notes still exist
    const notes = await storedPart("notes");
    assert.ok(notes && notes.alice);

    // Restore setting
    await updateSettings({ localNotes: true });
    await page.goto("https://x.com/eve");
    await page.waitForSelector("button.xh-note-btn", { timeout: 5000 });
  });

  await step("settings lists notes and filters by status", async () => {
    await setStoredPart("notes", {
      alice: { h: "Alice", s: "reach", tags: ["design", "ui"], text: "Met at meetup", t: 1000, u: 1000 },
      bob: { h: "Bob", s: "touch", tags: ["podcast"], text: "Emailed yesterday", t: 2000, u: 2000 },
      charlie: { h: "Charlie", s: "work", tags: ["client", "sponsor"], text: "Ongoing project contract", t: 3000, u: 3000 },
    });
    const p = await ctx.newPage();
    try {
      await p.goto(`chrome-extension://${extId}/src/options/options.html`);
      await p.waitForSelector("#noteList .key-row", { timeout: 5000 });
      const initialCount = await p.$$eval("#noteList .key-row", (els) => els.length);
      assert.strictEqual(initialCount, 3);

      // Filter by 'work'
      await p.selectOption("#noteFilter", "work");
      await p.waitForFunction(() => document.querySelectorAll("#noteList .key-row").length === 1, null, { timeout: 3000 });
      const workText = await p.$eval("#noteList .key-row", (el) => el.textContent);
      assert.match(workText, /Charlie/);

      // Reset filter and search by tag 'podcast'
      await p.selectOption("#noteFilter", "");
      await p.waitForFunction(() => document.querySelectorAll("#noteList .key-row").length === 3, null, { timeout: 3000 });
      await p.fill("#noteSearch", "podcast");
      await p.waitForFunction(() => document.querySelectorAll("#noteList .key-row").length === 1, null, { timeout: 3000 });
      const searchPodText = await p.$eval("#noteList .key-row", (el) => el.textContent);
      assert.match(searchPodText, /Bob/);
    } finally {
      await p.close();
    }
  });

  await step("deleting a note in settings removes its chip on x.com", async () => {
    const p = await ctx.newPage();
    try {
      await p.goto(`chrome-extension://${extId}/src/options/options.html`);
      await p.waitForSelector('#noteList .key-row[data-handle="alice"]', { timeout: 5000 });
      await p.click('#noteList .key-row[data-handle="alice"] button.remove');
      await p.waitForFunction(() => !document.querySelector('#noteList .key-row[data-handle="alice"]'), null, { timeout: 3000 });
    } finally {
      await p.close();
    }

    // Check on x.com timeline that alice's chip is removed
    await page.goto("https://x.com/home");
    await page.waitForSelector("#fresh .xh-badge", { timeout: 5000 });
    const chips = await page.$$("#fresh .xh-badge .xh-note");
    assert.strictEqual(chips.length, 0);
  });

  await step("default stats bar is in bottom-right corner and clear of composer", async () => {
    await page.waitForSelector(".xh-hud:not([hidden])", { timeout: 5000 });
    const hudBox = await page.locator(".xh-hud").boundingBox();
    const composerBox = await page.locator("#composer").boundingBox();
    const vp = page.viewportSize();
    assert.ok(hudBox, "stats bar bounding box must exist");
    assert.ok(composerBox, "composer bounding box must exist");

    // Bottom-right corner: right and bottom distances within ~4px of 16px default
    const rightDist = vp.width - (hudBox.x + hudBox.width);
    const bottomDist = vp.height - (hudBox.y + hudBox.height);
    assert.ok(Math.abs(rightDist - 16) <= 4, `expected right ~16px, got ${rightDist}`);
    assert.ok(Math.abs(bottomDist - 16) <= 4, `expected bottom ~16px, got ${bottomDist}`);

    // Must not overlap composer
    const overlaps =
      hudBox.x < composerBox.x + composerBox.width &&
      hudBox.x + hudBox.width > composerBox.x &&
      hudBox.y < composerBox.y + composerBox.height &&
      hudBox.y + hudBox.height > composerBox.y;
    assert.strictEqual(overlaps, false, "stats bar must not overlap composer");
  });

  await step("short click on stats bar does not drag or update settings", async () => {
    const hudBoxBefore = await page.locator(".xh-hud").boundingBox();
    const settingsBefore = await storedPart("settings");
    const clickX = hudBoxBefore.x + hudBoxBefore.width / 2;
    const clickY = hudBoxBefore.y + hudBoxBefore.height / 2;

    await page.mouse.move(clickX, clickY);
    await page.mouse.down();
    await page.mouse.move(clickX + 1, clickY + 1); // 1.4px movement, under 4px threshold
    await page.mouse.up();

    const hudBoxAfter = await page.locator(".xh-hud").boundingBox();
    assert.strictEqual(hudBoxAfter.x, hudBoxBefore.x, "HUD x should not have moved");
    assert.strictEqual(hudBoxAfter.y, hudBoxBefore.y, "HUD y should not have moved");

    const settingsAfter = await storedPart("settings");
    assert.strictEqual(settingsAfter.hudRight, settingsBefore.hudRight, "hudRight should not change on short click");
    assert.strictEqual(settingsAfter.hudBottom, settingsBefore.hudBottom, "hudBottom should not change on short click");
  });

  await step("dragging stats bar moves it, writes position to storage and survives reload", async () => {
    const hudBox = await page.locator(".xh-hud").boundingBox();
    const startX = hudBox.x + hudBox.width / 2;
    const startY = hudBox.y + hudBox.height / 2;

    // Drag towards top-left: target (80, 80)
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(80, 80, { steps: 5 });
    await page.mouse.up();

    // Verify position moved to top-left area
    await page.waitForFunction(() => {
      const el = document.querySelector(".xh-hud");
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.left <= 40 && r.top <= 120;
    }, null, { timeout: 3000 });

    const movedBox = await page.locator(".xh-hud").boundingBox();
    assert.ok(movedBox.x <= 40, `expected HUD near left edge, got x=${movedBox.x}`);
    assert.ok(movedBox.y <= 120, `expected HUD near top, got y=${movedBox.y}`);

    // Verify stored settings written once
    const settings = await storedPart("settings");
    assert.ok(typeof settings.hudRight === "number" && settings.hudRight > 500, `hudRight should be large, got ${settings.hudRight}`);
    assert.ok(typeof settings.hudBottom === "number" && settings.hudBottom > 400, `hudBottom should be large, got ${settings.hudBottom}`);

    // Verify position survives reload
    await page.reload();
    await page.waitForSelector(".xh-hud:not([hidden])", { timeout: 5000 });
    const reloadedBox = await page.locator(".xh-hud").boundingBox();
    assert.ok(Math.abs(reloadedBox.x - movedBox.x) <= 2, `reloaded x=${reloadedBox.x} should match moved x=${movedBox.x}`);
    assert.ok(Math.abs(reloadedBox.y - movedBox.y) <= 2, `reloaded y=${reloadedBox.y} should match moved y=${movedBox.y}`);
  });

  await step("stats bar stays clamped inside window on resize without overwriting stored position", async () => {
    const storedBefore = await storedPart("settings");
    // Make window narrow
    await page.setViewportSize({ width: 500, height: 600 });
    await page.waitForTimeout(300);

    const clampedBox = await page.locator(".xh-hud").boundingBox();
    assert.ok(clampedBox.x >= 8, `HUD left edge ${clampedBox.x} should be >= 8`);
    assert.ok(clampedBox.x + clampedBox.width <= 500, `HUD right edge should be inside viewport`);

    // Stored settings must NOT have been changed by resize clamping
    const storedAfter = await storedPart("settings");
    assert.strictEqual(storedAfter.hudRight, storedBefore.hudRight, "resize must not overwrite stored hudRight");
    assert.strictEqual(storedAfter.hudBottom, storedBefore.hudBottom, "resize must not overwrite stored hudBottom");

    // Restore viewport size
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
  });

  await step("stats bar position syncs across tabs via storage.onChanged", async () => {
    const page2 = await ctx.newPage();
    try {
      await page2.goto("https://x.com/home");
      await page2.waitForSelector(".xh-hud:not([hidden])", { timeout: 5000 });

      // Page 1 drags the bar to a new position
      await page.bringToFront();
      const hud1 = await page.locator(".xh-hud").boundingBox();
      const startX = hud1.x + hud1.width / 2;
      const startY = hud1.y + hud1.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 120, startY + 80, { steps: 5 });
      await page.mouse.up();

      // Wait for page 2 to pick up the new position via storage.onChanged without reloading page 2
      const targetBox1 = await page.locator(".xh-hud").boundingBox();
      await page2.waitForFunction((expectedX) => {
        const hud = document.querySelector(".xh-hud");
        if (!hud) return false;
        return Math.abs(hud.getBoundingClientRect().x - expectedX) <= 3;
      }, targetBox1.x, { timeout: 5000 });

      const box2 = await page2.locator(".xh-hud").boundingBox();
      assert.ok(Math.abs(box2.x - targetBox1.x) <= 3, `page2 x=${box2.x} should match page1 x=${targetBox1.x}`);
      assert.ok(Math.abs(box2.y - targetBox1.y) <= 3, `page2 y=${box2.y} should match page1 y=${targetBox1.y}`);
    } finally {
      await page2.close();
      // Reset position back to default 16 / 16
      await updateSettings({ hudRight: 16, hudBottom: 16 });
    }
  });
} finally {
  await ctx.close();
}
process.exit(failed ? 1 : 0);
