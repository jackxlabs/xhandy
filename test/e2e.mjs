// End-to-end check: loads the unpacked extension into Chromium and serves a fake
// X timeline for https://x.com/home, so no real X account or network is touched.
// Usage: CHROMIUM=/usr/bin/chromium npm run e2e
import { chromium } from "playwright-core";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = readFileSync(join(root, "test/fixtures/timeline.html"), "utf8");
const api = {
  HomeTimeline: readFileSync(join(root, "test/fixtures/home-timeline.json"), "utf8"),
  UserTweets: readFileSync(join(root, "test/fixtures/user-tweets.json"), "utf8"),
};

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "xh-")), {
  executablePath: process.env.CHROMIUM || "/usr/bin/chromium",
  headless: true,
  locale: "en-US",
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`, "--headless=new"],
});

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
    const name = Object.keys(api).find((k) => r.request().url().endsWith("/" + k));
    if (name) return r.fulfill({ status: 200, contentType: "application/json", body: api[name] });
    return r.fulfill({ status: 200, contentType: "text/html", body: fixture });
  });
  const page = await ctx.newPage();
  await page.goto("https://x.com/home");
  await page.bringToFront();

  await step("badges show post age, old post is marked stale", async () => {
    await page.waitForSelector("#fresh .xh-badge");
    assert.match(await page.textContent("#fresh .xh-badge"), /^2h/);
    assert.match(await page.textContent("#old .xh-badge"), /^3d · old post/);
    assert.ok(await page.$("#old .xh-chip.xh-stale"));
  });

  await step("follow relationships from fetch and XHR responses show on badges", async () => {
    await page.waitForFunction(() => /⇄ mutual/.test(document.querySelector("#fresh .xh-badge")?.textContent), null, { timeout: 5000 });
    await page.waitForFunction(() => /← follows you/.test(document.querySelector("#old .xh-badge")?.textContent), null, { timeout: 5000 });
    await page.waitForFunction(() => /→ you follow/.test(document.querySelector("#carol .xh-badge")?.textContent), null, { timeout: 5000 });
  });

  await step("liking counts in the HUD and the author's badge", async () => {
    await page.click("#fresh [data-testid=like]");
    await page.waitForFunction(() => /❤ 1 /.test(document.querySelector(".xh-hud")?.textContent));
    await page.waitForFunction(() => /you: 1×/.test(document.querySelector("#fresh .xh-badge").textContent));
  });

  const box = '[data-testid="tweetTextarea_0"]';
  const text = "This is a great idea, I use n8n for the same kind of automation";

  await step("sending a reply counts as a reply to that author", async () => {
    await page.click("#fresh [data-testid=reply]");
    await page.fill(box, text);
    await page.click('[data-testid="tweetButton"]');
    await page.waitForFunction(() => /💬 1 /.test(document.querySelector(".xh-hud").textContent));
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
    await page.waitForFunction(() => /❤ 2 /.test(document.querySelector(".xh-hud").textContent));
    await page.keyboard.press("l");
    await page.waitForFunction(() => /❤ 1 /.test(document.querySelector(".xh-hud").textContent));
  });

  await step("X keyboard shortcuts: r then send counts as a reply to the focused author", async () => {
    await page.focus("#old");
    await page.keyboard.press("r");
    await page.fill(box, "Bob, the old post still holds up after three days");
    await page.click('[data-testid="tweetButton"]');
    await page.waitForFunction(() => /💬 2 /.test(document.querySelector(".xh-hud").textContent));
    await page.waitForFunction(() => /you: 1×/.test(document.querySelector("#old .xh-badge").textContent));
  });

  await step("typing l inside the composer is not counted as a like", async () => {
    await page.click(box);
    await page.keyboard.type("l");
    await page.waitForTimeout(500);
    assert.match(await page.textContent(".xh-hud"), /❤ 1 /);
    await page.fill(box, "");
  });

  await step("Shift+F on someone you already follow just says so", async () => {
    await page.focus("#fresh");
    await page.keyboard.press("Shift+F");
    await page.waitForFunction(() => /already follow @alice/.test(document.querySelector(".xh-toast")?.textContent));
  });

  await step("Shift+F opens the hover card and focuses Follow; Enter follows", async () => {
    await page.focus("#old");
    await page.keyboard.press("Shift+F");
    await page.waitForSelector(".xh-follow-focus", { timeout: 4000 });
    assert.strictEqual(await page.evaluate(() => document.activeElement.dataset.testid), "2-follow");
    if (process.env.SHOTS) await page.screenshot({ path: join(process.env.SHOTS, "light-follow.png") });
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => /👤 1 /.test(document.querySelector(".xh-hud").textContent));
    await page.waitForFunction(() => /⇄ mutual/.test(document.querySelector("#old .xh-badge").textContent));
  });

  await step("Esc cancels the follow assistant without following", async () => {
    await page.focus("#dan");
    await page.keyboard.press("Shift+F");
    await page.waitForSelector(".xh-follow-focus", { timeout: 4000 });
    await page.keyboard.press("Escape");
    await page.waitForSelector(".xh-follow-focus", { state: "detached", timeout: 2000 });
    assert.match(await page.textContent(".xh-hud"), /👤 1 /);
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
} finally {
  await ctx.close();
}
process.exit(failed ? 1 : 0);
