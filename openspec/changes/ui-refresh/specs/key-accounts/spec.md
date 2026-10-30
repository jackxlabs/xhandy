# Spec Delta

## MODIFIED Requirements

### Requirement: Star on post badges
When key accounts are on, every post badge except on the user's own posts SHALL end with a star button:
an outline star icon when the author is not a key account, a filled star icon when it is. Clicking it SHALL
add or remove the author and update every visible post by that author. The click SHALL NOT reach X (no post
opens, nothing on X is clicked). The button SHALL have an accessible label in the interface language and
SHALL report whether it is pressed.

#### Scenario: Adding from the timeline
- **WHEN** the user clicks the outline star on a post by @alice
- **THEN** @alice becomes a key account, all of @alice's visible posts show the filled star and the key
  highlight, and the post does not open

#### Scenario: Removing
- **WHEN** the user clicks the filled star on a post by a key account
- **THEN** the account is removed and its posts lose the highlight

#### Scenario: Own posts
- **WHEN** a post is by the signed-in user
- **THEN** no star is shown

### Requirement: Key account highlight
Posts by key accounts SHALL keep the blue edge. The filled star button SHALL be the only key marker in
the badge; there SHALL be no separate key chip.

#### Scenario: One star per post
- **WHEN** a post is by a key account
- **THEN** its badge shows a single filled star button and no "key" chip, and clicking it removes the
  account
