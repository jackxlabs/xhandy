# Proposal

## Why

People who grow on X by hand talk to the same few hundred accounts again and again, and lose track of
who they already reached out to, what they talked about, and who they are working with. Tools like
Blackmagic keep a CRM for this, on their servers. Xhandy already knows the relationship and the
interaction history with each account; a short private note and a status per account, kept in the
browser, turns that into a light personal CRM without sending anything anywhere.

## What Changes

- A note per account: one status out of four presets, any number of the user's own tags (up to 5), and
  free text (up to 500 characters).
  - Presets: 待破冰 / To reach out, 已破冰 / In touch, 常互动 / Regular, 合作中 / Working together.
- A "备注" / "Note" button on profile pages (next to the top posts button) opens a small editor
  belonging to Xhandy. Alt+N (Option+N on Mac) opens the same editor for the author of the post selected
  with j/k, or for the profile being viewed.
- Posts by an account with a note show one short chip with the status (or the first tag when there is
  no status); pointing at it shows the note text.
- The settings page lists notes with search and a status filter; each row links to the profile and can
  be deleted.
- Notes go into the export file and come back with import.
- A feature switch for notes, on by default.

Out of scope:
- A notes view on x.com (lists, filters, reminders); that belongs to the later Xhandy panel.
- Sync between devices, sharing notes, importing contacts from elsewhere.
- Anything on X itself: notes are never posted, sent or shown to anyone else.

How the rules are kept:
- Never acting for the user: the editor is Xhandy's own element; nothing on X is clicked, typed or
  changed. Keys typed in the editor are kept from reaching X's shortcuts.
- Network: none added.
- Storage: new part `notes`; README Privacy and PRIVACY.md say that notes about other accounts are
  written by the user and stay in the browser.

## Capabilities

### New Capabilities
- `local-notes`: private notes, status and tags per account, edited on x.com and managed in settings.

### Modified Capabilities
- `feature-settings`: the switches list gains the notes switch.

## Impact

- `src/lib/store.js` (part `notes`, cleanState, cap), `src/content.js` (profile button, Alt+N, editor,
  note chip in `annotate()`), `src/content.css`, `src/locales/*.js`, `src/options/*` (list, filter,
  switch).
- Tests: `test/store.test.js`, `test/e2e.mjs`, `test/fixtures/` (profile fixture from author-highlights).
- README (en, zh), PRIVACY.md, `docs/release-template.md` (shortcut Alt+N).
- Depends on author-highlights for the profile header selector and fixture; implement after it.
