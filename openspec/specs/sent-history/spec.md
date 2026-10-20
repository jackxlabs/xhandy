# sent-history Specification

## Purpose
Keeps a local history of the posts and replies the user really sent on X, so Xhandy can count daily
posts and replies, count replies per author, and warn before a near-duplicate reply.

## Requirements

### Requirement: Record only sends that X confirms
Xhandy SHALL add a post or reply to the history, and to the daily and per-author counts, only after X
answers the user's own send with a created post. Xhandy SHALL NOT make any request of its own to learn this.

#### Scenario: Successful reply
- **WHEN** the user sends a reply and X answers with the created post
- **THEN** one history entry is added with the reply text, kind "reply" and the replied-to account, and
  today's reply count and that author's reply count each go up by one

#### Scenario: X rejects the send
- **WHEN** the user sends and X answers with an error (failed request, or a response carrying errors and no
  created post, such as X's duplicate-status error)
- **THEN** nothing is added to the history and no count changes

#### Scenario: Double click on send
- **WHEN** the user triggers send twice for one post and X creates the post once
- **THEN** exactly one history entry is added

### Requirement: Reply target comes from X
For a confirmed send, Xhandy SHALL take the kind (post or reply) and the replied-to account from X's
answer, not from which reply button was clicked last.

#### Scenario: Reply opened without the reply button
- **WHEN** the user replies from a post's own page or with X's "r" shortcut and X confirms the reply
- **THEN** the entry is a reply to the account X names as the replied-to author

#### Scenario: Quote post
- **WHEN** the user sends a quote post that is not a reply
- **THEN** the entry has kind "post" and no target

### Requirement: Fallback when X's answer cannot be read
If no post request from the user's send is seen within 3 seconds, Xhandy SHALL record the send from
the composer text as before, so counting keeps working after X changes its API.

#### Scenario: X renamed its endpoint
- **WHEN** the user sends and no post request is seen within 3 seconds
- **THEN** one entry is recorded from the composer text, with the reply target from the last reply button
  or the post page, as before this change

#### Scenario: X changed its answer's shape
- **WHEN** X answers the post request successfully, without errors, but in a shape Xhandy cannot read
- **THEN** one entry is recorded from the composer text, as in the scenario above

#### Scenario: Request seen but slow
- **WHEN** the post request is seen within 3 seconds but X answers later
- **THEN** Xhandy waits for the answer and applies the confirmed or rejected rules, without a fallback entry

### Requirement: Composer text is read once
When Xhandy reads composer text, it SHALL read each editable text box once, ignoring the wrapper elements
X nests around it. A thread composer with several boxes is joined with line breaks, one copy per box.

#### Scenario: Nested composer
- **WHEN** X wraps the editable box in elements whose test ids also start with "tweetTextarea_"
- **THEN** the text read is the box's text exactly once

### Requirement: Clean up tripled history
On upgrade and on import, Xhandy SHALL replace any history entry whose text is exactly three identical
copies joined by single line breaks with one copy, keeping its time, kind and target. Other entries stay
unchanged and no entry is dropped.

#### Scenario: Upgrade from storage version 2
- **WHEN** an existing install with tripled entries loads the new version
- **THEN** every tripled entry holds one copy, the entry count is unchanged, and the storage version is 3

#### Scenario: Importing an old export
- **WHEN** the user imports an export file made by an older version with tripled entries
- **THEN** the imported history holds one copy per entry

#### Scenario: Text that is not a triple
- **WHEN** an entry's text is two copies, or three copies that differ
- **THEN** it is kept as it is

### Requirement: Events from the page are validated
Xhandy SHALL accept send confirmations from the page only in the expected shape (text up to 25,000
characters, a valid account handle or none, a boolean outcome), and only while a send by the user is
pending. Anything else SHALL be ignored.

#### Scenario: Forged confirmation
- **WHEN** a script on x.com dispatches a confirmation event while the user has not triggered a send
- **THEN** nothing is recorded

#### Scenario: Malformed confirmation
- **WHEN** a confirmation event carries a non-string text, an invalid handle or an oversized text
- **THEN** the event is ignored
