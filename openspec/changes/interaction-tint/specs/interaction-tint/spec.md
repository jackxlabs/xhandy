## ADDED Requirements

### Requirement: Tint posts by two-way interaction

The extension SHALL give a post a background tint when the user and the post's author have interacted in both
directions. The tint strength SHALL depend on the shared count: the smaller of the user's interactions with the
author (likes and replies) and the author's interactions with the user (likes, replies, quotes and mentions), as
counted for the interaction chip. The tint SHALL show without any hover, click or other action by the user.

#### Scenario: Two-way interaction
- **WHEN** the user gave an author 6 interactions, the author gave the user 3, and the last one was today
- **THEN** that author's posts show a tint computed from a shared count of 3

#### Scenario: One-sided interaction
- **WHEN** the user gave an author 50 interactions and the author gave none
- **THEN** that author's posts show no tint

#### Scenario: No history
- **WHEN** there is no interaction recorded with an author in either direction
- **THEN** that author's posts show no tint

#### Scenario: The user's own posts
- **WHEN** a post is by the signed-in user
- **THEN** it shows no tint

### Requirement: Tint deepens with the shared count

The tint SHALL get deeper as the shared count grows, on a logarithmic curve that reaches its deepest at the
"deepest at" count from settings and stays there above it. Even the deepest tint SHALL keep the post's text
readable in X's Default, Dim and Lights out themes, and the faintest tint shown SHALL still be visible against the
page background.

#### Scenario: More interaction, deeper tint
- **WHEN** author A has a shared count of 2 and author B a shared count of 10, both last active today, with the
  default settings
- **THEN** B's posts show a deeper tint than A's

#### Scenario: Above the deepest count
- **WHEN** authors have shared counts of 20 and 80, both last active today, and "deepest at" is 20
- **THEN** both show the deepest tint

### Requirement: Tint fades with time

The tint SHALL fade with the time since the most recent interaction in either direction, halving its strength
every "fade half-life" days from settings. When the faded strength is too low to show, the post SHALL show no tint.

#### Scenario: Recent beats old
- **WHEN** two authors have the same shared count, one last active today and one 60 days ago, with a 30-day
  half-life
- **THEN** the author active today shows a deeper tint

#### Scenario: Faded away
- **WHEN** an author has a shared count of 1 and the last interaction was 120 days ago, with a 30-day half-life
- **THEN** that author's posts show no tint

#### Scenario: New interaction
- **WHEN** the user or the author interacts again while the author's post is on screen
- **THEN** the tint on that author's posts updates without reloading the page

### Requirement: Tint alongside other marks

The tint SHALL use the extension's violet accent colour and SHALL NOT replace other marks: the blue edge of key
accounts and of the selected post SHALL stay visible on a tinted post, and chips keep their own colours. The tint
SHALL stay visible when X shows its own hover background on the post.

#### Scenario: Tinted key account
- **WHEN** a starred key account with two-way interaction has a post on screen
- **THEN** the post shows both the blue edge and the violet tint

#### Scenario: Hovering a tinted post
- **WHEN** the pointer is over a tinted post and X shows its hover background
- **THEN** the tint is still visible

#### Scenario: Interaction chip turned off
- **WHEN** the interaction chip switch is off and the tint switch is on
- **THEN** posts are still tinted by interaction

### Requirement: Tint settings

The settings page SHALL have, in the "Post marks" section, an on/off switch for the tint (on by default), a
"deepest at" count (default 20, whole number from 2 to 500) and a "fade half-life" in days (default 30, whole
number from 1 to 365). The two numbers SHALL be disabled while the switch is off. Changes SHALL save automatically
and apply to posts on x.com without reloading. All labels SHALL be available in English and Chinese.

#### Scenario: Turning the tint off
- **WHEN** the user turns the tint switch off
- **THEN** no post on x.com is tinted, without reloading the page

#### Scenario: Invalid number
- **WHEN** the user enters 0 or a non-number as "deepest at"
- **THEN** the field shows an error and the stored value does not change

#### Scenario: Import of an older export
- **WHEN** the user imports an export made before this change
- **THEN** the tint settings take their defaults and no other data is lost
