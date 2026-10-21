# Tasks

## 1. Storage

- [x] 1.1 Add the `keys` part, `keyAccounts` and `quietDays` settings, remove `targets` from DEFAULTS.settings, and VERSION 4 migrate() moving `settings.targets` into `keys`. cleanState validates `keys` and converts `settings.targets` from old exports; cap 1,000. Verify: store tests for the migration, old-export import, invalid keys, the cap; update whole-object expectations.

## 2. On x.com

- [x] 2.1 Highlight and key chip from `keys` (renamed strings) in `annotate()`; star button at the end of the badge (not on own posts), toggling via `store.update(["keys"])`, click stopped from reaching X; honour `keyAccounts`. Update `test/fixtures/timeline.html` only if needed. Verify: e2e steps "star adds and removes a key account on all of its posts", "clicking the star does not open the post or click anything on X", "own posts have no star", "key accounts switch hides star and highlight".
- [x] 2.2 Alt+S on the selected post with a toast; nothing while typing. Verify: e2e step "Alt+S toggles the selected post's author".
- [x] 2.3 Panel keys mode: Alt+K, popup button (message with mode "keys"), sorting, quiet mark and count, both directions' last interaction, empty hint. Verify: e2e step "key accounts panel sorts by silence and marks quiet accounts" with seeded people data via the storage helpers.

## 3. Settings page and popup

- [x] 3.1 Replace the target accounts section with the key accounts list (search, rows with added date and both directions' last interaction, remove at once, paste-to-add with skipped count), the `keyAccounts` switch in the features section and the `quietDays` field. Popup gets the key accounts button. Verify: e2e steps "settings page adds pasted key accounts and reports skipped lines" and "removing a key account from settings takes effect at once".

## 4. Docs and checks

- [x] 4.1 README (Features in English and 中文说明, incl. shortcuts Alt+S and Alt+K) and PRIVACY.md for the `keys` part. Verify: reviewer reads the diff.
- [x] 4.2 Run `npm test` and `CHROMIUM=/usr/bin/chromium npm run e2e`; exit code 0, no `FAIL` lines, the two "never" steps untouched.

## Workflow follow-up

- Jack checks on real X: starring from the timeline, the settings list, the Alt+K panel.
- Archive after Jack confirms.
