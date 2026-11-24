const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/lib/ai.js');
const ai = globalThis.XH.ai;
const sample = { action: 'reply', text: '', parent: 'Solar panels reduce grid demand at noon.', name: 'Alice', handle: 'alice', language: 'English', tone: 'insightful' };
const conf = (provider, patch = {}) => ai.config({ aiProvider: provider, aiBase: ai.PRESETS[provider].base, aiModel: ai.PRESETS[provider].model, ...patch });
test('prompt carries author, language, specific context and anti-copy/fabrication constraints', () => {
  const p = ai.prompt(sample, ['My original reply']);
  const d = JSON.parse(p.user);
  assert.equal(d.originalPost.handle, 'alice'); assert.equal(d.originalPost.displayName, 'Alice');
  assert.equal(d.language, 'English'); assert.deepEqual(d.styleExamples, ['My original reply']);
  for (const text of ['280', 'CJK', 'Great post!', 'invented facts', 'em dashes', 'never copy', 'untrusted data']) assert.ok(p.system.includes(text));
  for (const action of ai.ACTIONS.slice(1)) assert.equal(JSON.parse(ai.prompt({ ...sample, action, text: 'Original draft' }).user).task, action);
});
test('input rejects oversized, missing and unrecognized fields', () => {
  for (const patch of [{ action: 'send' }, { parent: '' }, { tone: 'evil' }, { language: '' }, { text: 'a'.repeat(10001) }]) assert.throws(() => ai.input({ ...sample, ...patch }));
  assert.throws(() => ai.input({ ...sample, action: 'polish', text: '' }));
});
test('all provider adapters build authentication, endpoint and payload without keys in URL', () => {
  for (const provider of Object.keys(ai.PRESETS)) {
    const c = provider === 'custom' ? conf(provider, { aiBase: 'https://example.test/v1', aiModel: 'test' }) : conf(provider);
    const r = ai.request(c, provider === 'ollama' ? '' : 'test-secret', ai.prompt(sample));
    assert.ok(!r.url.includes('test-secret')); assert.equal(r.init.redirect, 'error'); assert.equal(r.init.credentials, 'omit');
    const body = JSON.parse(r.init.body);
    if (provider === 'gemini') { assert.match(r.url, /:generateContent$/); assert.equal(r.init.headers['x-goog-api-key'], 'test-secret'); assert.ok(body.systemInstruction); assert.equal(body.generationConfig.maxOutputTokens, 4096); }
    else if (provider === 'anthropic') { assert.match(r.url, /\/messages$/); assert.equal(r.init.headers['x-api-key'], 'test-secret'); assert.ok(body.system); assert.ok(body.max_tokens >= 2048); }
    else { assert.match(r.url, /\/chat\/completions$/); assert.equal(body.model, c.model); assert.ok(body.max_tokens >= 2048); assert.equal(r.init.headers.Authorization, provider === 'ollama' ? undefined : 'Bearer test-secret'); }
  }
});
test('URLs permit only HTTPS or loopback HTTP, with no hidden credential/query/fragment', () => {
  for (const base of ['http://example.com/v1', 'https://user:secret@host/v1', 'https://host/v1?key=secret', 'https://host/#key', 'https://host/v1?', 'https://host/v1#', 'file:///tmp/a', 'javascript:alert(1)']) assert.throws(() => conf('custom', { aiBase: base, aiModel: 'x' }), /^Error: config$/);
  assert.throws(() => conf('custom', { aiBase: '', aiModel: 'x' }), /^Error: config$/);
  assert.throws(() => conf('custom', { aiBase: 'https://example.test/v1', aiModel: '' }), /^Error: config$/);
  assert.equal(conf('custom', { aiBase: 'http://127.0.0.1:1234/v1', aiModel: 'x' }).permission, 'http://127.0.0.1/*');
  assert.throws(() => conf('openai', { aiBase: 'https://evil.test/v1' }), /^Error: config$/);
});
test('response adapters parse exactly three candidates and reject invalid provider output', () => {
  const output = ['One', '二', 'Three']; const text = JSON.stringify(output);
  assert.deepEqual(ai.response('openai', { choices: [{ message: { content: text } }] }), output);
  assert.deepEqual(ai.response('gemini', { candidates: [{ content: { parts: [{ text: 'hidden', thought: true }, { text }] } }] }), output);
  assert.deepEqual(ai.response('anthropic', { content: [{ type: 'text', text: '```json\n' + text + '\n```' }] }), output);
  assert.deepEqual(ai.response('openai', { choices: [{ message: { content: '<think>plan carefully</think>\n' + text } }] }), output);
  assert.deepEqual(ai.response('openai', { choices: [{ message: { content: 'unclosed thought</think>\n' + text } }] }), output);
  assert.deepEqual(ai.response('openai', { choices: [{ message: { content: '' } }] }, true), []);
  assert.deepEqual(ai.response('gemini', { candidates: [{ content: { parts: [{ text: 'thinking', thought: true }] } }] }, true), []);
  for (const content of ['oops', '{}', '[]', '["one", "two"]', '["one", "two", ""]', JSON.stringify(['a'.repeat(2001), 'b', 'c'])]) assert.throws(() => ai.response('openai', { choices: [{ message: { content } }] }), /format/);
  assert.throws(() => ai.response('gemini', {}), /format/);
});
test('style examples use full unique matched recent replies, sorted by views and capped at five', () => {
  const now = Date.now(); const sent = [], mine = {};
  for (let i = 0; i < 8; i++) { const text = `Example ${i} ` + 'x'.repeat(100); sent.push({ text, t: now - 1000, kind: 'reply', to: 'Alice' }); mine[i] = { k: 'r', t: now - 2000, to: 'alice', x: text.slice(0,80), v: i }; }
  assert.deepEqual(ai.examples(sent, mine, now), [7,6,5,4,3].map(i => sent[i].text));
  assert.deepEqual(ai.examples([sent[0], sent[0]], { 1: mine[0] }, now), []);
  assert.deepEqual(ai.examples(sent, { 1: { ...mine[0], t: now - 31 * 86400000 } }, now), []);
  assert.deepEqual(ai.examples(sent, { 1: { ...mine[0], to: 'bob' } }, now), []);
  const emojiText = '🔥'.repeat(5) + 'a'.repeat(90);
  const emojiPrefix = Array.from(emojiText).slice(0, 80).join('');
  assert.deepEqual(ai.examples([{ text: emojiText, t: now - 1000, kind: 'reply', to: 'Alice' }], { e: { k: 'r', t: now - 2000, to: 'alice', x: emojiPrefix, v: 99 } }, now), [emojiText]);
});
test('counts CJK as two and Latin as one', () => { assert.equal(ai.count('你好 hi'), 7); });
