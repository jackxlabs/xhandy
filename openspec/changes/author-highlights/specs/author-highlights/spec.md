# Spec Delta

## Purpose
Lets the user open X's own search for an account's best-received posts in one step, to find topics and
openings for conversation, without Xhandy fetching or storing anything.

## ADDED Requirements

### Requirement: Top posts button on profiles
When top posts are on, a profile page other than the signed-in user's own SHALL show a "高赞帖" /
"Top posts" button next to the profile name. Clicking it SHALL open, in a new tab, X's search sorted by
Top for `from:<handle> min_faves:<N> -filter:replies`. The click SHALL NOT reach X, and the button SHALL
appear only once however often X re-renders the header.

#### Scenario: Opening from a profile
- **WHEN** the user clicks "Top posts" on @alice's profile
- **THEN** a new tab opens X's search for `from:alice min_faves:<N> -filter:replies`, sorted by Top, and
  the profile tab stays as it was

#### Scenario: Own profile
- **WHEN** the user views their own profile
- **THEN** no top posts button is shown

### Requirement: Keyboard shortcut for top posts
Alt+B (Option+B on Mac) SHALL open the same search for the author of the post selected with j/k, or, with
no post selected, for the profile being viewed. With neither, it SHALL show a short toast explaining how
to pick an account. It SHALL do nothing while the user is typing.

#### Scenario: Selected post
- **WHEN** a post by @bob is selected and the user presses Alt+B
- **THEN** a new tab opens the top posts search for @bob

#### Scenario: Nothing to pick
- **WHEN** no post is selected, the page is not a profile, and the user presses Alt+B
- **THEN** a toast says to select a post with j / k or open a profile first

### Requirement: Threshold from follower count
N SHALL come from the account's follower count when Xhandy has seen it on the page: under 1K → 10,
under 10K → 50, under 100K → 200, under 1M → 1,000, otherwise 5,000. When the count is unknown, N SHALL
be 100. The follower count SHALL be kept in memory only.

#### Scenario: Known large account
- **WHEN** Xhandy has seen that @carol has 250K followers and the user opens top posts for @carol
- **THEN** the query uses `min_faves:1000`

#### Scenario: Unknown size
- **WHEN** Xhandy has not seen @dave's follower count
- **THEN** the query uses `min_faves:100`

### Requirement: Nothing done on X
Opening top posts SHALL only open one new tab per click or key press. Xhandy SHALL NOT read, rank or
store the search results, and SHALL NOT send any request of its own.

#### Scenario: Repeated presses
- **WHEN** the user presses Alt+B three times
- **THEN** three tabs open, one per press, and nothing else happens
