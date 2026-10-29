# Tasks

## 0. Check Real X First

- [ ] 0.1 On real X, with page-hook logging temporarily enabled, look at `relationship_perspectives` for an account you follow that does not follow you back: is `followed_by: false` sent explicitly, or is the key left out? Write the answer into `design.md` (decision 5, open question) before starting 2.1; if X omits it, revise case 2 there first.

## 1. Three-State Relation Flags and Data Model

- [ ] 1.1 In `src/page-hook.js` `collectRelations`, pass `following` / `followedBy` through only when they are booleans and leave the key out otherwise (no more `!!`); add tests in `test/relations.test.js` for explicit `true`, explicit `false`, and omitted; verify with `npm test`.
- [ ] 1.2 In `src/lib/store.js` `cleanRelations`, keep `following` / `followedBy` only when they are booleans (no more `=== true` coercion); add tests in `test/store.test.js`; verify with `npm test`.
- [ ] 1.3 Extend `cleanRelEntry` in `src/lib/store.js` to sanitize optional `mAt`, `lostAt`, and `ackAt` timestamps (non-negative integers); verify with `npm test`.
- [ ] 1.4 Add unit tests in `test/store.test.js` covering `cleanRelEntry` with `mAt`, `lostAt`, and `ackAt`, ensuring backward compatibility for older entries and for `replaceAll` imports of older exports; verify with `npm test`.

## 2. Baseline Tracking and Passive Detection

- [ ] 2.1 Update the `xh-relations` event handler in `src/content.js` to perform diff tracking against `S.rel`: an omitted flag keeps the stored `f` / `fb`; establish `mAt` when mutual, set `lostAt` when a mutual drops `followedBy` (explicit `false` only), and clear them when mutual status is restored. Keep the transition logic in a pure function so it can be unit-tested; verify with `npm test`.
- [ ] 2.2 Add test cases in `test/relations.test.js` verifying state transitions: establishing baseline, detecting drop, ignoring non-mutuals, ignoring user-initiated unfollows, and ignoring omitted `followedBy` / `following`; verify with `npm test`.

## 3. UI Presentation in Not Following Back Panel

- [ ] 3.1 Add localization strings in `src/locales/en.js` and `src/locales/zh.js` for recent unfollows section header, time detected, and dismiss button tooltip; verify with `npm test`.
- [ ] 3.2 Update `renderNfbPanel` in `src/content.js` and styling in `src/content.css` to render the "Recent unfollows" section at the top with handle, name, relative time, and dismiss button; verify by inspecting the panel on the fake timeline in `test/fixtures/`.
- [ ] 3.3 Add an end-to-end test in `test/e2e.mjs` verifying that an unacknowledged unfollow appears in the panel and disappears from the recent section upon clicking dismiss; verify with `CHROMIUM=/usr/bin/chromium npm run e2e`.

## 4. Documentation

- [ ] 4.1 Update README.md (English and Chinese sections) and `PRIVACY.md` to describe the baseline mutual tracking and local unfollow timestamps in `xh:rel`; verify with manual review.
