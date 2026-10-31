# Design

## Context

- All on-page styling lives in `src/content.css` with `--xh-*` custom properties, already switched for X's
  light, dim and dark backgrounds. The gradient edge comes from `--xh-edge` and `::before` rules on
  `.xh-hud` and `.xh-panel`; numbers use `--xh-mono`.
- The content script builds every element with `createElement` / `textContent`; there is no `innerHTML`
  anywhere, and that stays a hard rule because names and post text on X are untrusted.
- Icons today are characters in locale strings (`top_btn: "🔥 高赞帖"`, `note_btn: "📝 备注"`, `☆`/`★` in the
  star button, `🔥` in the heat chip text).
- The stats bar (`hudEl`, `src/content.js` section 6) is a fixed element centred at the bottom; Alt+H toggles
  `settings.hud`.
- The popup (`src/popup/`) and settings page (`src/options/`) are plain HTML with inline `<style>` and load
  `locales`, `i18n.js` and `store.js` as classic scripts. The settings page saves on a Save button using the
  `NUMS` / `CHECKS` lists and clamps `paceMinutes` and `quietDays`.
- The Not following back count and the quiet key accounts count are computed inside `renderNfbPanel` and
  `renderKeysPanel` in `src/content.js`, which the popup cannot reach.
- Storage is version 5. `cleanSettings` copies numbers and same-typed values from `DEFAULTS.settings`, so new
  numeric settings need only defaults.
- Reference mock: the comparison page made with Jack on 2026-10-30 (not in the repository). Colours below are
  taken from it and from `brand/brand.yaml`.

## Goals / Non-Goals

**Goals:**
- One token set and one icon set used by the content script, popup and settings page.
- Keep existing class names and DOM structure where e2e relies on them (`.xh-badge`, `.xh-chip`, `.xh-star`,
  `.xh-hud`, `.xh-panel`, `.xh-toast`), so the diff is mostly CSS.

**Non-Goals:**
- No build step, no framework, no web fonts (decided 2026-10-30: frameworks wait until after the store
  listing).
- No change to badge placement logic (`badge-layout`), panel data, or keyboard shortcuts.

## Decisions

1. **Tokens.** Replace the colour block at the top of `content.css` with role tokens: `--xh-bg`, `--xh-fg`,
   `--xh-muted`, `--xh-line`, `--xh-chip`, `--xh-subtle`, `--xh-surface`, `--xh-shadow`, `--xh-num`,
   `--xh-accent`, `--xh-ok`, `--xh-hot`, `--xh-warn`, `--xh-danger`. Light: fg #0f1419, muted #536471, line
   #eff3f4, chip #f2f4f5, num #4d2a93 (violet-800), accent #6d28d9, ok #047857, hot #c2410c, warn #b45309,
   danger #b91c1c. Dark: fg #e7e9ea, muted #8b98a5, line #2f3336, surface #16181c, num #ddd6fe (violet-200),
   accent #a78bfa, ok #34d399, hot #fb923c, warn #fbbf24, danger #f87171; dim keeps its own surface and line
   values. Drop `--xh-edge`, `--xh-frame`, `--xh-glow`, `--xh-mono` and the `::before` gradient rules. The
   popup and settings page copy the same tokens into their own `<style>` (two small blocks rather than a
   shared CSS file, to avoid a fourth file that every page must load in the right order; acceptable because
   the values are few and listed here).
   Alternative: keep the gradient as a 1 px top edge. Rejected: brand.yaml says the gradient is decorative
   only, and the edge was the main "dated" signal.
