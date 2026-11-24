(function () {
  const XH = globalThis.XH, ai = XH.ai, $ = id => document.getElementById(id);
  const fields = ['aiProvider', 'aiBase', 'aiModel', 'aiLanguage', 'aiCustomLanguage', 'aiTone', 'aiExamples', 'aiEnabled'];
  let currentBase = '', busy = false;
  const status = text => { $('aiStatus').textContent = text; };
  function options(id, values, label) {
    const select = $(id), value = select.value;
    select.replaceChildren(...values.map(v => { const o = document.createElement('option'); o.value = v; o.textContent = label(v); return o; }));
    select.value = value;
  }
  function translate() {
    options('aiProvider', Object.keys(ai.PRESETS), v => v === 'custom' ? XH.t('ai_lang_custom') : ai.PRESETS[v].name);
    options('aiLanguage', ai.LANGUAGES, ai.languageLabel);
    options('aiTone', ai.TONES, v => XH.t('ai_tone_' + v));
  }
  function dependencies() {
    $('aiBase').readOnly = $('aiProvider').value !== 'custom';
    $('aiKey').disabled = $('aiProvider').value === 'ollama';
    $('aiCustomLanguage').disabled = $('aiLanguage').value !== 'custom';
  }
  async function load() {
    translate();
    const s = (await XH.store.get()).settings;
    for (const key of fields) $(key)[$(key).type === 'checkbox' ? 'checked' : 'value'] = s[key];
    currentBase = s.aiBase;
    const saved = (await chrome.storage.local.get('xh:aiKey'))['xh:aiKey'];
    $('aiKey').value = saved?.base === currentBase ? saved.key : '';
    dependencies();
  }
  $('aiProvider').addEventListener('change', () => {
    const preset = ai.PRESETS[$('aiProvider').value];
    $('aiBase').value = preset.base; $('aiModel').value = preset.model;
    $('aiKey').value = ''; $('aiEnabled').checked = false; dependencies();
  });
  $('aiBase').addEventListener('input', () => {
    if ($('aiBase').value !== currentBase) { $('aiKey').value = ''; $('aiEnabled').checked = false; }
  });
  $('aiLanguage').addEventListener('change', dependencies);
  $('aiSave').addEventListener('click', async () => {
    if (busy) return;
    busy = true; $('aiSave').disabled = true; $('aiTest').disabled = true;
    try {
      const patch = Object.fromEntries(fields.map(k => [k, $(k).type === 'checkbox' ? $(k).checked : $(k).value.trim()]));
      const c = ai.config(patch), key = $('aiKey').value.trim();
      if (patch.aiEnabled && c.provider !== 'ollama' && !key) throw new Error('key');
      if (patch.aiLanguage === 'custom' && (!patch.aiCustomLanguage || patch.aiCustomLanguage.length > 80)) throw new Error('input');
      if (key.length > 4096 || /[\r\n]/.test(key)) throw new Error('key');
      // Must be called directly in this user gesture, before any storage await.
      if (patch.aiEnabled && !await chrome.permissions.request({ origins: [c.permission] })) throw new Error('permission');
      await XH.store.update(['settings'], s => { s.settings.aiEnabled = false; });
      await chrome.storage.local.set({ 'xh:aiKey': { base: c.base, key: c.provider === 'ollama' ? '' : key } });
      patch.aiBase = c.base;
      await XH.store.update(['settings'], s => Object.assign(s.settings, patch));
      currentBase = c.base; status(XH.t('ai_saved'));
    } catch (e) {
      // A malformed unsaved endpoint must never prevent turning the existing configuration off.
      if (!$('aiEnabled').checked) await XH.store.update(['settings'], s => { s.settings.aiEnabled = false; });
      status(XH.t('ai_error_' + (['key', 'permission', 'input', 'config'].includes(e.message) ? e.message : 'config'))); }
    finally { busy = false; $('aiSave').disabled = false; $('aiTest').disabled = false; }
  });
  $('aiTest').addEventListener('click', async () => {
    $('aiTest').disabled = true; status(XH.t('ai_loading'));
    try {
      const result = await chrome.runtime.sendMessage({ type: 'xh-ai-test' });
      status(result.error ? XH.t('ai_error_' + result.error) + (result.status ? ` (HTTP ${result.status})` : '') : XH.t('ai_success'));
    } catch { status(XH.t('ai_error_network')); }
    finally { $('aiTest').disabled = false; }
  });
  // Existing options load/import/reset drives this event after language and store refresh.
  document.addEventListener('xh-options-loaded', load);
  document.addEventListener('xh-lang-changed', translate);
  load();
})();
