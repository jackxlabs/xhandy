# post-badges Specification

## Purpose
Shows, next to each post's author name, the facts a person who replies by hand uses to decide whether a
post is worth a reply, as short plain labels built only from data X already sent to the browser.

## Requirements

### Requirement: Reply count and author size chip
When "show replies and author size" is on and X has sent the post's reply count, the badge SHALL show a
chip with the reply count and the author's follower count, the follower count in K/M in every language.
When the user's own follower count is known and the author has at least twice as many followers, the chip
SHALL add the size ratio rounded to a whole number. The chip SHALL stay short enough for X's name row.

#### Scenario: All data known
- **WHEN** a post has 23 replies, its author has 46,000 followers, and the user has 3,800 followers
- **THEN** the chip reads "💬 23 · 46K · 12×" in both languages

#### Scenario: Author smaller than twice the user
- **WHEN** a post has 6 replies, its author has 3,200 followers, and the user has 4,600 followers
- **THEN** the chip reads "💬 6 · 3.2K" with no ratio

#### Scenario: Own follower count unknown
- **WHEN** the reply and author counts are known but the user's own follower count is not
- **THEN** the chip shows the reply and follower counts without the ratio

#### Scenario: No data for the post
- **WHEN** X has not sent the post's reply count
- **THEN** no reply chip is shown

#### Scenario: Switched off
- **WHEN** the user turns "show replies and author size" off in settings
- **THEN** no reply chip is shown on any post

### Requirement: Already-replied chip
When "mark posts I replied to" is on, the badge SHALL show a "✓ replied" chip on a post the user has
replied to, whether the reply was sent in this browser (confirmed by X) or seen in any response X sent
(a post by the user that replies to it).

#### Scenario: Reply sent here
- **WHEN** X confirms the user's reply to a post
- **THEN** that post shows "✓ 已回复" / "✓ replied" from then on, also after a reload

#### Scenario: Reply made on another device
- **WHEN** a response from X contains a post by the user that replies to a post on screen
- **THEN** that post shows the replied chip

#### Scenario: Switched off
- **WHEN** the user turns "mark posts I replied to" off
- **THEN** no replied chip is shown

### Requirement: Bounded replied history
Xhandy SHALL keep at most 5,000 replied-to post ids, dropping the oldest first, and SHALL include them in
export, import and clear.

#### Scenario: Cap reached
- **WHEN** a new replied-to id arrives and 5,000 are stored
- **THEN** the oldest id is removed and the new one is kept

#### Scenario: Export and import
- **WHEN** the user exports, clears and imports the file
- **THEN** the same posts show the replied chip as before

### Requirement: The user's own follower count
Xhandy SHALL remember the user's own follower count from the latest response that contains the user's
account, identified by the handle of the signed-in account.

#### Scenario: Own account appears in a response
- **WHEN** a response contains the signed-in user's account with a follower count
- **THEN** that count is used for the ratio and is kept for later sessions

### Requirement: The user's own posts
On posts by the signed-in user, the badge SHALL NOT show the relationship chip or the interaction chip, and
the reply chip SHALL show only the reply count. Likes and replies the user gives their own posts SHALL count
toward the day's totals but not toward per-author interactions.

#### Scenario: Own post
- **WHEN** a post on screen is by the signed-in user and has 14 replies
- **THEN** its badge shows age/heat and "💬 14", and no "not following" or interaction chip

#### Scenario: Liking your own post
- **WHEN** the user likes their own post
- **THEN** today's like count goes up by one and no per-author interaction is recorded
