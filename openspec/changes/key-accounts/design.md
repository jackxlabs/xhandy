# Design

## Context

- Today: `settings.targets` (array of handles), checked in `annotate()`; matching posts get the
  `xh-target` class (blue inset edge) and a `["star", "★ " + t("target")]` chip. The settings page edits it
  as a textarea.
- Interaction times already exist: `people[h].last` (the user's last like or reply to h) and
  `people[h].in.last` (h's last like, reply, quote or mention of the user). Handles are stored lowercase.
- The "not following you back" panel (`panelEl`, `renderPanel`, Alt+U, popup message `xh-panel`) is a
  single aside with header, info, search, list and footer.
- Shift+F finds "the post selected with j/k"; Alt+S reuses that lookup.
- Storage VERSION is 3; migrate() steps run once per version.

## Goals / Non-Goals

**Goals:**
- One-click starring on X, a manageable list in settings, a quiet-accounts view, no data lost.

**Non-Goals:**
- Fetching anything from X to fill in profiles; the panel shows only what is stored.
- Starring from profile pages or hover cards (posts only, for now).

## Decisions

- **Storage**: new part `keys: { [handleLower]: { h: displayHandle, t: addedAt } }`, cap 1,000 (drop the
  oldest added when over). VERSION 4: migrate() moves `settings.targets` into `keys` with `t` = migration
  time and deletes `settings.targets`. cleanState: if the import has `keys`, validate them (isHandle,
  non-negative t); otherwise convert `settings.targets` from old exports. `targets` leaves
  DEFAULTS.settings. The display handle keeps the case seen on X when added from a post.
- **Settings**: `keyAccounts: true` (feature switch), `quietDays: 14` (min 1, max 365).
- **Star button**: a `<button class="xh-star" type="button">` appended inside `.xh-badge`, after the
  chips, with `aria-pressed` and `aria-label` (t("key_add") / t("key_remove")). Its click handler calls
  `preventDefault()` and `stopPropagation()` and runs in the capture phase on the button itself, so X's
  article click handler never sees it. It writes `store.update(["keys"], ...)`. Rendering comes from
  onChange → annotateAll, so all posts by that author update together. The badge key (JSON of chips)
  includes the starred state so the badge redraws. A badge with no chips but a star is still shown.
- **Alt+S**: same guard as Alt+U (`e.altKey && e.code === "KeyS"`, no ctrl/meta, not typing). Uses the
  Shift+F selected-post lookup; no selected post → toast t("key_pick").
- **Panel**: generalise the existing panel with a mode, `"nfb"` or `"keys"`. Alt+K opens keys mode,
  Alt+U nfb mode; pressing the same shortcut again closes it, the other one switches mode. The popup
  sends `{ type: "xh-panel", mode: "keys" }`; a message without mode keeps meaning nfb. Keys mode reuses
  the header, search, list and footer; rows link to `/handle` like nfb rows. Sort key: latest of
  `people.last` and `people.in.last`, 0 when neither, ascending. Quiet = both directions older than
  quietDays (or missing). Empty list → a hint on how to star (☆ on a post or Alt+S).
- **Settings page list**: a section "Key accounts" replaces "Target accounts": search input, list of
  rows (handle link to x.com, added date, you/them last interaction via XH.ago, remove button), and a
  textarea + Add button for pasting. Remove and Add write `keys` at once (like the language select) and
  re-render the list; they do not touch unsaved fields.
- **Strings**: rename `target` to key wording: zh "重点" / en "key" for the chip; section and panel titles
  "重点账号" / "Key accounts"; quiet mark "沉寂" / "quiet". All new keys go into both locale files.

## Risks / Trade-offs

- [X's article click handler fires before ours and opens the post] → listener on the button in capture
  phase plus stopPropagation; e2e step checks the URL does not change after clicking the star.
- [A star on every post adds visual noise] → small, muted ☆ that brightens on hover; ★ in the accent
  colour. The feature switch removes it entirely.
- [Migration bug loses the user's list] → migration test with targets, and replaceAll test with an old
  export.

## Migration Plan

VERSION 3 → 4: move `settings.targets` into `keys`. Rollback: an older version would not see `keys` and
would show no highlights until the user re-adds them; acceptable for a pre-store release, noted here.
