importScripts('lib/ai.js');
const ai = globalThis.XH.ai;
const active = new Map();
function allowed(sender) {
  if (sender.id !== chrome.runtime.id) return false;
  if (sender.url === chrome.runtime.getURL('src/options/options.html') || sender.url?.startsWith(chrome.runtime.getURL('src/options/options.html') + '#')) return 'options';
  try { const u = new URL(sender.url); return sender.tab && sender.frameId === 0 && u.protocol === 'https:' && ['x.com', 'twitter.com'].includes(u.hostname) ? 'content' : false; } catch { return false; }
}
async function generate(message, sender) {
  const caller = allowed(sender);
  if (!caller || (message.type === 'xh-ai-test' && caller !== 'options')) return { error: 'sender' };
  const id = sender.tab?.id ?? 'options';
  if (active.has(id)) throw new Error('busy');
  const controller = new AbortController();
  active.set(id, controller);
  let timer, tooLarge = false;
  try {
    const stored = await chrome.storage.local.get(['xh:settings', 'xh:aiKey']);
    const s = stored['xh:settings'] || {};
    if (s.aiEnabled !== true) throw new Error('disabled');
    const c = ai.config(s), credential = stored['xh:aiKey'];
    const key = c.provider === 'ollama' ? '' : credential?.base === c.base && typeof credential.key === 'string' ? credential.key : '';
    if (c.provider !== 'ollama' && !key) throw new Error('key');
    if (!await chrome.permissions.contains({ origins: [c.permission] })) throw new Error('permission');
    const test = message.type === 'xh-ai-test';
    let samples = [];
    if (!test && s.aiExamples !== false) {
      const history = await chrome.storage.local.get(['xh:sent', 'xh:mine']);
      samples = ai.examples(history['xh:sent'], history['xh:mine']);
    }
    const p = test ? { system: 'Reply OK.', user: 'Connection test.' } : ai.prompt(message.input, samples);
    const req = ai.request(c, key, p, test);
    timer = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(req.url, { ...req.init, signal: controller.signal });
    if (!res.ok) return { error: 'http', status: res.status };
    // Do not return provider errors: they can contain the request or credential.
    const MAX_BYTES = 100000;
    const lenHeader = res.headers?.get?.('content-length');
    if (lenHeader != null && Number(lenHeader) > MAX_BYTES) {
      tooLarge = true; controller.abort(); throw new Error('format');
    }
    let raw = '';
    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let total = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(String(value));
          total += bytes.byteLength;
          if (total > MAX_BYTES) {
            tooLarge = true;
            await reader.cancel().catch(() => {});
            controller.abort();
            throw new Error('format');
          }
          raw += decoder.decode(bytes, { stream: true });
        }
        raw += decoder.decode();
      } finally { reader.releaseLock?.(); }
    } else {
      raw = await res.text();
      if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) { tooLarge = true; throw new Error('format'); }
    }
    if (controller.signal.aborted) throw new Error('timeout');
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('format'); }
    let candidates;
    try { candidates = ai.response(c.provider, data, test); } catch { throw new Error('format'); }
    if (key && candidates.some(text => text.includes(key))) throw new Error('format');
    return { candidates };
  } catch (err) {
    const safe = ['sender', 'busy', 'disabled', 'config', 'key', 'permission', 'input', 'format', 'timeout'];
    return { error: tooLarge ? 'format' : controller.signal.aborted ? 'timeout' : safe.includes(err.message) ? err.message : 'network' };
  } finally { clearTimeout(timer); active.delete(id); }
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes['xh:settings'] || changes['xh:aiKey'])) {
    const before = changes['xh:settings']?.oldValue || {}, after = changes['xh:settings']?.newValue || {};
    if (changes['xh:aiKey'] || ['aiEnabled', 'aiBase', 'aiModel', 'aiProvider', 'aiExamples'].some(k => before[k] !== after[k])) {
      for (const c of active.values()) c.abort();
    }
  }
});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!message || !['xh-ai-generate', 'xh-ai-test', 'xh-ai-options', 'xh-ai-cancel'].includes(message.type)) return;
  if (!allowed(sender)) { reply({ error: 'sender' }); return; }
  if (message.type === 'xh-ai-options') { chrome.runtime.openOptionsPage(); reply({}); return; }
  if (message.type === 'xh-ai-cancel') { active.get(sender.tab?.id ?? 'options')?.abort(); reply({}); return; }
  generate(message, sender).then(reply, () => reply({ error: 'busy' }));
  return true;
});
