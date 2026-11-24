import { createServer } from 'node:http';
import assert from 'node:assert/strict';

// Real HTTP server: requests come from the extension worker, never Playwright route mocks.
export async function aiE2e(ctx, extId, step) {
  let calls = 0, lastBody, statusCode = 200;
  const candidates = ['Solar storage could shift that noon surplus into the evening.', 'How much demand can shift to the hours with the most sunshine?', 'Matching flexible loads to solar output seems worth testing.'];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      calls++; lastBody = JSON.parse(body);
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(candidates) } }] }));
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const options = await ctx.newPage(), page = await ctx.newPage();
  const editor = '[data-testid="tweetTextarea_0"][contenteditable="true"]';
  try {
    await options.goto(`chrome-extension://${extId}/src/options/options.html#ai`);
    const backup = await options.evaluate(() => chrome.storage.local.get(['xh:settings', 'xh:aiKey']));
    try {
      await page.goto('https://x.com/home');
      await page.waitForSelector('.xh-badge');
      await step('AI setup is opt-in and requests only its local provider origin', async () => {
        await options.selectOption('#aiProvider', 'custom');
        await options.fill('#aiBase', `http://127.0.0.1:${server.address().port}/v1`);
        await options.fill('#aiModel', 'fixture'); await options.fill('#aiKey', 'fake-e2e-key');
        assert.equal(calls, 0);
        await options.check('#aiEnabled'); await options.click('#aiSave');
        await options.waitForFunction(() => document.querySelector('#aiStatus').textContent === 'AI settings saved.');
        await page.waitForSelector('.xh-ai-draft');
        assert.equal(calls, 0, 'enabling never generates');
        assert.equal(await options.evaluate(() => chrome.permissions.contains({ origins: ['http://127.0.0.1/*'] })), true);
        assert.equal(await options.evaluate(() => chrome.permissions.contains({ origins: ['https://api.openai.com/*'] })), false);
      });
      await step('AI connection test uses a tiny synthetic request', async () => {
        await options.click('#aiTest');
        await options.waitForFunction(() => document.querySelector('#aiStatus').textContent === 'Connection successful.');
        assert.equal(lastBody.messages[1].content, 'Connection test.');
      });
      await step('AI candidates do not insert before selection, then insert without clicking or sending on X', async () => {
        await page.evaluate(() => {
          window.aiUntrustedClicks = 0; window.aiSends = 0; window.aiNativeInputs = 0;
          document.addEventListener('input', e => { if (e.isTrusted && e.target.matches('[contenteditable="true"]')) window.aiNativeInputs++; });
          document.addEventListener('click', e => { if (!e.isTrusted) window.aiUntrustedClicks++; if (e.target.closest('[data-testid="tweetButton"]')) window.aiSends++; }, true);
        });
        await page.fill(editor, ''); await page.click('#fresh [data-testid="reply"]');
        await page.click('.xh-ai-draft'); await page.waitForSelector('.xh-ai-candidate');
        assert.equal(await page.locator('.xh-ai-candidate').count(), 3);
        assert.equal(await page.locator(editor).innerText(), '');
        const payload = JSON.parse(lastBody.messages[1].content);
        assert.equal(payload.originalPost.handle, 'alice'); assert.equal(payload.originalPost.text, 'fresh post');
        const inputsBefore = await page.evaluate(() => window.aiNativeInputs);
        await page.locator('.xh-ai-candidate').first().click();
        assert.equal(await page.locator(editor).innerText(), candidates[0]);
        assert.ok(await page.evaluate(n => window.aiNativeInputs > n, inputsBefore), 'native insertText input reaches editor');
        assert.deepEqual(await page.evaluate(() => [window.aiUntrustedClicks, window.aiSends]), [0, 0]);
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
        assert.equal(await page.locator(editor).innerText(), '', 'candidate insertion preserves native undo');
      });
      await step('AI Esc dismisses, stale candidates preserve edits, and Alt+G opens candidates', async () => {
        await page.fill(editor, ''); await page.focus(editor); await page.keyboard.press('Alt+KeyG');
        await page.waitForSelector('.xh-ai-candidate'); await page.keyboard.press('Escape');
        assert.equal(await page.locator('.xh-ai-panel:popover-open').count(), 0);
        assert.equal(await page.locator(editor).innerText(), '');
        await page.keyboard.press('Alt+KeyG'); await page.waitForSelector('.xh-ai-candidate');
        // Change without clicking outside, so the popover remains open, simulating an async editor update.
        await page.locator(editor).evaluate(el => { el.textContent = 'My newer draft'; });
        await page.locator('.xh-ai-candidate').first().click();
        assert.equal(await page.locator(editor).innerText(), 'My newer draft');
        await page.keyboard.press('Escape');
      });
      await step('AI rewrites replace only after selection and still trigger duplicate warnings', async () => {
        await options.evaluate(async text => {
          await chrome.storage.local.set({ 'xh:sent': [{ text, t: Date.now(), kind: 'reply', to: 'alice' }] });
          await XH.store.update(['settings'], s => { s.settings.dupWarn = true; });
        }, candidates[0]);
        await page.fill(editor, 'This is my original draft');
        await page.click('.xh-ai-rewrite'); await page.waitForSelector('.xh-ai-candidate');
        assert.equal(await page.locator(editor).innerText(), 'This is my original draft');
        await page.locator('.xh-ai-candidate').first().click();
        assert.equal(await page.locator(editor).innerText(), candidates[0]);
        await page.waitForSelector('.xh-dup');
        assert.deepEqual(await page.evaluate(() => [window.aiUntrustedClicks, window.aiSends]), [0, 0]);
      });
      await step('AI shorten, translate and casual preserve text until selected', async () => {
        for (const action of ['shorten', 'translate', 'casual']) {
          await page.fill(editor, 'A sentence to rewrite');
          await page.locator('.xh-ai-bar select').nth(2).selectOption(action);
          await page.locator('.xh-ai-bar select').nth(1).selectOption('English');
          await page.click('.xh-ai-rewrite'); await page.waitForSelector('.xh-ai-candidate');
          const payload = JSON.parse(lastBody.messages[1].content);
          assert.equal(payload.task, action); assert.equal(payload.language, 'English');
          assert.equal(await page.locator(editor).innerText(), 'A sentence to rewrite');
          await page.locator('.xh-ai-candidate').first().click();
          assert.equal(await page.locator(editor).innerText(), candidates[0]);
        }
      });
      await step('AI safe HTTP error leaves editor untouched; disabling removes controls', async () => {
        statusCode = 401;
        await page.click('.xh-ai-rewrite');
        await page.waitForFunction(() => document.querySelector('.xh-ai-panel').textContent.includes('HTTP 401'));
        assert.equal(await page.locator(editor).innerText(), candidates[0]);
        assert.ok(!(await page.locator('.xh-ai-panel').innerText()).includes('fake-e2e-key'));
        await options.uncheck('#aiEnabled'); await options.click('#aiSave');
        await page.waitForSelector('.xh-ai-bar', { state: 'detached' });
      });
    } finally {
      await options.evaluate(async backup => {
        await chrome.storage.local.remove('xh:aiKey'); await chrome.storage.local.set(backup);
      }, backup);
    }
  } finally { await page.close(); await options.close(); await new Promise(resolve => server.close(resolve)); }
}
