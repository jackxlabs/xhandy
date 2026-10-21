# Proposal

## Why

The settings page shows every label and hint as "English / 中文" side by side, and the rest of the UI
follows the browser language with no way to change it. That reads poorly in the store screenshots,
does not scale to a third language, and leaves a Chinese speaker on an English browser with English
hints. Every upcoming feature adds strings, so this is cheapest to fix now, before the store listing.

## What Changes

- A language setting at the top of the settings page: Auto (follow the browser, the default),
  English, 中文. It applies at once to the settings page, the toolbar popup and the hints on x.com,
  without reloading X.
- The settings page shows one language at a time; all of its text comes from the translation files.
- One file per language (`src/locales/en.js`, `src/locales/zh.js`) with a list of supported languages,
  so adding a language means adding one file and one line. A missing string falls back to English.
- A unit test that checks every language has the same keys and placeholders as English.

Out of scope:
- New languages (Japanese, Traditional Chinese, ...). Only the structure for them.
- The store name and description in `_locales/` (Chrome's own mechanism; it follows the browser
  language and cannot follow a user setting). They stay as they are.
- README and PRIVACY.md translations.

How the rules are kept:
- Never acting for the user: unaffected; this only changes text.
- Network: none added; translations ship inside the extension.
- Storage: one new setting `lang` with a default, no migration; old exports still import.

## Capabilities

### New Capabilities
- `ui-language`: choosing the interface language, where it applies, and how translations are organised
  and checked.

### Modified Capabilities

## Impact

- New `src/locales/en.js`, `src/locales/zh.js`; `src/lib/i18n.js` keeps the helpers (t, compact, kNum,
  replyChip, ago) and gains language switching.
- `manifest.json` (content script list), `src/options/options.html` and `options.js`, `src/popup/popup.html`
  and `popup.js`, `src/content.js` (apply the setting, re-render on change), `src/lib/store.js` (setting).
- Tests: `test/store.test.js` (i18n tests move to `test/i18n.test.js`), `test/e2e.mjs`.
- README (en, zh): the language setting.
