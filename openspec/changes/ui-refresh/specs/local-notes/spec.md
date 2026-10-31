# Spec Delta

## MODIFIED Requirements

### Requirement: Note chip on posts
Posts by an account with a note, except the user's own posts, SHALL show one chip with the status name,
or `#` and the first tag when there is no status, or the note icon when there is only text. Pointing at the
chip SHALL show the note text. The chip SHALL update on every visible post by that account when the note
changes.

#### Scenario: Status chip
- **WHEN** @alice's note has status 常互动 and the interface is in English
- **THEN** @alice's posts show a chip reading "Regular"

#### Scenario: Text-only note
- **WHEN** @bob's note has text but no status and no tags
- **THEN** @bob's posts show a chip with the note icon and no emoji
