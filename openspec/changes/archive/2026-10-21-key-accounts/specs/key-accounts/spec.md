# Spec Delta

## Purpose
Lets the user keep a short list of accounts they care about, built with one click while browsing X,
highlights those accounts' posts, and shows which of them the user has not interacted with lately.

## ADDED Requirements

### Requirement: Star on post badges
When key accounts are on, every post badge except on the user's own posts SHALL end with a star button:
☆ when the author is not a key account, ★ when it is. Clicking it SHALL add or remove the author and
update every visible post by that author. The click SHALL NOT reach X (no post opens, nothing on X is
clicked). The button SHALL have an accessible label in the interface language.

#### Scenario: Adding from the timeline
- **WHEN** the user clicks ☆ on a post by @alice
- **THEN** @alice becomes a key account, all of @alice's visible posts show ★ and the key highlight, and
  the post does not open

#### Scenario: Removing
- **WHEN** the user clicks ★ on a post by a key account
- **THEN** the account is removed and its posts lose the highlight

#### Scenario: Own posts
- **WHEN** a post is by the signed-in user
- **THEN** no star is shown

### Requirement: Keyboard shortcut
Alt+S (Option+S on Mac) SHALL toggle the author of the post selected with j/k, the same post Shift+F
uses, and show a short toast saying whether the account was added or removed. It SHALL do nothing while
the user is typing.

#### Scenario: Selected post
- **WHEN** a post by @bob is selected and the user presses Alt+S
- **THEN** @bob is added and a toast confirms it

### Requirement: Key account highlight
Posts by key accounts SHALL keep the blue edge and show a "★ 重点" / "★ key" chip.

#### Scenario: Chip text
- **WHEN** the interface is in English and a post is by a key account
- **THEN** the chip reads "★ key"

### Requirement: Managing key accounts in settings
The settings page SHALL list key accounts with a search box. Each row SHALL show the handle linking to
the profile, the date added, the user's last interaction with the account and the account's last
interaction with the user (or that there was none), and a remove button that takes effect at once. A text
box SHALL add several handles at once, one per line, with or without @; invalid handles SHALL be skipped
and reported by count.

#### Scenario: Paste several
- **WHEN** the user pastes "@alice", "bob" and "not a handle!" and presses Add
- **THEN** alice and bob are added and the page says one line was skipped

#### Scenario: Remove from settings
- **WHEN** the user presses remove on @alice's row
- **THEN** @alice is no longer a key account, without pressing Save

### Requirement: Quiet accounts panel
Alt+K, and a button in the toolbar popup, SHALL open a panel listing key accounts sorted by the time since
the latest interaction in either direction, longest first, with accounts that never interacted first.
Accounts with no interaction in either direction for at least the quiet threshold (default 14 days,
changeable in settings) SHALL be marked quiet, and the panel header SHALL show how many are quiet. Each row
SHALL show both directions' last interaction and SHALL only link to the profile; the panel SHALL have no
action buttons other than close and search.

#### Scenario: Quiet account
- **WHEN** the user last liked @carol 20 days ago and @carol last interacted with the user 16 days ago
- **THEN** @carol's row is marked quiet and shows "you: 20 days ago · them: 16 days ago" (or the Chinese
  equivalent)

#### Scenario: Recent account
- **WHEN** @dave replied to the user yesterday
- **THEN** @dave is not marked quiet, even if the user has not interacted with @dave for a month

### Requirement: Storage and migration
Key accounts SHALL be stored locally with the time each was added, at most 1,000 accounts. Upgrading SHALL
move the existing target accounts into key accounts with nothing lost. Importing an old export that has
target accounts SHALL import them as key accounts.

#### Scenario: Upgrade
- **WHEN** a user with target accounts alice and bob upgrades
- **THEN** alice and bob are key accounts and their posts are still highlighted

### Requirement: Feature switch
When the key accounts switch is off, Xhandy SHALL show no star, no highlight and no Alt+S or Alt+K
behaviour, and SHALL keep the stored list.

#### Scenario: Switched off
- **WHEN** key accounts are off
- **THEN** posts show no star or key chip, and turning it back on restores the same list
