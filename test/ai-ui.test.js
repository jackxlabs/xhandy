const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

class El {
  constructor(tag, doc, attrs = {}) {
    this.tag = tag; this.doc = doc; this.attrs = { ...attrs };
    this.className = ''; this.children = []; this.parentElement = null;
    this.isConnected = true; this.hidden = false; this.disabled = false; this.readOnly = false;
    this.type = ''; this.value = ''; this.checked = false; this.textContent = ''; this.innerText = '';
    this._open = false; this._listeners = new Map();
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  append(...nodes) { for (const n of nodes) { if (n.parentElement) n.remove(); n.parentElement = this; this.children.push(n); } }
  replaceChildren(...nodes) { for (const c of this.children) c.parentElement = null; this.children = []; this.append(...nodes); }
  remove() { if (this.parentElement) { this.parentElement.children = this.parentElement.children.filter(c => c !== this); this.parentElement = null; } }
  contains(node) { for (let p = node; p; p = p.parentElement) if (p === this) return true; return false; }
  matches(sel) {
    if (sel === ':popover-open') return this._open;
    if (sel === '[data-testid^="tweetTextarea_"]') return (this.attrs['data-testid'] || '').startsWith('tweetTextarea_');
    if (sel === '[data-testid^="tweetTextarea_"][contenteditable="true"]') return (this.attrs['data-testid'] || '').startsWith('tweetTextarea_') && this.attrs.contenteditable === 'true';
    if (sel === '[role="dialog"]') return this.attrs.role === 'dialog';
    if (sel === 'article[data-testid="tweet"]') return this.tag === 'article' && this.attrs['data-testid'] === 'tweet';
    if (sel === '[data-testid="reply"]') return this.attrs['data-testid'] === 'reply';
    if (sel === 'input, textarea, [contenteditable="true"], [role="textbox"]') {
      return ['input', 'textarea'].includes(this.tag) || this.attrs.contenteditable === 'true' || this.attrs.role === 'textbox';
    }
    return false;
  }
  closest(sel) { for (let p = this; p; p = p.parentElement) if (p.matches(sel)) return p; return null; }
  querySelectorAll(sel) {
    const out = [];
    const walk = n => { for (const c of n.children) { if (c.matches(sel)) out.push(c); walk(c); } };
    walk(this); return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  showPopover() { this._open = true; }
  hidePopover() { const was = this._open; this._open = false; if (was) this.dispatch('toggle', { newState: 'closed' }); }
  focus() { this.doc.activeElement = this; }
  getClientRects() { return [{}]; }
  addEventListener(type, fn) { if (!this._listeners.has(type)) this._listeners.set(type, []); this._listeners.get(type).push(fn); }
  removeEventListener(type, fn) { this._listeners.set(type, (this._listeners.get(type) || []).filter(f => f !== fn)); }
  dispatch(type, ev = {}) {
    let stopped = false;
    const event = { target: this, isTrusted: true, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() { stopped = true; }, ...ev };
    for (const fn of [...(this._listeners.get(type) || [])]) { fn(event); if (stopped) break; }
    return event;
  }
}

function createDoc() {
  const byId = new Map();
  const doc = new El('#document', null);
  doc.doc = doc; doc.activeElement = null;
  doc.createElement = tag => new El(tag, doc);
  doc.getElementById = id => byId.get(id) || null;
  doc.register = (id, tag = 'input', type = '') => { const el = new El(tag, doc); el.type = type; byId.set(id, el); return el; };
  return doc;
}

function loadScripts(ctx, files) {
  for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
}

test('ai-options updates dropdowns on xh-lang-changed, clears key on provider switch, and saves in safe order', async () => {
  const doc = createDoc();
  for (const [id, tag, type] of [
    ['aiProvider', 'select'], ['aiBase', 'input'], ['aiModel', 'input'], ['aiLanguage', 'select'],
    ['aiCustomLanguage', 'input'], ['aiTone', 'select'], ['aiExamples', 'input', 'checkbox'],
    ['aiEnabled', 'input', 'checkbox'], ['aiKey', 'input'], ['aiStatus', 'p'],
    ['aiSave', 'button'], ['aiTest', 'button'],
  ]) doc.register(id, tag, type);

  const trace = [];
  const state = {
    settings: {
      aiProvider: 'openrouter', aiBase: 'https://openrouter.ai/api/v1', aiModel: 'google/gemini-3.1-flash-lite',
      aiLanguage: 'same', aiCustomLanguage: '', aiTone: 'friendly', aiExamples: true, aiEnabled: false,
    },
  };
  let storedKey = { base: state.settings.aiBase, key: 'old-key' };
  const ctx = vm.createContext({
    URL, document: doc, navigator: { language: 'en-US' },
    chrome: {
      permissions: { request: async opts => { trace.push(['perm', opts.origins[0]]); return true; } },
      storage: {
        local: {
          get: async () => ({ 'xh:aiKey': storedKey }),
          set: async obj => { trace.push(['setKey', obj['xh:aiKey'].base]); storedKey = obj['xh:aiKey']; },
        },
      },
      runtime: { sendMessage: async () => ({ candidates: [] }) },
    },
  });
  loadScripts(ctx, ['src/locales/en.js', 'src/locales/zh.js', 'src/lib/i18n.js', 'src/lib/ai.js']);
  ctx.XH.store = {
    get: async () => ({ settings: { ...state.settings } }),
    update: async (_parts, fn) => { fn(state); trace.push(['update', state.settings.aiEnabled]); },
  };
  loadScripts(ctx, ['src/options/ai-options.js']);
  await new Promise(r => setImmediate(r));

  assert.equal(doc.getElementById('aiTone').children[0].textContent, 'Friendly');
  ctx.XH.setLang('zh');
  doc.dispatch('xh-lang-changed');
  assert.equal(doc.getElementById('aiTone').children[0].textContent, '友好');
  assert.equal(doc.getElementById('aiLanguage').children[0].textContent, '跟原帖相同');
  assert.equal(doc.getElementById('aiProvider').children.at(-1).textContent, '自定义');

  // Switching provider clears key and turns AI off.
  doc.getElementById('aiEnabled').checked = true;
  doc.getElementById('aiProvider').value = 'openai';
  doc.getElementById('aiProvider').dispatch('change');
  assert.equal(doc.getElementById('aiKey').value, '');
  assert.equal(doc.getElementById('aiEnabled').checked, false);

  // Saving requests permission first, turns AI off, writes key, then enables AI.
  doc.getElementById('aiKey').value = 'new-secret';
  doc.getElementById('aiEnabled').checked = true;
  doc.getElementById('aiSave').dispatch('click');
  await new Promise(r => setImmediate(r));
  assert.deepEqual(trace, [
    ['perm', 'https://api.openai.com/*'],
    ['update', false],
    ['setKey', 'https://api.openai.com/v1'],
    ['update', true],
  ]);
});

test('ai-composer mounts outside SEL.textarea, hides empty custom language, guards Alt+R/Esc, and cancels on close', async () => {
  const doc = createDoc();
  const tweet = new El('article', doc, { 'data-testid': 'tweet' });
  const replyBtn = new El('button', doc, { 'data-testid': 'reply' });
  tweet.append(replyBtn);
  const dialog = new El('div', doc, { role: 'dialog' });
  const labelWrap = new El('div', doc, { 'data-testid': 'tweetTextarea_0_label' });
  const richWrap = new El('div', doc, { 'data-testid': 'tweetTextarea_0RichTextInputContainer' });
  const box = new El('div', doc, { 'data-testid': 'tweetTextarea_0', contenteditable: 'true', role: 'textbox' });
  richWrap.append(box); labelWrap.append(richWrap); dialog.append(labelWrap);
  doc.append(tweet, dialog);

  const sentMessages = [];
  let resolveGenerate;
  const settings = { aiEnabled: true, aiLanguage: 'same', aiTone: 'friendly', aiCustomLanguage: '' };
  const ctx = vm.createContext({
    document: doc, location: { href: 'https://x.com/home', pathname: '/home' },
    window: { getSelection: () => ({ rangeCount: 0, removeAllRanges() {}, addRange() {} }) },
    chrome: {
      runtime: {
        sendMessage: msg => {
          sentMessages.push(msg);
          if (msg.type === 'xh-ai-generate') return new Promise(r => { resolveGenerate = r; });
          return Promise.resolve({});
        },
      },
    },
  });
  loadScripts(ctx, ['src/locales/en.js', 'src/locales/zh.js', 'src/lib/i18n.js', 'src/lib/ai.js', 'src/lib/ai-composer.js']);
  ctx.XH.setLang('en');

  const SEL = {
    tweet: 'article[data-testid="tweet"]',
    editor: '[data-testid^="tweetTextarea_"][contenteditable="true"]',
    dialog: '[role="dialog"]',
    reply: '[data-testid="reply"]',
    textarea: '[data-testid^="tweetTextarea_"]',
  };
  const composer = ctx.XH.createAiComposer({
    selectors: SEL,
    state: () => ({ settings }),
    context: a => (a === tweet ? { id: '1', handle: 'alice', name: 'Alice', parent: 'Original post' } : null),
    checkDup() {},
  });
  composer.refresh();

  // 1) Bar and panel mount outside all SEL.textarea wrappers, directly in dialog.
  const bar = dialog.children.find(c => c.className === 'xh-ai-bar');
  const panel = dialog.children.find(c => c.className === 'xh-ai-panel');
  assert.ok(bar && panel, 'bar and panel mounted in dialog');
  assert.equal(bar.closest(SEL.textarea), null);
  assert.equal(panel.closest(SEL.textarea), null);

  // 2) Custom language option is omitted when aiCustomLanguage is empty, shown when set.
  const langSelect = bar.children[2];
  assert.ok(!langSelect.children.some(o => o.value === 'custom'));
  settings.aiCustomLanguage = 'Spanish';
  composer.refresh();
  assert.ok(bar.children[2].children.some(o => o.value === 'custom'));

  // 3) Non-Element target does not throw, and Alt+R does not wipe replyContext.
  assert.doesNotThrow(() => doc.dispatch('keydown', { key: 'r', target: {} }));
  doc.dispatch('click', { target: replyBtn });
  doc.dispatch('keydown', { key: 'r', altKey: true, target: dialog });

  // 4) Draft request succeeds with preserved context; busy retry shows status; Esc stops other listeners and cancels.
  let secondEscFired = false;
  doc.addEventListener('keydown', e => { if (e.key === 'Escape') secondEscFired = true; });
  bar.children[0].dispatch('click');
  assert.equal(sentMessages[0].type, 'xh-ai-generate');
  assert.equal(sentMessages[0].input.parent, 'Original post');

  // While in-flight, another Alt+G opens panel with busy status instead of silent no-op.
  panel._open = false;
  doc.dispatch('keydown', { altKey: true, code: 'KeyG', target: box });
  assert.equal(panel._open, true);
  assert.equal(panel.children[1].textContent, ctx.XH.t('ai_error_busy'));

  // Pressing Escape closes popover, blocks later Escape listeners, and sends xh-ai-cancel.
  doc.dispatch('keydown', { key: 'Escape', target: box });
  assert.equal(panel._open, false);
  assert.equal(secondEscFired, false);
  assert.equal(sentMessages.at(-1).type, 'xh-ai-cancel');
  resolveGenerate({ error: 'timeout' });
  await new Promise(r => setImmediate(r));
});

test('ai-composer clips oversized original posts to <=10000 chars with ellipsis before sending', async () => {
  const doc = createDoc();
  const tweet = new El('article', doc, { 'data-testid': 'tweet' });
  const replyBtn = new El('button', doc, { 'data-testid': 'reply' });
  tweet.append(replyBtn);
  const dialog = new El('div', doc, { role: 'dialog' });
  const box = new El('div', doc, { 'data-testid': 'tweetTextarea_0', contenteditable: 'true', role: 'textbox' });
  dialog.append(box);
  doc.append(tweet, dialog);

  const sent = [];
  const longParent = '🔥'.repeat(6000); // 12000 UTF-16 code units
  const settings = { aiEnabled: true, aiLanguage: 'same', aiTone: 'friendly', aiCustomLanguage: '' };
  const ctx = vm.createContext({
    document: doc, location: { href: 'https://x.com/home', pathname: '/home' },
    window: { getSelection: () => ({ rangeCount: 0, removeAllRanges() {}, addRange() {} }) },
    chrome: { runtime: { sendMessage: async msg => { sent.push(msg); return { candidates: ['A', 'B', 'C'] }; } } },
  });
  loadScripts(ctx, ['src/locales/en.js', 'src/locales/zh.js', 'src/lib/i18n.js', 'src/lib/ai.js', 'src/lib/ai-composer.js']);
  ctx.XH.setLang('en');

  const composer = ctx.XH.createAiComposer({
    selectors: {
      tweet: 'article[data-testid="tweet"]',
      editor: '[data-testid^="tweetTextarea_"][contenteditable="true"]',
      dialog: '[role="dialog"]',
      reply: '[data-testid="reply"]',
      textarea: '[data-testid^="tweetTextarea_"]',
    },
    state: () => ({ settings }),
    context: a => (a === tweet ? { id: '2', handle: 'bob', name: 'Bob', parent: longParent } : null),
    checkDup() {},
  });
  composer.refresh();
  doc.dispatch('click', { target: replyBtn });
  const bar = dialog.children.find(c => c.className === 'xh-ai-bar');
  bar.children[0].dispatch('click');
  await new Promise(r => setImmediate(r));

  assert.equal(sent.length, 1);
  assert.ok(sent[0].input.parent.length <= 10000);
  assert.ok(sent[0].input.parent.endsWith('…'));
  assert.doesNotThrow(() => ctx.XH.ai.input(sent[0].input));
});
