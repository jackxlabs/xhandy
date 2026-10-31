## Why

Xhandy already counts interactions in both directions (what the user gave an author, and what the author gave
back), but the numbers only show in a small chip next to the author's name. To spot the people you really talk
with, you have to read every chip. A tint on the whole post makes two-way relationships stand out while scrolling,
without reading anything.

## What Changes

- Posts by authors the user has a two-way interaction history with get a light violet background tint.
- The tint depends only on the interaction both sides share: the smaller of "you gave them" and "they gave you".
  One-sided interaction (liking someone who never answers) gives no tint.
- The tint deepens with the count on a logarithmic curve, so the first few interactions show clearly and large
  counts do not all look the same as the maximum. The deepest tint stays light enough to keep text readable.
- The tint fades with time since the last interaction in either direction (halves every N days), and disappears
  when it gets too faint.
- The tint shows on its own while scrolling; no hover or click is needed.
- New settings in the "Post marks" section: an on/off switch (on by default, like every feature switch), the count
  that gives the deepest tint (default 20), and the fade half-life in days (default 30).
- Works alongside the existing marks: the key-account and selected-post blue edge stays, and the heat chip keeps
  orange and red. The user's own posts are never tinted.

## Capabilities

### New Capabilities
- `interaction-tint`: background tint of posts by two-way interaction strength with the author, its fading over
  time, and its settings.

### Modified Capabilities
<!-- None. The switch is specified inside the new capability, so the feature-settings delta in the unarchived
ui-refresh change is not touched. -->

## Out of scope

- Storing a timestamp per interaction. Fading uses the existing "last interaction" time of each direction.
- Any opaque "influence" or relationship score shown as a number. The tint is derived only from the counts the
  interaction chip already shows.
- Tinting in the "Not following you back" or key-account panels, the toolbar popup, or profile pages.
- Sorting, filtering or hiding posts by interaction strength.
- Choosing the tint colour in settings.

## How the rules are kept

- **Never acts for the user**: the tint only changes how a post looks. Nothing is clicked, typed or sent.
- **Offline**: no network request is added. The tint is computed in the content script from data already stored.
- **Storage**: no new data is recorded; only three settings are added to `xh:settings`, with defaults, so no
  migration is needed and old exports still import. README "Privacy" and PRIVACY.md need no change beyond the
  feature list, since nothing new is stored about other people.
- **Not bot-like**: the tint does not make any action faster or batch anything.

## Impact

- `src/content.js` (`annotate`), `src/content.css` (tint classes, both theme groups).
- `src/lib/store.js` (setting defaults and validation of the two numbers), plus a pure scoring function with
  unit tests.
- `src/options/options.html`, `src/options/options.js`, `src/locales/en.js`, `src/locales/zh.js`.
- `README.md` feature list (English and 中文说明).
- `test/store.test.js` or a new unit test file, `test/e2e.mjs`.
