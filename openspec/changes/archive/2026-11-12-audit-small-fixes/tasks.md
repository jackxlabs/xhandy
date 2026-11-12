# Tasks

## 1. Settings ranges

- [x] 1.1 Add `SETTING_RANGES` next to `DEFAULTS` in `src/lib/store.js` (same values as `RANGE_TABLE`), export it, and make `cleanState` clamp and round number settings to it; reads of stored settings stay unclamped. Unit tests: below range, above range, in range, whole-number rounding, stored out-of-range value read unchanged. Verify with `npm test`.
- [x] 1.2 `src/options/options.js` reads `store.SETTING_RANGES`; delete `RANGE_TABLE`. Verify with the settings e2e steps.

## 2. Migration retry

- [x] 2.1 `migrate()` forgets a rejected run so the next call retries. Unit test: first `storage.local.get` throws, second `store.get()` succeeds. Verify with `npm test`.

## 3. Documents and strings

- [x] 3.1 `CLAUDE.md` and `openspec/config.yaml`: version 5, add `xh:notes`, `XH.kNum` -> `XH.compact`. Verify by reading `PARTS` and `VERSION` in `src/lib/store.js`.
- [x] 3.2 Remove interface strings no code or page refers to, in both locale files. Verify with `npm test` (key parity test) and the e2e language steps.

## 4. Tidying

- [x] 4.1 Fix indentation of `parseTime` / `collectInbound` in `src/page-hook.js`; declare `XH` in `src/popup/popup.js`. Verify with `npm test` and e2e.
