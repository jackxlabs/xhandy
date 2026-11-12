# Proposal

## Why

A code audit on 2026-11-12 (all of `src/`, the hq code-health signals, unit tests and e2e) found a few small
defects and stale documents. None breaks a project rule, but each is cheap to fix now and gets more
expensive as v0.6 and v0.7 add code on top.

## What Changes

- **Imported number settings stay in range.** The allowed range of each number setting lives only in the
  settings page (`RANGE_TABLE` in `src/options/options.js`), so an import file can bring in values such as
  `staleHours: -5`. The ranges move next to `DEFAULTS` in `src/lib/store.js`
  (`store.SETTING_RANGES`), the settings page reads them from there, and import clamps to them.
  Settings already in storage are read as before (no clamping on read).
- **A failed migration is retried.** `migrate()` remembers its promise even when it rejected, so one
  storage error makes every later read and write on that page fail until reload. A rejected run is
  forgotten and the next call tries again.
- **Stale documents.** `CLAUDE.md` and `openspec/config.yaml` say the storage version is 4 and leave out
  `xh:notes`; the version is 5 and notes exist. `openspec/config.yaml` names `XH.kNum`, which is now
  `XH.compact`.
- **Unused interface strings** removed from `src/locales/en.js` and `src/locales/zh.js` after checking
  that nothing builds their keys at run time.
- **Tidying with no behaviour change**: indentation of `parseTime` / `collectInbound` in
  `src/page-hook.js`; `src/popup/popup.js` declares `XH` instead of relying on the global.

## Out of Scope

- Keyboard shortcuts while typing (Alt+U / Alt+K / Alt+H): needs a check on macOS first.
- Removing duplicated code in `content.js`, `options.js`, `popup.js` (separate refactor change).
- How often `xh:rel` is written, and the three JSON walks in `page-hook.js` (separate change, measure first).
- Splitting files, a background service worker, CI.

## Project Rules

- Acting for the user: nothing here touches X's page or input.
- Network: no requests added.
- Storage: no new part and no change to what is stored; `VERSION` stays 5. Old exports still import;
  only out-of-range number settings in an import file are pulled into range.

## Impact

- `src/lib/store.js`, `src/options/options.js`, `src/popup/popup.js`, `src/page-hook.js`
- `src/locales/en.js`, `src/locales/zh.js`
- `test/store.test.js`
- `CLAUDE.md`, `openspec/config.yaml`
