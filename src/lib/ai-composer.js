(function () {
  const XH = globalThis.XH;
  XH.createAiComposer = function ({ selectors, state, context, checkDup }) {
    const entries = new Map();
    let selectedContext = null, contextRoute = '', selectedAt = 0, activeEntry = null;
    function button(label, action, cls = '') {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.className = cls;
      b.addEventListener('click', e => { if (e.isTrusted) { e.stopPropagation(); action(); } }); return b;
    }
    function select(values, chosen, label, translate) {
      const el = document.createElement('select'); el.setAttribute('aria-label', label);
      for (const value of values) { const o = document.createElement('option'); o.value = value; o.textContent = translate(value); el.append(o); }
      el.value = chosen; return el;
    }
    function parentFor(box) {
      const dialog = box.closest(selectors.dialog);
      const articles = dialog ? [...dialog.querySelectorAll(selectors.tweet)] : [];
      if (articles.length === 1) return context(articles[0]);
      if (articles.length > 1) return null;
      const entry = entries.get(box);
      if (entry?.replyContext && entry.contextRoute === location.href) return entry.replyContext;
      const match = location.pathname.match(/\/status\/(\d+)/);
      if (match) {
        const matches = [...document.querySelectorAll(selectors.tweet)].map(context).filter(c => c?.id === match[1]);
        if (matches.length === 1) return matches[0];
      }
      return null;
    }
    function cancel(entry) {
      entry.generation++;
      if (entry.busy) Promise.resolve(chrome.runtime.sendMessage({ type: 'xh-ai-cancel' })).catch(() => {});
    }
    function close(entry) {
      cancel(entry);
      if (entry.panel.matches(':popover-open')) entry.panel.hidePopover();
    }
    function mountHost(box) {
      let outer = box;
      for (let p = box.parentElement; p; p = p.parentElement) if (p.matches?.(selectors.textarea)) outer = p;
      return outer.parentElement || box.parentElement;
    }
    function clip(str, max) {
      if (!str || str.length <= max) return str || '';
      let out = '';
      for (const ch of str) {
        if (out.length + ch.length > max - 1) break;
        out += ch;
      }
      return out + '…';
    }
    function mount(box) {
      const bar = document.createElement('div'); bar.className = 'xh-ai-bar';
      const panel = document.createElement('div'); panel.className = 'xh-ai-panel'; panel.popover = 'auto';
      panel.setAttribute('aria-label', XH.t('ai_candidates'));
      const status = document.createElement('p'); status.setAttribute('role', 'status');
      const results = document.createElement('div'); results.className = 'xh-ai-results';
      const entry = { box, bar, panel, generation: 0, range: null, busy: false, signature: '', replyContext: box.closest(selectors.dialog) && contextRoute === location.href && Date.now() - selectedAt < 5000 ? selectedContext : null, contextRoute };
      if (entry.replyContext) selectedContext = null;
      const capture = () => {
        const selection = window.getSelection();
        if (selection.rangeCount && box.contains(selection.anchorNode) && box.contains(selection.focusNode)) entry.range = selection.getRangeAt(0).cloneRange();
      };
      bar.addEventListener('pointerdown', capture);
      box.addEventListener('keyup', capture); box.addEventListener('pointerup', capture);
      const syncRewrite = () => { if (entry.rewrite) entry.rewrite.hidden = !box.innerText.trim(); };
      box.addEventListener('input', syncRewrite);
      entry.cleanup = () => { box.removeEventListener('input', syncRewrite); box.removeEventListener('keyup', capture); box.removeEventListener('pointerup', capture); close(entry); bar.remove(); panel.remove(); };
      entry.closeButton = button(XH.t('ai_close'), () => { close(entry); box.focus(); });
      panel.append(entry.closeButton, status, results);
      panel.addEventListener('toggle', e => { if (e.newState === 'closed') cancel(entry); });
      // Keep popovers inside X's dialog subtree when present, but outside SEL.textarea containers.
      mountHost(box).append(bar, panel);
      async function run(action) {
        if (entry.busy) {
          if (!panel.matches(':popover-open')) panel.showPopover();
          status.textContent = XH.t('ai_error_busy');
          return;
        }
        capture(); activeEntry = entry;
        const initial = box.innerText, route = location.href, parent = parentFor(box);
        results.replaceChildren();
        if (!panel.matches(':popover-open')) panel.showPopover();
        status.textContent = XH.t('ai_loading');
        if (action === 'reply' && !parent?.parent) { status.textContent = XH.t('ai_no_parent'); return; }
        if (action !== 'reply' && !initial.trim()) { status.textContent = XH.t('ai_no_text'); return; }
        const language = entry.language.value === 'custom' ? (state().settings.aiCustomLanguage || '').trim() : entry.language.value;
        if (!language) {
          status.textContent = XH.t('ai_error_input');
          results.append(button(XH.t('ai_settings'), () => chrome.runtime.sendMessage({ type: 'xh-ai-options' })));
          return;
        }
        if (action === 'translate' && language === 'same') { status.textContent = XH.t('ai_target'); return; }
        const generation = ++entry.generation;
        entry.busy = true;
        try {
          const response = await chrome.runtime.sendMessage({ type: 'xh-ai-generate', input: {
            action, text: clip(initial, 10000), parent: clip(parent?.parent || '', 10000), name: clip(parent?.name || '', 200), handle: parent?.handle || '',
            language, tone: entry.tone.value,
          } });
          if (generation !== entry.generation || !box.isConnected || !state().settings.aiEnabled) return;
          if (response?.error || !response?.candidates) {
            const code = response?.error || 'network';
            status.textContent = XH.t('ai_error_' + code) + (response?.status ? ` (HTTP ${response.status})` : '');
            if (['disabled', 'key', 'config', 'permission'].includes(code)) results.append(button(XH.t('ai_settings'), () => chrome.runtime.sendMessage({ type: 'xh-ai-options' })));
            return;
          }
          status.textContent = XH.t('ai_choose');
          for (const text of response.candidates) {
            const candidate = button(`${text}\n${XH.t('ai_count', { n: XH.ai.count(text) })}`, () => {
              if (!box.isConnected || box.innerText !== initial || location.href !== route || JSON.stringify(parentFor(box)) !== JSON.stringify(parent) || !state().settings.aiEnabled) {
                status.textContent = XH.t('ai_stale'); results.replaceChildren(); return;
              }
              box.focus();
              const selection = window.getSelection();
              selection.removeAllRanges();
              const range = document.createRange();
              if (action !== 'reply') { range.selectNodeContents(box); selection.addRange(range); }
              else if (entry.range && box.contains(entry.range.commonAncestorContainer)) selection.addRange(entry.range);
              else { range.selectNodeContents(box); range.collapse(false); selection.addRange(range); }
              // X's editor must observe a native edit; never assign its DOM or fake an input event.
              if (!document.execCommand('insertText', false, text)) { status.textContent = XH.t('ai_insert_failed'); return; }
              checkDup(box.innerText); close(entry);
            }, 'xh-ai-candidate');
            results.append(candidate);
          }
          results.querySelector('button')?.focus();
        } catch { status.textContent = XH.t('ai_error_network'); }
        finally { entry.busy = false; }
      }
      entry.run = run;
      entries.set(box, entry); return entry;
    }
    function refresh() {
      const s = state()?.settings;
      for (const [box, entry] of entries) if (!box.isConnected || !s?.aiEnabled) { entry.cleanup(); entries.delete(box); }
      if (!s?.aiEnabled) return;
      for (const box of document.querySelectorAll(selectors.editor)) {
        const entry = entries.get(box) || mount(box);
        const signature = JSON.stringify([XH.lang, s.aiLanguage, s.aiTone, s.aiCustomLanguage]);
        if (entry.signature === signature) continue;
        entry.signature = signature;
        close(entry); entry.bar.replaceChildren();
        entry.panel.setAttribute('aria-label', XH.t('ai_candidates')); entry.closeButton.textContent = XH.t('ai_close');
        entry.tone = select(XH.ai.TONES, s.aiTone, XH.t('ai_tone'), v => XH.t('ai_tone_' + v));
        const langs = s.aiCustomLanguage?.trim() ? XH.ai.LANGUAGES : XH.ai.LANGUAGES.filter(v => v !== 'custom');
        entry.language = select(langs, langs.includes(s.aiLanguage) ? s.aiLanguage : 'same', XH.t('ai_language'), XH.ai.languageLabel);
        entry.bar.append(button(XH.t('ai_draft'), () => entry.run('reply'), 'xh-ai-draft'), entry.tone, entry.language);
        const actions = select(XH.ai.ACTIONS.slice(1), 'polish', XH.t('ai_rewrite'), v => XH.t('ai_action_' + v));
        const rewrite = button(XH.t('ai_rewrite'), () => entry.run(actions.value), 'xh-ai-rewrite');
        entry.rewrite = rewrite; rewrite.hidden = !box.innerText.trim();
        entry.bar.append(actions, rewrite);
      }
    }
    document.addEventListener('click', e => {
      if (!e.isTrusted) return;
      const reply = e.target.closest?.(selectors.reply);
      if (reply) { selectedContext = context(reply.closest(selectors.tweet)); contextRoute = location.href; selectedAt = Date.now();
        for (const entry of entries.values()) if (entry.box.closest(selectors.dialog) && entry.box.getClientRects().length) {
          entry.replyContext = selectedContext; entry.contextRoute = contextRoute; selectedContext = null;
        }
      }
    }, true);
    document.addEventListener('keydown', e => {
      if (!e.isTrusted) return;
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest?.('input, textarea, [contenteditable="true"], [role="textbox"]')) {
        selectedContext = context(e.target.closest?.(selectors.tweet)); contextRoute = location.href; selectedAt = Date.now();
        for (const entry of entries.values()) if (entry.box.closest(selectors.dialog) && entry.box.getClientRects().length) {
          entry.replyContext = selectedContext; entry.contextRoute = contextRoute; selectedContext = null;
        }
      }
      if (e.key === 'Escape' && activeEntry?.panel.matches(':popover-open')) { e.stopImmediatePropagation(); close(activeEntry); activeEntry.box.focus(); }
      if (!e.altKey || e.code !== 'KeyG' || !state()?.settings.aiEnabled) return;
      refresh();
      const focused = [...entries.values()].find(entry => entry.box.contains(document.activeElement) || entry.bar.contains(document.activeElement));
      const visible = [...entries.values()].filter(entry => entry.box.getClientRects().length);
      const entry = focused || (visible.length === 1 ? visible[0] : null);
      if (entry) { e.preventDefault(); e.stopPropagation(); entry.run('reply'); }
    }, true);
    return { refresh };
  };
})();
