const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function worker({ enabled = true, permission = true, provider = 'custom', base = 'https://provider.test/v1', model = 'test', aiExamples = false, credential, sent = [], mine = {}, fetcher } = {}) {
  let listener, change, timer, requested = [];
  const settings = { aiEnabled: enabled, aiProvider: provider, aiBase: base, aiModel: model, aiExamples };
  const data = { 'xh:settings': settings, 'xh:aiKey': credential === undefined ? { base: settings.aiBase, key: 'unit-secret' } : credential, 'xh:sent': sent, 'xh:mine': mine };
  const ctx = vm.createContext({ URL, AbortController, TextDecoder, TextEncoder, Uint8Array, setTimeout: f => { timer = f; return 1; }, clearTimeout() {},
    fetch: async (url, init) => { requested.push({ url, init }); return fetcher ? fetcher(url, init) : { ok: true, text: async () => JSON.stringify({ choices: [{ message: { content: '["A","B","C"]' } }] }) }; },
    chrome: { runtime: { id: 'extension', getURL: p => 'chrome-extension://extension/' + p, onMessage: { addListener: fn => listener = fn }, openOptionsPage() {} },
      permissions: { contains: async () => permission }, storage: { local: { get: async keys => Object.fromEntries(keys.map(k => [k, data[k]])) }, onChanged: { addListener: fn => change = fn } } },
  });
  ctx.importScripts = () => vm.runInContext(fs.readFileSync('src/lib/ai.js', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync('src/background.js', 'utf8'), ctx);
  const sender = { id: 'extension', url: 'https://x.com/home', tab: { id: 1 }, frameId: 0 };
  const input = { action: 'reply', parent: 'A specific topic', language: 'English', tone: 'friendly' };
  return { requested, settings, timeout: () => timer(), change, send: (msg = { type: 'xh-ai-generate', input }, from = sender) => new Promise(resolve => listener(msg, from, resolve)), sender, input };
}
test('worker enforces off, permission and credential binding before fetch', async () => {
  for (const [opts, error] of [[{ enabled: false }, 'disabled'], [{ permission: false }, 'permission'], [{ credential: { base: 'https://other.test/v1', key: 'unit-secret' } }, 'key']]) {
    const w = worker(opts); assert.equal((await w.send()).error, error); assert.equal(w.requested.length, 0);
  }
});
test('worker rejects foreign senders, frames and content-origin connection tests', async () => {
  const w = worker();
  for (const patch of [{ id: 'other' }, { url: 'https://evil.test/' }, { frameId: 1 }]) assert.equal((await w.send(undefined, { ...w.sender, ...patch })).error, 'sender');
  assert.equal((await w.send({ type: 'xh-ai-test' })).error, 'sender'); assert.equal(w.requested.length, 0);
});
test('worker returns bounded candidates and test prompt has no user text', async () => {
  const w = worker(); assert.equal((await w.send()).candidates.join(), 'A,B,C');
  const r = await w.send({ type: 'xh-ai-test' }, { id: 'extension', url: 'chrome-extension://extension/src/options/options.html' });
  assert.equal(r.candidates.length, 0);
  const body = JSON.parse(w.requested[1].init.body); assert.equal(body.max_tokens, 32); assert.equal(body.messages[1].content, 'Connection test.');
});
test('HTTP errors, exception messages and echoed credentials are never returned', async () => {
  const cases = [
    [{ ok: false, status: 401, text: async () => 'unit-secret' }, 'http'],
    [{ ok: true, text: async () => 'invalid unit-secret' }, 'format'],
    [{ ok: true, text: async () => JSON.stringify({ choices: [{ message: { content: '["unit-secret","B","C"]' } }] }) }, 'format'],
  ];
  for (const [res, code] of cases) { const w = worker({ fetcher: async () => res }); const r = await w.send(); assert.equal(r.error, code); assert.ok(!JSON.stringify(r).includes('unit-secret')); }
  const w = worker({ fetcher: async () => { throw new Error('unit-secret'); } }); assert.equal((await w.send()).error, 'network');
});
test('worker times out, prevents simultaneous requests and aborts on disable', async () => {
  const w = worker({ fetcher: (_, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))) });
  const pending = w.send(); await new Promise(r => setImmediate(r));
  assert.equal((await w.send()).error, 'busy');
  w.timeout(); assert.equal((await pending).error, 'timeout');
  const again = w.send(); await new Promise(r => setImmediate(r));
  w.change({ 'xh:settings': { oldValue: { aiEnabled: true }, newValue: { aiEnabled: false } } }, 'local');
  assert.equal((await again).error, 'timeout');
});
test('worker allows Ollama without key, includes history when aiExamples is true, and rejects >100KB bodies', async () => {
  const ollama = worker({ provider: 'ollama', base: 'http://localhost:11434/v1', model: 'qwen3:4b', credential: null });
  assert.equal((await ollama.send()).candidates.join(), 'A,B,C');
  assert.equal(ollama.requested[0].init.headers.Authorization, undefined);

  const now = Date.now();
  const sampleText = 'My high-performing reply with real detail.';
  const withExamples = worker({
    aiExamples: true,
    sent: [{ text: sampleText, t: now - 1000, kind: 'reply', to: 'Alice' }],
    mine: { 1: { k: 'r', t: now - 2000, to: 'alice', x: Array.from(sampleText).slice(0, 80).join(''), v: 500 } },
  });
  assert.equal((await withExamples.send()).candidates.join(), 'A,B,C');
  const sentPayload = JSON.parse(JSON.parse(withExamples.requested[0].init.body).messages[1].content);
  assert.deepEqual(sentPayload.styleExamples, [sampleText]);

  const huge = worker({ fetcher: async () => ({ ok: true, text: async () => 'x'.repeat(100001) }) });
  assert.equal((await huge.send()).error, 'format');

  // Content-Length > 100KB aborts immediately before reading body.
  let headerSignal, readerCalled = false;
  const byHeader = worker({
    fetcher: async (_, init) => {
      headerSignal = init.signal;
      return { ok: true, headers: { get: k => k.toLowerCase() === 'content-length' ? '150000' : null }, body: { getReader: () => { readerCalled = true; } } };
    },
  });
  assert.equal((await byHeader.send()).error, 'format');
  assert.equal(headerSignal.aborted, true);
  assert.equal(readerCalled, false);

  // Streamed response without Content-Length aborts once cumulative bytes exceed 100KB.
  let streamSignal, reads = 0, cancelled = false;
  const byStream = worker({
    fetcher: async (_, init) => {
      streamSignal = init.signal;
      return {
        ok: true,
        headers: { get: () => null },
        body: {
          getReader: () => ({
            read: async () => { reads++; return { done: false, value: new Uint8Array(40000) }; },
            cancel: async () => { cancelled = true; },
            releaseLock() {},
          }),
        },
      };
    },
  });
  assert.equal((await byStream.send()).error, 'format');
  assert.equal(streamSignal.aborted, true);
  assert.equal(cancelled, true);
  assert.equal(reads, 3);

  // Connection test succeeds on any 2xx valid JSON (even when thinking models omit candidate text).
  const testThinking = worker({ fetcher: async () => ({ ok: true, text: async () => JSON.stringify({ choices: [{ message: { content: '' } }] }) }) });
  const testRes = await testThinking.send({ type: 'xh-ai-test' }, { id: 'extension', url: 'chrome-extension://extension/src/options/options.html' });
  assert.deepEqual(JSON.parse(JSON.stringify(testRes)), { candidates: [] }); // the worker runs in a vm context, so compare plain data
});
test('worker aborts in-flight request on xh-ai-cancel and on aiBase/aiKey changes', async () => {
  const w = worker({ fetcher: (_, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))) });
  const p1 = w.send(); await new Promise(r => setImmediate(r));
  await w.send({ type: 'xh-ai-cancel' });
  assert.equal((await p1).error, 'timeout');

  const p2 = w.send(); await new Promise(r => setImmediate(r));
  w.change({ 'xh:aiKey': { oldValue: { base: 'https://provider.test/v1', key: 'a' }, newValue: { base: 'https://provider.test/v1', key: 'b' } } }, 'local');
  assert.equal((await p2).error, 'timeout');
});
