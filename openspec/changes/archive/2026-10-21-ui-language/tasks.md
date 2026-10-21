# Tasks

## 1. Locale files and language switching

- [x] 1.1 Move the en and zh dictionaries from `src/lib/i18n.js` into `src/locales/en.js` and `src/locales/zh.js`; add `XH.LANGS`, `XH.resolveLang`, `XH.setLang` and read the current language at call time in `t`, `compact`, `ago`. Load the locale files before i18n.js in `manifest.json`, `src/popup/popup.html` and `src/options/options.html`. Verify: existing i18n assertions pass after moving them to `test/i18n.test.js`.
- [x] 1.2 Add `test/i18n.test.js` cases: resolveLang (auto with zh-TW, de-DE; unknown code; explicit en/zh), setLang switching changes t() and compact() output, English fallback for a missing key, and the completeness check (keys and {placeholders} per language against English). Verify: npm test.

## 2. Setting and x.com

- [x] 2.1 Add `lang: "auto"` to `DEFAULTS.settings` in `src/lib/store.js`. In `src/content.js`, apply `XH.setLang(XH.resolveLang(...))` after the first load and in every onChange before rendering. Verify: e2e step "switching language in storage turns x.com badges and stats bar to the other language without reload".

## 3. Settings page and popup

- [x] 3.1 Rewrite `src/options/options.html` text as `data-i18n` keys (prefix `opt_`) and add them to both locale files; `options.js` gets `applyI18n()`, sets `<html lang>`, and routes dynamic messages through XH.t. Verify: e2e step "settings page in English shows no Chinese apart from the 中文 option" and "settings page in Chinese shows no 'English / 中文' pairs".
- [x] 3.2 Add the language section first on the settings page with `<select id="lang">` built from XH.LANGS plus Auto; changing it saves only `lang` at once and re-renders the page. Verify: e2e step "picking a language saves at once and keeps unsaved fields".
- [x] 3.3 Popup: static words via data-i18n, language resolved from settings before rendering, the inline zh/en string becomes a key. Verify: e2e step "popup follows the chosen language".

## 4. Docs and checks

- [x] 4.1 README (Features in English and the 中文说明 settings list): the language setting. Verify: reviewer reads the diff.
- [x] 4.2 Run `npm test` and `CHROMIUM=/usr/bin/chromium npm run e2e`; both pass, with the two "never" e2e steps untouched.

## Workflow follow-up

- Jack checks the settings page and x.com in both languages on real X.
- Archive after Jack confirms.
