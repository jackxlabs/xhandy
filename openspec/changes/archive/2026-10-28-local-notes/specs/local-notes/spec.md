# Spec Delta

## Purpose
Lets the user keep a private status, tags and a short note about any account, written on x.com, shown
next to that account's posts, and managed from the settings page, all stored only in the browser.

## ADDED Requirements

### Requirement: Note contents
A note SHALL belong to one account and MAY hold one status out of four presets (待破冰 / To reach out,
已破冰 / In touch, 常互动 / Regular, 合作中 / Working together), up to 5 tags of 1–20 characters each,
and text of up to 500 characters. Saving a note with none of these SHALL delete it. Each note SHALL keep
the time it was created and last edited.

#### Scenario: Status and tags
- **WHEN** the user sets @alice to 已破冰 with tags "设计" and "播客" and saves
- **THEN** the note for @alice holds that status and both tags

#### Scenario: Emptying a note
- **WHEN** the user clears the status, tags and text of a note and saves
- **THEN** the note is deleted

### Requirement: Editing on x.com
When notes are on, a profile page other than the user's own SHALL show a "备注" / "Note" button that
opens Xhandy's note editor for that account. Alt+N (Option+N on Mac) SHALL open the editor for the
author of the post selected with j/k, or for the profile being viewed; with neither it SHALL show a toast.
Keys typed in the editor SHALL NOT trigger X's shortcuts or Xhandy's. Esc SHALL close it without saving.

#### Scenario: Typing does not reach X
- **WHEN** the user types "j" and "l" in the note text
- **THEN** the letters appear in the note and X neither moves the selection nor likes a post

#### Scenario: Selected post
- **WHEN** a post by @bob is selected and the user presses Alt+N
- **THEN** the note editor for @bob opens

### Requirement: Note chip on posts
Posts by an account with a note, except the user's own posts, SHALL show one chip with the status name,
or `#` and the first tag when there is no status, or 📝 when there is only text. Pointing at the chip
SHALL show the note text. The chip SHALL update on every visible post by that account when the note
changes.

#### Scenario: Status chip
- **WHEN** @alice's note has status 常互动 and the interface is in English
- **THEN** @alice's posts show a chip reading "Regular"

### Requirement: Managing notes in settings
The settings page SHALL list notes with a search box over handle, tags and text and a status filter. Each
row SHALL show the handle linking to the profile, status, tags, the start of the text, the last edited
date, and a delete button that takes effect at once.

#### Scenario: Filtering
- **WHEN** the user picks the status 合作中
- **THEN** only notes with that status are listed

### Requirement: Notes stay local and follow the account
Notes SHALL be stored only in `chrome.storage.local`, included in the export file and restored by import.
When Xhandy sees that an account's user id now belongs to a new handle, its note SHALL move to the new
handle. At 5,000 notes, saving a note for a new account SHALL be refused with a toast; existing notes SHALL
never be dropped to make room.

#### Scenario: Handle change
- **WHEN** @carol, who has a note, renames to @carol_new and Xhandy sees the same user id
- **THEN** the note shows on @carol_new's posts and profile

#### Scenario: Old export
- **WHEN** the user imports an export made before notes existed
- **THEN** the import succeeds with no notes and no error
