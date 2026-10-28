# Design

## Context

- Parts keyed by lowercase handle: `people`, `rel` (which also holds the account's user `id`), `keys`.
- Badges: `annotate()` builds a chip list; `badge-layout` moves badges that don't fit to their own row,
  so one more short chip is acceptable but long text is not.
- The profile header button and `SEL.profileName` come from author-highlights.
- `isTyping()` guards Xhandy's own shortcuts; X's own shortcuts (j, k, l, r, ...) listen on the document.

## Goals / Non-Goals

**Goals:**
- Write and find a note about an account in a few seconds, from wherever the account shows up.
- Data shaped so it survives handle changes and could later be merged between devices.

**Non-Goals:**
- Reminders, follow-up dates, or a notes list on x.com (later panel).

## Decisions

- **Storage**: part `notes: { [handleLower]: { h, id?, s?, tags?, text?, t, u } }`.
  - `h`: display handle; `id`: X user id when known (from `rel`); `s`: one of `reach`, `touch`,
    `regular`, `work`; `tags`: up to 5 strings, each trimmed, 1–20 characters, no duplicates (case
    folded); `text`: up to 500 characters; `t`: created; `u`: last edited.
  - A note with no status, no tags and no text is deleted on save.
  - Cap 5,000 notes; over the cap, saving a new note is refused with a toast (notes are user-written, so
    never dropped silently).
  - Keyed by handle like the other parts so badges look it up cheaply. When `rel` shows the same `id`
    under a new handle, the note moves to the new key (handle changes keep the note).
  - No VERSION change: a new part only needs DEFAULTS and a cleanState step; old exports without `notes`
    import with none. cleanState validates every field and drops invalid entries.
- **Editor**: one `<div class="xh-note">` popover, anchored under the profile button or the selected
  post's badge; status as four toggle chips (click again to clear), a tag input (Enter or comma adds,
  × removes), a textarea with a character count, Save and Delete. Esc closes without saving. `keydown`
  events inside the editor call `stopPropagation()` so X's shortcuts never fire; the editor counts as
  typing for Xhandy's own shortcuts.
- **Alt+N**: same guard and target lookup as Alt+B; toast t("note_pick") when there is no target.
- **Chip**: `["note", label]` where label is the status name, else `#<first tag>`, else "📝"; `title`
  holds the note text (first 200 characters). Shown on every post by that account except the user's own,
  after the relationship chip. Counts in the badge key so it redraws when the note changes.
- **Settings page**: section "备注 / Notes" with search (handle, tags, text), status filter, rows with
  handle link, status, tags, the first line of text, last edited date, and Delete.
- **Setting**: `notes: true`; off hides the button, chip and editor and disables Alt+N. Stored notes stay.

## Risks / Trade-offs

- Notes about other people are personal data the user wrote → stated in PRIVACY.md and in the store's
  privacy form as user-provided content kept locally; delete and "clear all" cover it.
- Popover over X's layout may be clipped on small screens → anchored with fixed positioning and kept
  inside the viewport.
- The badge grows by one chip → it uses the existing "doesn't fit → own row" rule.
