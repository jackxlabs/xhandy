# Tasks

## 1. Storage

- [x] 1.1 Add `showAge`, `showSeen`, `dupWarn`, `followWarn` (true) and `followPace` (10), `unfollowPace` (10), `paceMinutes` (60) to `DEFAULTS.settings` in `src/lib/store.js`. Verify: a store test shows old v3 settings without these keys load with the defaults.
- [x] 1.2 Add the `pace` part (`{ follows: [], unfollows: [] }`) to DEFAULTS and validate it in cleanState (non-negative numbers only, newest 100 kept). Export a small `store.prunePace(list, now)` helper that drops times older than 24 h and keeps the newest 100. Verify: store tests for cleanState with bad pace data, for prunePace, and update any whole-object expectations in `test/store.test.js`.

## 2. Badges and duplicate warning

- [x] 2.1 In `annotate()`, skip the age chip when `showAge` is off, and remove an existing badge (adding none) when no chips are left. Verify: e2e step "age chip switch hides the age chip and empty badges are removed".
- [x] 2.2 In `annotate()`, show the interaction chip only when `showSeen` is on; showInbound only picks the two-direction form. Verify: e2e step "interaction chip switch hides both forms".
- [x] 2.3 In `checkDup()`, hide and skip the warning when `dupWarn` is off; sends are still recorded. Verify: e2e step "duplicate warning switch turns the warning off" (pause 1.6 s between identical sends).

## 3. Follow reminders

- [x] 3.1 Record follow and unfollow times in `onFriendship()` with `store.update(["days", "rel", "pace"], ...)` using prunePace. Verify: e2e step "follow times are stored and bounded" via storedPart.
- [x] 3.2 Add the pace toast (`follow_pace`, `unfollow_pace` in `src/lib/i18n.js`, zh and en, with the 60-minute wording from design.md) and the toast priority daily limit > pace > ordinary; with `followWarn` off show only the ordinary toast. Verify: e2e steps "11th follow within the window shows the pace toast", "daily limit toast wins over pace", "reminders off shows only the ordinary toast".
- [x] 3.3 HUD follow count is "warn" when followWarn is on and the daily limit or the pace is passed. Verify: e2e step checks the orange state for pace and its absence with followWarn off.

## 4. Settings page

- [x] 4.1 Add the "Features / 功能开关" section first in `src/options/options.html` with all switches (move the existing checkboxes, keep their ids), new switches with bilingual labels, showHeat indented under showAge and showInbound under showSeen, disabled while the parent is unchecked. Add `followPace`, `unfollowPace`, `paceMinutes` number fields (paceMinutes min 5, max 1440) in the follow relationship section. Wire everything in `options.js`. Verify: e2e step "settings page shows the switches section first and saves new switches".

## 5. Docs and checks

- [x] 5.1 Update README (Features list in English and the 中文说明 section) and PRIVACY.md for the switches and the stored follow times. Verify: reviewer reads the diff.
- [x] 5.2 Run `npm test` and `CHROMIUM=/usr/bin/chromium npm run e2e`; both pass, including "extension never clicks anything by itself" and "extension never fakes mouse or pointer events", untouched.

## Workflow follow-up

- Jack checks on real X: switches on the settings page, the pace toast after quick follows.
- Archive the change after Jack confirms.
