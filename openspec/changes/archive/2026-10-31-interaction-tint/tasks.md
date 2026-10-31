## 1. Score

- [x] 1.1 Add `showTint: true`, `tintFull: 20`, `tintHalfLife: 30` to `DEFAULTS.settings` in `src/lib/store.js`. Verify: unit test that `cleanSettings({})` returns these defaults and that a pre-change export (no tint keys) imports through `replaceAll` with defaults filled and other parts unchanged.
- [x] 1.2 Add the pure `tintLevel(person, settings, now)` function (steps 0–8, per design.md) next to `quietKeys` and export it. Verify: unit tests for one-sided (0), no entry (0), shared 1/3/10/20/80 today with defaults (2/4/6/8/8), same count today vs 60 days ago (today deeper), shared 1 after 120 days (0), out-of-range or non-number settings clamped, missing `in` (0).

## 2. Posts on x.com

- [x] 2.1 In `annotate` (`src/content.js`), compute the step for non-own posts when `showTint` is on and set the attribute `data-xh-tint="N"` (an attribute because X rewrites the class on hover); do it before the "no chips" early return. Verify: e2e step that seeds `people` with `setStoredPart` (one two-way author, one one-sided author, one old author) and checks the classes on their fake posts, and that the user's own post has none.
- [x] 2.2 Add the tint rules to `src/content.css` (gradient layer over X's background, 4%–16% of `--xh-accent`, dim/dark overrides if needed). Verify: e2e step that a tinted key-account post keeps the blue `box-shadow` edge and has a non-empty `background-image`.
- [x] 2.3 Live updates. Verify: e2e step that changes `people` for a shown author with `setStoredPart` and sees the step change without reload, and that turning `showTint` off with `updateSettings` removes all tint classes.

## 3. Settings page

- [x] 3.1 Add the switch and the two number fields to `#sec-badges` in `src/options/options.html`, wire them in `src/options/options.js` (settings list, ranges `tintFull` 2–500 and `tintHalfLife` 1–365 as integers, disabled while the switch is off), and add labels to `src/locales/en.js` and `src/locales/zh.js`. Verify: e2e step that the fields autosave, that 0 in "deepest at" is pulled to 2 and an empty field shows the error and keeps the stored value, and that the numbers are disabled with the switch off.

## 4. Docs and checks

- [x] 4.1 Update the README feature list (English) and 中文说明 with the tint, including that inbound counts only include what X showed in this browser; add "interaction tint" to the feature-switches list. Verify: reread both sections; `npm test` and `CHROMIUM=/usr/bin/chromium npm run e2e` pass with counts recorded in the report.
- [x] 4.2 Manual check on real X (light, Dim, Lights out): tint visible but text readable at step 8, faint but visible at step 1, still visible on hover, not confused with X's own highlights, blue edge visible on key accounts. Adjust the percentages in `content.css` if needed and record the result in the review report.
