# Tasks

## 1. Check on real X first

- [x] 1.1 Jack (or Claude with Jack watching) confirms on real X: `from:<handle> min_faves:100 -filter:replies` with `f=top` returns that account's popular original posts; record the profile header markup (test id around the name). Verify: a note in this file with the date and result. If `min_faves` no longer works, stop and report.
  - 2026-10-28, Jack: `from:elonmusk min_faves:1000 -filter:replies` with `f=top` returns popular original posts, no replies (order is X's Top ranking, not strictly by likes). Profile header test id not read directly (the click hit an overlay); using `[data-testid="UserName"]` outside any `article`, which is X's profile header name block as far as we know. Recheck on real X during the follow-up.

## 2. Storage

- [x] 2.1 Add `topPosts: true` to DEFAULTS.settings. Verify: store tests still pass; an old export without `topPosts` loads with it on.

## 3. On x.com

- [x] 3.1 Keep follower counts per handle in memory next to `authorFollowers`; pure function `topThreshold(followers)` with the tiers from design.md and unit tests for each boundary and unknown.
- [x] 3.2 `SEL.profileName`, the top posts button on other people's profiles (once per header, not on the own profile, click stopped from reaching X), a profile fixture in `test/fixtures/`. Verify: e2e steps "profile shows one top posts button", "clicking top posts navigates to search in current tab and clicks nothing on X", "own profile has no top posts button".
- [x] 3.3 Alt+B: selected post's author, else profile in the URL, else toast; nothing while typing. Verify: e2e steps "Alt+B opens top posts for the selected post's author" and "Alt+B with nothing selected shows a toast".
- [x] 3.4 `topPosts` switch hides the button and disables Alt+B. Verify: e2e step "top posts switch off hides the button".

## 4. Settings page

- [x] 4.1 Switch in the features section, both languages. Verify: e2e settings step lists it.

## 5. Docs and checks

- [x] 5.1 README (Features in English and 中文说明, shortcut Alt+B) and the shortcuts in `docs/release-template.md`. No PRIVACY.md change (nothing new is stored beyond one setting). Verify: reviewer reads the diff.
- [x] 5.2 Run `npm test` and `CHROMIUM=/usr/bin/chromium npm run e2e`; exit code 0, no `FAIL` lines, the "never clicks anything by itself" step untouched.

## Workflow follow-up

- Jack checks on real X: the button on a few profiles of different sizes, whether the thresholds feel right.
- Archive after Jack confirms.