2. **Font.** On x.com, Xhandy elements use `font-family: inherit` so they pick up X's own font; numbers get
   `font-variant-numeric: tabular-nums`. The popup and settings page use the system stack
   (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", "PingFang SC", sans-serif`).
3. **Icons.** New `src/lib/icons.js` exposes `XH.icon(name, size)` returning an `<svg>` built with
   `document.createElementNS`, `stroke="currentColor"`, `aria-hidden="true"`; names: star, flame, note,
   warn, gear, close, search, lock, chevron. Paths are short hand-written 24×24 strokes (as in the mock), not
   copied from an icon library, so no licence to track. It is loaded before `content.js` in `manifest.json`
   and before the page scripts in the popup and settings HTML. Locale strings lose their emoji
   (`top_btn: "高赞帖"`, `note_btn: "备注"`); the icon is added in code before the label. The heat chip text
   loses "🔥 " and gets the flame icon as a child when hot. The star button holds the star icon and keeps
   `aria-pressed`; the filled state is CSS (`fill: currentColor` when pressed).
4. **Stats bar position.** New settings `hudRight` and `hudBottom` (numbers, px from the right and bottom
   window edges, default 16 / 16). No version bump: `cleanSettings` fills defaults for old data and old
   exports. The bar is placed with `right` / `bottom` from these values, clamped on render and on `resize` to
   `[8, innerWidth - width - 8]` and `[8, innerHeight - height - 8]` without writing the clamped value.
   Dragging: `pointerdown` on `hudEl` (primary button only), `setPointerCapture`, move after a 4 px
   threshold, `preventDefault` on move to avoid text selection, write the final position once on
   `pointerup` via `store.update(["settings"], …)`. These are real user events on Xhandy's own element; no
   events are created or dispatched, and nothing on X's DOM is touched. Cursor `grab` / `grabbing`. Other
   tabs pick the new position up through the existing `storage.onChanged` re-render. Reset in settings writes
   16 / 16.
   Alternative: store as a fraction of the window. Rejected: edge distances keep the bar glued to the corner
   the user chose when the window resizes, which matches how people place floating widgets.
   Alternative: snap to four corners only. Rejected by Jack's request for free dragging.
5. **Shared counts.** Move the two counts into pure functions in `src/lib/store.js`:
   `store.notFollowingBack(rel, meHandle)` returning the filtered rows and `store.quietKeys(keys, people,
   quietDays, now)` returning the key rows with `isQuiet`. The panels and the popup call them, so the numbers
   always match; unit tests cover both. The popup takes the user's handle from `relMeta.me.handle`.
6. **Popup.** Today's five numbers come from `days[today]` (same fields as the stats bar). The 7-day chart is
   seven `<div>` bars whose height is `replies / max(7-day max, 1)`; no chart library. The unfollows column of
   the old table goes away (it is still in the stats bar's follow colour logic and the panel footer).
7. **Settings page.** One HTML page; each section is a `<section>` with an id, the nav is a list of buttons
   that show one section and hide the others (`hidden`), remembering the last section in `sessionStorage`
   wrapped in try/catch. Switches are `<button role="switch" aria-checked>`; number fields are `<input
   type="number">` inside a label with a unit `<span>`. Autosave: switches and selects save on `change`;
   numbers save on `change` (blur/Enter) and 600 ms after the last `input`. One `saveSetting(key, value)`
   does the clamping now done in the Save handler (range table per key: e.g. `paceMinutes` 5–1440,
   `quietDays` 1–365, thresholds ≥ 0) and writes with `store.update(["settings"], …)`. The "Saved" indicator
   shows for 1.5 s. Empty or non-numeric input sets `aria-invalid` and a message, no write. "Advanced" is a
   `<details>` per section.
   Alternative: keep Save as a fallback. Rejected: two ways to save confuses, and autosave is what X and
   Chrome's own settings do.
8. **Long names.** Panel rows put name and handle in one line with `white-space: nowrap; overflow: hidden;
   text-overflow: ellipsis; min-width: 0`. Avatars are an initial-letter circle with a colour picked from a
   fixed palette by a hash of the handle; no profile images are loaded (that would be a network request
   triggered by Xhandy).

## Risks / Trade-offs

- [X's chat drawer sits in the bottom-right corner on wide screens and may sit under the default stats bar
  position] → Check on real X in the manual check task; if it overlaps, raise the default `hudBottom` so the
  bar sits above the drawer. The user can drag it anyway.
- [Dragging could conflict with X's own shortcuts or scrolling] → Only primary-button pointer events on
  Xhandy's element are handled; wheel and keys are untouched.
- [Autosave writes on every pause while typing] → Debounced to 600 ms and only `settings` is written; content
  scripts already re-render on `storage.onChanged`, which is cheap.
- [`inherit` font on x.com means the look depends on X's font] → Intended: it should look native. Sizes are set
  explicitly so layout does not depend on it.
- [Removing emoji from locale strings changes exported text nowhere] → Locale strings are not stored, so no
  migration is needed.

## Migration Plan

No data migration. Old settings get `hudRight` / `hudBottom` defaults through `cleanSettings`; old exports
import unchanged. Rollback is reverting the commits; the two extra settings are ignored by older versions.
