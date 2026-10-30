# Proposal

## Why

Xhandy's interface looks dated next to X: a cyan-violet-pink gradient edge on every surface, many competing
chip colours, monospace numbers, emoji and text glyphs as icons, a popup that is a 7-row table of mostly
zeros, and a settings page that is one long column of ~25 fields with a Save button in the middle. The
Chrome Web Store listing is next and its screenshots show this UI, so the refresh has to land before the
screenshots are taken.

## What Changes

- **Visual system** for everything Xhandy draws (post badges, toasts, stats bar, panels, popup, settings):
  X's neutral greys for surfaces, text and borders; colour only where it carries meaning (green = mutual,
  orange = heat, violet = about "me": the user's numbers, replied, key accounts, selection); the brand
  gradient removed from UI chrome (kept for the icon and promo images, as `brand/brand.yaml` already
  says); proportional font with tabular figures instead of monospace; one set of inline stroke SVG icons
  replacing ☆/★, 🔥 and 📝; toasts without the coloured left bar. Light and dark.
- **Stats bar**: default position bottom-right instead of bottom-centre (it covered the reply box), and the
  user can drag it anywhere in the window. The position is remembered, kept inside the window when it is
  resized, and can be reset in settings.
- **Toolbar popup**: today's five numbers on top, a 7-day replies bar chart, then list rows for Key accounts
  (with the quiet count and Alt+K) and Not following back (with the count and Alt+U), and a settings icon.
- **Panels** (Not following back, Key accounts): initial-letter avatars, a count badge in the title, a rounded
  search box, recent unfollows on a tinted background, today's unfollows vs the limit as a progress bar,
  and long names cut with an ellipsis on one line instead of overflowing.
- **Settings page**: left section navigation (General, Post marks, Follow & unfollow, Duplicate replies, Key
  accounts, Notes, Data); switches instead of checkboxes; number fields show their unit; every change saves
  automatically (no Save button) with a "Saved" indicator; threshold fields sit under a collapsible
  "Advanced" part of their section. **BREAKING** for the settings page only: the "Features" section that
  held every switch is replaced by switches inside each feature's section.

Out of scope: new features, new data, any change to what is counted or stored apart from the stats bar
position; the badge layout rules (a badge that does not fit still moves to its own row and is never cut
off); the left-nav entry and combined panel planned for later; store screenshots themselves.

How the rules are kept: the refresh only changes how Xhandy draws its own elements. Dragging the stats bar
uses pointer events on Xhandy's own element and never touches X's elements, so Xhandy still never clicks,
types or fakes input on X. No network requests, fonts or remote code are added: icons are inline SVG built
with DOM APIs (no `innerHTML`), fonts come from the system or X's own page. The only new stored data is the
stats bar position, two numbers in `xh:settings`, local like everything else.

## Capabilities

### New Capabilities
- `ui-appearance`: the visual system shared by every surface: colour roles, typography, icons, toasts, light
  and dark, long names never overflowing.
- `stats-bar`: where the stats bar sits, dragging it, remembering and resetting its position.
- `toolbar-popup`: what the toolbar popup shows and links to.
- `settings-page`: layout of the settings page, switches, units, autosave and the Advanced parts.

### Modified Capabilities
- `feature-settings`: switches move from one "Features" section into their feature's section; scenarios
  that press Save now rely on autosave.
- `key-accounts`: the star button becomes an outline / filled star icon instead of the ☆ / ★ characters.
- `post-badges`: the hot heat chip uses the flame icon instead of the 🔥 emoji.
- `local-notes`: a note chip with only text uses the note icon instead of 📝.

## Impact

- `src/content.css` (tokens, chips, toast, HUD, panel), `src/content.js` (HUD drag, star / flame / note icons,
  panel rows), new `src/lib/icons.js` (SVG icons via `createElementNS`), loaded by the content script, popup
  and settings page through `manifest.json` and the two HTML pages.
- `src/popup/popup.html`, `src/popup/popup.js`: new layout; counts for the two entries come from new pure
  helpers in `src/lib/store.js` shared with the panels.
- `src/options/options.html`, `src/options/options.js`: section navigation, switches, units, autosave.
- `src/lib/store.js`: `hudRight` / `hudBottom` settings with defaults (no storage version bump), count
  helpers; `src/locales/*.js`: new and changed strings in both languages.
- Tests: `test/store.test.js` (new settings, count helpers), `test/e2e.mjs` (heat chip text check, Save
  button step, new steps for dragging, popup, autosave, long names).
- README feature list and 中文说明, `docs/` screenshots (retaken after the change), README Privacy and
  `PRIVACY.md` (stats bar position).
