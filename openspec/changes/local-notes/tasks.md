# Tasks

Implement after author-highlights (profile header selector and fixture).

## 1. Storage

- [ ] 1.1 Add the `notes` part and `localNotes: true` (settings) to DEFAULTS; cleanState validates handle keys, status values, tags (≤5, 1–20 chars, unique case-folded), text (≤500), times; empty notes dropped; cap 5,000 refuses new notes. Pure helpers `saveNote(state, handle, note)` and `renameNote(state, id, newHandle)`. Verify: store tests for validation, empty-note delete, cap refusal, rename by id, export/import round trip, old export without `notes`.

## 2. On x.com

- [ ] 2.1 Note editor popover (status chips, tags, textarea with count, Save, Delete, Esc), writes via `store.update(["notes"])`, keydown kept from X. Verify: e2e steps "typing in the note editor does not trigger X shortcuts" and "editor saves status, tags and text".
- [ ] 2.2 Note button on other people's profiles next to the top posts button; Alt+N with the Alt+B target lookup and a toast without a target. Verify: e2e steps "profile note button opens the editor", "Alt+N opens the editor for the selected post's author", "own profile has no note button".
- [ ] 2.3 Note chip in `annotate()` (status, else #tag, else 📝; title with text; not on own posts), included in the badge key; handle-change move when `rel` reports a known id under a new handle. Verify: e2e step "note chip appears on all of the account's posts and updates after editing"; the never-clicks step untouched.
- [ ] 2.4 `localNotes` switch hides button, chip and editor, disables Alt+N, keeps data. Verify: e2e step "notes switch off hides notes and keeps them".

## 3. Settings page

- [ ] 3.1 Notes section with search, status filter, rows and delete; switch in the features section. Verify: e2e steps "settings lists notes and filters by status" and "deleting a note in settings removes its chip on x.com".

## 4. Docs and checks

- [ ] 4.1 README (Features in English and 中文说明, shortcut Alt+N), PRIVACY.md and README Privacy (notes about other accounts are written by the user and kept in the browser), `docs/release-template.md`. Verify: reviewer reads the diff.
- [ ] 4.2 Run `npm test` and `CHROMIUM=/usr/bin/chromium npm run e2e`; exit code 0, no `FAIL` lines.

## Workflow follow-up

- Jack checks on real X: editing from a profile and with Alt+N, the chip on the timeline, settings list.
- Archive after Jack confirms.
