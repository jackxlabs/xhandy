# Design

## Context

- `src/lib/i18n.js` holds both dictionaries inline and fixes `lang` once at load from
  `navigator.language` (`zh*` → zh, else en). `XH.t`, `XH.compact` (万/亿 in zh), `XH.ago` read it.
- Loaded by: content scripts (manifest, before store.js and content.js), popup.html, options.html.
  The popup already uses `XH.t`; it has one inline `XH.lang === "zh"` string and a few static English
  words in popup.html. The settings page has about 45 hard-coded "English / 中文" strings in
  options.html and options.js (labels, hints, headings, status and import/clear messages).
- Settings are read asynchronously (`store.get()`), so the chosen language is only known after load.
- content.js re-renders badges, HUD and panel in `store.onChange`; badges and HUD skip work when their
  text key is unchanged, so a language change re-renders them naturally once strings differ.

## Goals / Non-Goals

**Goals:**
- A runtime language switch that every UI surface honours.
- Adding a language = one locale file + one entry in the supported list + passing the completeness test.

**Non-Goals:**
- A build step or JSON loading via fetch; plain script files keep the no-build rule and work in content
  scripts.
- Using chrome.i18n for UI strings: it follows the browser language only.

## Decisions

- **Locale files**: `src/locales/en.js` and `src/locales/zh.js`, each doing
  `(globalThis.XH = globalThis.XH || {}).locales = {...XH.locales, en: { ... }}` (or equivalent
  assignment). They load before `src/lib/i18n.js` everywhere i18n.js loads (manifest content script
  list, popup.html, options.html, and the unit-test loader).
- **Supported list**: in i18n.js, `XH.LANGS = [{ code: "en", name: "English" }, { code: "zh", name: "中文" }]`.
  The settings page builds its select from it.
- **API**: `XH.resolveLang(setting, browserLang)` returns a supported code ("auto" or unknown → from
  browserLang). `XH.setLang(code)` sets the current language; `XH.lang` reflects it. `XH.t` looks up
  current, then en, then the key. `XH.compact` and others read the current language at call time.
  At load, i18n.js sets the language from the browser (Auto) so nothing renders untranslated before
  settings arrive.
- **Setting**: `settings.lang: "auto"` in DEFAULTS. cleanSettings already type-checks strings; unknown
  codes are handled by resolveLang, so no extra validation and no migration.
- **Content script**: after the first `store.get()` and in every `onChange`, call
  `XH.setLang(XH.resolveLang(S.settings.lang, navigator.language))` before rendering. Re-rendering is
  already done in onChange; the HUD and badge keys include the text, so they refresh. The panel
  re-renders through renderPanel.
- **Settings page markup**: elements carry `data-i18n="key"` (textContent) or `data-i18n-ph` where
  needed; options.js has `applyI18n()` that fills them and sets `document.documentElement.lang`
  (`zh-CN` or `en`). Labels that wrap a checkbox keep the input and put the text in a `<span data-i18n>`.
  Option-page keys use an `opt_` prefix to keep them apart from x.com strings. Dynamic messages
  (relStatus, Saved, import/clear results) also go through XH.t.
- **Language select**: a `<select id="lang">` in its own first section. On `change` it runs
  `store.update(["settings"], s => { s.settings.lang = value })`, then `XH.setLang` and `applyI18n()`.
  It does not read or save other fields.
- **Popup**: static words in popup.html get `data-i18n`; popup.js resolves the language from settings
  (it already loads them) before rendering, and the inline `XH.lang === "zh"` string becomes a key.
- **Tests**: i18n unit tests move from test/store.test.js into `test/i18n.test.js`, loading the locale
  files then i18n.js in a vm context with a given navigator. The completeness test compares key sets
  and the set of `{name}` placeholders per key against English for every entry in XH.LANGS.

## Risks / Trade-offs

- [The first frame on x.com renders in the browser language, then switches once settings load] →
  content.js loads settings before its first render already; if a flash shows up in practice, the
  first render waits for settings.
- [A string is missed and stays hard-coded] → e2e step opens the settings page in English and checks
  that no CJK characters appear except the 中文 option, and the reverse check for Chinese finds no
  "English / 中文" pairs.
- [Moving 45 strings by hand introduces typos] → the reviewer compares the rendered page in both
  languages with the old one.

## Migration Plan

No data migration: `lang` defaults to "auto", which matches today's behaviour. Rollback: older
versions ignore the key.
