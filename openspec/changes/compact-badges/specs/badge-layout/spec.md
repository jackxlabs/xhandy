## ADDED Requirements

### Requirement: Badge is never cut off
The post badge SHALL stay in the author's name row when all of it fits. When it does not fit, it SHALL move
to its own row directly above the post text, where chips wrap onto more lines, so no chip or the star is cut
off. A badge that has moved SHALL NOT move back while the post is on screen.

#### Scenario: Badge fits
- **WHEN** a post's badge fits in the name row
- **THEN** it stays next to the author's name

#### Scenario: Badge too long for the name row
- **WHEN** the name row is too narrow for a post's badge
- **THEN** the badge is shown above the post text in full, including the star

#### Scenario: Post without text
- **WHEN** a badge does not fit and the post has no text of its own
- **THEN** the badge stays at the name row and wraps there instead of being cut off

### Requirement: Focal post on its own page
On a post's own page (the URL is that post's status page), that post's badge SHALL always be on its own row
above the post text. Replies and other posts on the page SHALL follow the normal rule.

#### Scenario: Opening a post
- **WHEN** the user opens a post's page
- **THEN** that post's badge is on its own row above the text, and replies below keep badges in their name rows when they fit
