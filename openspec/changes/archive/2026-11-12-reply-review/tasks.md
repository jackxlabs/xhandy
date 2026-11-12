# Tasks

## 1. Read the fields

- [x] 1.1 Extend `collectPosts(root, me)` in `src/page-hook.js` with `likes`, `at`, `to`, and `text` (own posts only, displayed range, entities decoded, 80 characters), and pass `me` from `emit`. Verify: unit tests in `test/` with invented fixtures for: likes and time read; missing `favorite_count` leaves `likes` absent; `text` present only on the post authored by `me` (matched by handle and by id) and absent when `me` is null; note-tweet text preferred; existing `collectPosts` / `collectViews` tests still pass.
- [x] 1.2 Add `id` and `at` to `collectCreated`'s result. Verify: unit tests for a reply and a post (id and time present), and that the failure and `shape: "unknown"` results are unchanged; update existing whole-object assertions.

## 2. Store

- [x] 2.1 Add `mine: {}` to `DEFAULTS`, `MAX_MINE = 2000`, `cleanMine`, the trim helper, and `review: true` to `DEFAULTS.settings` in `src/lib/store.js`. Verify: unit tests that a state without `xh:mine` loads as `{}` with `VERSION` still 5; that `cleanMine` drops bad ids, bad handles, negative or non-finite numbers and over-long text is cut to 80; that unknown stats stay absent; that trimming keeps the 2,000 newest by `t`; that `store.update(["mine"], fn)` touching another part throws as today.
- [x] 2.2 Keep `days[date].followers` through the days cleaner when it is a non-negative integer and leave it absent otherwise. Verify: unit tests for export → `replaceAll` round trip with and without the field, an invalid value dropped (not 0), and a pre-change export importing unchanged.
- [x] 2.3 Update README "Privacy" (English and 中文说明) and `PRIVACY.md` with what `xh:mine` and the daily follower count hold and their limits. Verify: reread both files against decision 2 of design.md.

## 3. Review functions

- [x] 3.1 Create `src/lib/review.js` with `median`, `groups`, `topReplies`, `week`, `growth` as in design.md decision 4, and add it to `manifest.json` before `src/content.js` (`scripts/pack.sh` packs all of `src/`, so it needs no change). Verify: unit tests covering every scenario in `specs/reply-review/spec.md` "What gets seen" and `specs/growth-record/spec.md` "Growth shown in the Review view" (clear difference, too few, fresh replies, no clear difference, negative delay ignored, gaps, one snapshot).

## 4. Recording on x.com

- [x] 4.1 In `src/content.js`, add the `postTimes` memory map and record own posts from create confirmations and from responses as in design.md decision 3, batched to one `store.update(["mine"], …)` per 10 seconds and skipped when nothing changed. Verify: e2e steps on the fake timeline (extend `test/fixtures/` responses with invented data): sending a reply creates a record with `to`, `pt`, `pf`, `ph`; a later response with views and likes updates `v`, `l`, `u` and leaves context untouched; an own reply never seen being sent gets a record without `ph`; posts by others create nothing; with `review` off nothing is written.
- [x] 4.2 Store today's follower count in `days` when X sends the signed-in account's count, only when it differs from the stored value. Verify: e2e step that a response carrying the user's follower count sets `days[today].followers`, a second response replaces it, and with `review` off it is not set.

## 5. Review view

- [x] 5.1 Add the `review` panel mode with summary, groups, top replies, last-updated line, Replies-tab link and empty state; add `Alt+R`; add locale keys to `src/locales/en.js` and `src/locales/zh.js`; styles in `src/content.css` for both theme groups. Verify: e2e steps that seed `mine` with `setStoredPart` and check: Alt+R opens and closes the view and does nothing while typing in the composer; a group with 3 replies shows "not enough replies yet"; the best group is marked in the seeded clear-difference case; top replies are in order and link to `/<handle>/status/<id>`; the empty state shows with no records; the existing steps "extension never clicks anything by itself" and "extension never fakes mouse or pointer events" still pass unchanged.
- [x] 5.2 Add the growth figures and the SVG chart to the view. Verify: e2e step seeding `days` with snapshots and a gap: the 7-day change text is correct, the line is split at the gap, and with one snapshot the "after a few days" text shows instead of a figure.
- [x] 5.3 Add the popup row (hidden when the switch is off) and the `review` switch in the General section of the settings page, wired like `topPosts`; closing an open Review view when the switch turns off. Verify: e2e steps that the row opens the view in the active X tab, that turning the switch off hides the row, closes the view and makes Alt+R do nothing, and that the switch autosaves.
- [x] 5.4 Update the README feature list and shortcut table (English and 中文说明) and `docs/release-template.md` with the Review view and `Alt+R`. Verify: reread the three places; `npm test` and `CHROMIUM=/usr/bin/chromium npm run e2e` pass, with counts in the report.

## 6. Checks on real X

- [x] 6.1 Manual check by Jack on real X: send two replies, open the own Replies tab and scroll; compare views and likes of five replies in the Review view with what X shows; confirm the follower count matches the profile; confirm Alt+R does not interfere with typing on macOS; click the Review row in the toolbar popup and see the view open in the X tab (not covered by e2e); light, Dim and Lights out. Record the result in the review report.

Result 2026-11-12 (Jack, real X): the Review view opens and nothing looked wrong. Not checked yet: Alt+R while typing on macOS (carried to HANDOFF.md with the other Option-key shortcuts).
