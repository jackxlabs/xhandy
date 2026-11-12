# Design

## Context

- `panelRow` in `src/content.js` builds `<a href="/handle">`. X only routes clicks on its own links, so the
  click is a full page load: the content script starts again with `panelEl` unset and the panel hidden.
  Panel state today is three module variables (`panelMode`, `panelQuery`, and `hidden` on the element).
- `collectRelations` in `src/page-hook.js` already reads `relationship_counts.followers` into
  `entry.followers`; `cleanRelations` passes it on, and content.js uses it only for the memory-only author
  size and for `relMeta.me`. It is not stored in `xh:rel`. The following count is not read at all.
- `nextRel(prev, u, now)` builds the stored entry `{ f, fb, id, n, t, mAt?, lostAt?, ackAt? }`;
  `cleanRelEntry` validates entries on load and import.
- `renderNfbPanel` rebuilds the list only when a JSON key of what it shows changes.

## Goals / Non-Goals

**Goals:**
- Fix the disappearing panel without touching X's router and without new permissions.
- Add the two counts with no storage conversion and no extra writes.

**Non-Goals:**
- Keeping the panel's DOM alive across loads; it is rebuilt.
- Reducing `xh:rel` write cost.

## Decisions

### 1. Panel state in `sessionStorage`, key `xh:panel`

Value: `JSON.stringify({ m: "nfb" | "keys", q: string, y: number })`.

- Written by one `savePanel()` called from `togglePanel` (open), the search `input` handler, and a
  `scroll` listener on `.xh-panel-list` throttled to once per 250 ms. Removed when the panel closes for any
  reason (`togglePanel(false)`, including the "feature turned off" path).
- Read once at start-up, after the first state load (`S` available) and after settings are known: validate
  (`m` in the list of modes, `q` a string of at most 50 characters, `y` a finite number ≥ 0; anything else →
  remove the key and stay closed), check the view's feature switch (`keyAccounts` for `keys`), then open with
  a new `restore` flag: `togglePanel(true, m, { focus: false })`, set the search box value and `panelQuery`,
  render, then set `list.scrollTop = y`.
- All access wrapped in try/catch: `sessionStorage` can throw.
- A future view (`review`) only needs its mode added to the list of modes.

Why `sessionStorage`: the state must be per tab and die with the tab. `chrome.storage.local` is shared by all
tabs (a second tab would pop the panel open); `chrome.storage.session` is not available to content scripts
without a background script, which the extension does not have. The content script's `sessionStorage` is the
page origin's, so X's scripts could read or write it: it holds only UI state, and a forged value can at most
open one of Xhandy's own read-only views, which is why it is validated and nothing else is stored there.

Alternatives rejected: `history.pushState` plus a synthetic `popstate` to make X route in place (Xhandy
operating X's page, and a synthetic event); opening rows in a new tab (changes what a click does and leaves
tabs behind).

### 2. Counts: `fo` and `fg` on rel entries

- `collectRelations`: keep `followers`; add `followingCount` from `relationship_counts.following`, falling
  back to `legacy.friends_count`; followers also falls back to `legacy.followers_count`. Each only when a
  finite non-negative number. The existing "merge with the earlier entry for the same handle" loop gets the
  new key.
- `cleanRelations`: pass `followingCount` when `isNonNegInt`; a present but invalid value drops the entry,
  like `followers` today.
- `nextRel`: `if (isNonNegInt(u.followers)) next.fo = u.followers;` and the same for `fg`. Because `old`
  is reset when the handle was reused, counts do not carry over to a new owner.
- `relAfterFriendship` spreads `old`, so counts survive a follow or unfollow. No change.
- `cleanRelEntry`: keep `fo` / `fg` when `isNonNegInt`, drop otherwise.
- No `VERSION` bump: fields are optional.

Short keys because `xh:rel` can hold 30,000 entries. No extra write: counts ride on the `store.update` that
already runs for every relations payload.

Whether X's current responses carry `relationship_counts.following` is not confirmed; the fallback covers
the older shape, and task 3.1 checks on real X. If neither path exists the following count simply never
shows, and the field path is corrected in a follow-up.

### 3. Row text

In `renderNfbPanel`, both loops push a size text into `meta` after the existing first item:
`t("nfb_size_fo", { n: XH.compact(r.fo) })` and `t("nfb_size_fg", { n: XH.compact(r.fg) })`, each only when
the value is a number. Add `r.fo`, `r.fg` to both arrays in the render key so rows update live. New locale
keys in `src/locales/en.js` (`{n} followers`, `{n} following`) and `src/locales/zh.js` (`粉丝 {n}`,
`关注 {n}`). If the meta line overflows the panel width, it wraps to a second line (CSS only if needed).

## Risks / Trade-offs

- [`xh:rel` grows by up to ~20 bytes per entry, about 0.6 MB at 30,000 entries] → accepted; it adds to the
  known write cost, which is tracked separately.
- [Counts are as old as the last sighting] → the row already says when the account was last seen.
- [Restored panel covers part of a profile on narrow windows] → same as opening it by hand; Esc closes it and
  that is remembered.
- [Scroll position restored before rows exist] → set `scrollTop` after the forced render in the same tick.

## Migration Plan

None. Rollback: an older version ignores `fo` / `fg` and the `sessionStorage` key.
