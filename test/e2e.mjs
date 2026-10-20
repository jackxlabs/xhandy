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
    if (new URL(r.request().url()).pathname === "/eve") return r.fulfill({ status: 200, contentType: "text/html", body: profile });
    return r.fulfill({ status: 200, contentType: "text/html", body: fixture });
  });
  const page = await ctx.newPage();
  await page.goto("https://x.com/home");
  await page.bringToFront();

  await step("badges show post age, old post is marked stale", async () => {
    await page.waitForSelector("#fresh .xh-badge");
    assert.match(await page.textContent("#fresh .xh-badge"), /2h/);
    await page.waitForFunction(() => /^3d · 694\/h · old post/.test(document.querySelector("#old .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#old .xh-chip.xh-stale"));
  });

  await step("views per hour colour the age chip: hot, warm, normal, none without data", async () => {
    // alice: 30000 views in 2 h. carol: 600 views in 10 min (counted as 30 min).
    // eve: 100 views in 15 min. dan: no view data.
    await page.waitForFunction(() => /^🔥 2h · 15K\/h/.test(document.querySelector("#fresh .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#fresh .xh-chip.xh-hot"));
    await page.waitForFunction(() => /^10m · 1.2K\/h/.test(document.querySelector("#carol .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#carol .xh-chip.xh-warm"));
    await page.waitForFunction(() => /^15m · 200\/h/.test(document.querySelector("#eve .xh-badge")?.textContent), null, { timeout: 5000 });
    assert.ok(await page.$("#eve .xh-chip.xh-age"));
    assert.match(await page.textContent("#dan .xh-badge"), /^30m(?! ·)/);
  });


  await step("follow relationships from fetch and XHR responses show on badges", async () => {
    await page.waitForFunction(() => /⇄ mutual/.test(document.querySelector("#fresh .xh-badge")?.textContent), null, { timeout: 5000 });
    await page.waitForFunction(() => /← follows you/.test(document.querySelector("#old .xh-badge")?.textContent), null, { timeout: 5000 });
    await page.waitForFunction(() => /→ you follow/.test(document.querySelector("#carol .xh-badge")?.textContent), null, { timeout: 5000 });
  });

  await step("liking counts in the HUD and the author's badge", async () => {
    await page.click("#fresh [data-testid=like]");
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=likes] b")?.textContent === "1");
    await page.waitForFunction(() => /you: 1×/.test(document.querySelector("#fresh .xh-badge").textContent));
  });

  const box = '[data-testid="tweetTextarea_0"]';
  const text = "This is a great idea, I use n8n for the same kind of automation";

  await step("sending a reply counts as a reply to that author", async () => {
    await page.click("#fresh [data-testid=reply]");
    await page.fill(box, text);
    await page.click('[data-testid="tweetButton"]');
    await page.waitForFunction(() => document.querySelector(".xh-hud [data-k=replies] b")?.textContent === "1");
    await page.waitForFunction(() => /you: 2×/.test(document.querySelector("#fresh .xh-badge").textContent));
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
    await page.waitForFunction(() => /you: 1×/.test(document.querySelector("#old .xh-badge").textContent));
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
    await page.waitForFunction(() => /you: 2×/.test(document.querySelector("#old .xh-badge").textContent));
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
    await page.waitForFunction(() => /💬 23 · 46K(?! ·)/.test(document.querySelector("#dan .xh-badge")?.textContent), null, { timeout: 5000 });
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
    await page.waitForFunction(() => /💬 23 · 46K · 12×/.test(document.querySelector("#dan .xh-badge")?.textContent), null, { timeout: 5000 });

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
    assert.doesNotMatch(badge, /not following|you:/, "no relationship or interaction chip on your own post");
    assert.doesNotMatch(badge, /4\.6K/, "no follower count of your own account");
  });
} finally {
  await ctx.close();
}
process.exit(failed ? 1 : 0);
