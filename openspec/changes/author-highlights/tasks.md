# Tasks

## 1. Check on real X first

- [ ] 1.1 Jack (or Claude with Jack watching) confirms on real X: `from:<handle> min_faves:100 -filter:replies` with `f=top` returns that account's popular original posts; record the profile header markup (test id around the name). Verify: a note in this file with the date and result. If `min_faves` no longer works, stop and report.

## 2. Storage

- [ ] 2.1 Add `topPosts: true` to DEFAULTS.settings. Verify: store tests still pass; an old export without `topPosts` loads with it on.

## 3. On x.com

- [ ] 3.1 Keep follower counts per handle in memory next to `authorFollowers`; pure function `topThreshold(followers)` with the tiers from design.md and unit tests for each boundary and unknown.
- [ ] 3.2 `SEL.profileName`, the top posts button on other people's profiles (once per header, not on the own profile, click stopped from reaching X), a profile fixture in `test/fixtures/`. Verify: e2e steps "profile shows one top posts button", "clicking top posts opens the search in a new tab and clicks nothing on X", "own profile has no top posts button".
- [ ] 3.3 Alt+B: selected post's author, else profile in the URL, else toast; nothing while typing. Verify: e2e steps "Alt+B opens top posts for the selected post's author" and "Alt+B with nothing selected shows a toast".
- [ ] 3.4 `topPosts` switch hides the button and disables Alt+B. Verify: e2e step "top posts switch off hides the button".

## 4. Settings page

- [ ] 4.1 Switch in the features section, both languages. Verify: e2e settings step lists it.

## 5. Docs and checks

- [ ] 5.1 README (Features in English and 中文说明, shortcut Alt+B) and the shortcuts in `docs/release-template.md`. No PRIVACY.md change (nothing new is stored beyond one setting). Verify: reviewer reads the diff.
- [ ] 5.2 Run `npm test` and `CHROMIUM=/usr/bin/chromium npm run e2e`; exit code 0, no `FAIL` lines, the "never clicks anything by itself" step untouched.

## Workflow follow-up

- Jack checks on real X: the button on a few profiles of different sizes, whether the thresholds feel right.
- Archive after Jack confirms.
