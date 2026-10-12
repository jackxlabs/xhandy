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
    assert.ok(await page.$("#old .xh-badge.xh-stale"));
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
