# reverse-interactions Specification

## Purpose
Counts what other accounts did to the user on X (likes, replies, quotes, mentions), from data X already
sent to the browser, so the badge can show whether an interaction is two-way.

## Requirements

### Requirement: Count likes from notifications
For each like notification in a notifications response, Xhandy SHALL count one like from each listed
account for each listed post of the user, once per account and post.

#### Scenario: Single like
- **WHEN** a notification says one account liked one of the user's replies
- **THEN** that account's received-like count goes up by one and its latest time is the notification time

#### Scenario: Several posts liked
- **WHEN** a notification says an account liked several of the user's posts and lists some of them
- **THEN** one like is counted per listed post, and the count is treated as a lower bound

#### Scenario: Several accounts in one notification
- **WHEN** a like notification lists several accounts and one post
- **THEN** each listed account gets one like; accounts summarised as "and N others" are not counted

### Requirement: Count replies, quotes and mentions from posts
For any post in any response whose author is not the user, Xhandy SHALL count one reply if it replies to
the user, else one quote if it quotes a post of the user, else one mention if it mentions the user;
once per post.

#### Scenario: Reply on the user's post page
- **WHEN** the user opens their own post and X sends replies from other accounts
- **THEN** each replying account's received-reply count goes up by one per reply post

#### Scenario: Reply notification
- **WHEN** a notifications response contains a post replying to the user
- **THEN** it is counted as a reply from its author

#### Scenario: The user's own posts
- **WHEN** a post replies to the user but its author is the user
- **THEN** nothing is counted

### Requirement: Count each interaction once
Xhandy SHALL remember what it has counted (a key per counted like, reply, quote or mention), keep at most
20,000 keys, and SHALL NOT count a remembered key again.

#### Scenario: Reloading notifications
- **WHEN** the user opens the notifications page again and X sends the same entries
- **THEN** no count changes

#### Scenario: Key cap
- **WHEN** 20,000 keys are stored and a new interaction is counted
- **THEN** the oldest key is dropped and the new one is kept

### Requirement: Two-direction interaction chip
When the reverse view is on, the interaction chip SHALL show the user's count and the other account's
count, and the time of the latest interaction in either direction. When only one side has interactions,
the other side shows 0. When the reverse view is off, the chip SHALL look as it does today.

#### Scenario: Both directions
- **WHEN** the user gave 3 interactions and the author gave 5, the latest today
- **THEN** the chip reads "我3 · 他5 · 今天" in Chinese and "you 3 · them 5 · today" in English

#### Scenario: Only the author interacted
- **WHEN** the user never interacted with the author but the author liked the user's posts twice
- **THEN** the chip reads "我0 · 他2 · …" / "you 0 · them 2 · …"

#### Scenario: Reverse view off
- **WHEN** the user turns the reverse view off in settings
- **THEN** the chip shows only the user's own count, as before

### Requirement: Identify the user
Xhandy SHALL treat as "the user" the signed-in account, by handle from the page and by account id when a
response names the viewer. If neither is known, nothing SHALL be counted.

#### Scenario: Signed-in account unknown
- **WHEN** Xhandy cannot tell which account is signed in
- **THEN** no reverse interaction is counted

#### Scenario: The user's own posts
- **WHEN** a post is by the signed-in user
- **THEN** no interaction chip is shown (as defined in post-badges)
