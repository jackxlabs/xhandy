# reply-review Specification

## Purpose
Shows the user what came of their own replies and posts: how many views and likes each got and which kinds
of replies get seen most, using only data X already sends to this browser.

## Requirements

### Requirement: Recording the user's own posts
When the review is on, Xhandy SHALL keep a record of each post or reply written by the signed-in account
that X shows in this browser or confirms as created: its id, whether it is a reply, when it was created,
the account replied to, the first 80 characters of its text, and the latest views, likes and reply count X
sent, with the time those numbers were received. A number X did not send SHALL stay unknown, never zero.
Xhandy SHALL NOT make any request to obtain or refresh these numbers. Posts by other accounts SHALL NOT be
recorded. At most 2,000 records SHALL be kept; the oldest by creation time are dropped first.

#### Scenario: A reply is sent
- **WHEN** the user sends a reply and X confirms it was created
- **THEN** a record for that reply exists with its creation time and the account replied to, and with
  views and likes unknown

#### Scenario: Numbers arrive later
- **WHEN** X later shows that reply with 340 views and 2 likes
- **THEN** the record holds 340 views and 2 likes and the time they were received

#### Scenario: Reply written on another device
- **WHEN** X shows a reply by the signed-in account that Xhandy never saw being sent
- **THEN** a record is created from what X sent

#### Scenario: Missing view count
- **WHEN** X shows the user's reply without a view count
- **THEN** the record's views stay as they were, or unknown if never received

#### Scenario: Other people's posts
- **WHEN** X shows posts by other accounts
- **THEN** no record is created for them

### Requirement: Reply context
For a reply, Xhandy SHALL also keep, when the data is available in this browser at that moment: the parent
post's creation time, the parent author's follower count, the user's own follower count, and, only when the
reply is recorded at the moment it is sent, the parent's views per hour. Context that is not available
SHALL stay unknown and SHALL NOT be filled in with a guess. Context already recorded SHALL NOT be
overwritten later.

#### Scenario: Reply sent from the timeline
- **WHEN** the user replies to a post whose views, time and author size X has sent
- **THEN** the record holds the parent's creation time, the author's followers, the user's followers and
  the parent's views per hour at that moment

#### Scenario: Parent unknown
- **WHEN** a reply by the user is shown and its parent post was never sent to this browser
- **THEN** the record has no parent time, size or heat, and the reply is left out of the groups that need them

### Requirement: Review view
The side panel SHALL have a Review view, opened and closed with Alt+R (Option+R on Mac) and from a row in
the toolbar popup, closed with Esc, and replacing whichever other panel view is open. Alt+R SHALL do
nothing while the user is typing. The view SHALL show, in the interface language:
- the number of replies recorded in the last 7 days and their median views;
- the "what gets seen" groups (next requirement);
- the 10 most-viewed replies created in the last 30 days, each with the account replied to, the text
  excerpt, age, views and likes, linking to the reply;
- when numbers were last received, and a link to the signed-in account's Replies tab with a note that
  scrolling it refreshes the numbers.
The view SHALL contain no control that acts on X. With no records it SHALL explain how records appear.

#### Scenario: Opening
- **WHEN** the user presses Alt+R on x.com with the review on and is not typing
- **THEN** the panel opens on the Review view; pressing Alt+R or Esc closes it

#### Scenario: Empty
- **WHEN** no post by the user has been recorded
- **THEN** the view says that replies appear here after the user sends them or opens their Replies tab

#### Scenario: Top replies
- **WHEN** the user has 14 recorded replies from the last 30 days with known views
- **THEN** the 10 with the most views are listed, most-viewed first, each linking to the reply

#### Scenario: Nothing is done for the user
- **WHEN** the Review view is open
- **THEN** it has only links and a close button, and Xhandy clicks, types and scrolls nothing

### Requirement: What gets seen
The view SHALL group the user's replies that are at least 24 hours old, at most 90 days old and have a
known view count, and show the median views and the number of replies of each group, along three
dimensions:
- reply delay after the parent was posted: under 1 hour, 1 to 6 hours, 6 to 24 hours, over 24 hours;
- parent author's followers relative to the user's at the time: under 2 times, 2 to 10 times, over 10 times;
- parent's heat when replying: below the warm threshold, warm, hot (the heat thresholds in settings).
A reply SHALL count only in the dimensions whose context it has. A group with fewer than 5 replies SHALL
show its count and "not enough replies yet" instead of a median. Xhandy SHALL NOT show a combined score.
When, within one dimension, at least two groups have a median and the highest is at least 1.5 times the
lowest, the highest group SHALL be marked as the best; otherwise none is marked.

#### Scenario: Clear difference
- **WHEN** replies sent under 1 hour have a median of 800 views over 12 replies and replies sent after 6 to
  24 hours have a median of 150 over 9 replies
- **THEN** both groups show their median and count, and "under 1 hour" is marked as the best

#### Scenario: Too few replies
- **WHEN** a group has 3 replies
- **THEN** it shows "3" and "not enough replies yet" and no median, and it cannot be marked as the best

#### Scenario: Fresh replies wait
- **WHEN** a reply is 5 hours old
- **THEN** it is not counted in any group yet

#### Scenario: No clear difference
- **WHEN** the medians of a dimension are 200 and 250
- **THEN** no group is marked as the best

### Requirement: Feature switch
Settings SHALL have an on/off switch for the review, on by default, saved automatically. When it is off,
Xhandy SHALL NOT create or update records, Alt+R SHALL do nothing, the popup row SHALL be hidden, and an
open Review view SHALL close. Existing records SHALL be kept until the user clears their data, and SHALL
be included in export and restored by import.

#### Scenario: Turning off
- **WHEN** the user turns the review off while the Review view is open
- **THEN** the view closes, later replies are not recorded, and records stored before remain

#### Scenario: Export and import
- **WHEN** the user exports, clears all data and imports the file
- **THEN** the same records are shown in the Review view

#### Scenario: Old export
- **WHEN** a file exported by a version without the review is imported
- **THEN** the import succeeds and the review starts empty
