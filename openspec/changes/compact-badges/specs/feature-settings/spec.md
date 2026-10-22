## MODIFIED Requirements

### Requirement: Post age chip switch
The setting stored as the post age chip switch SHALL control the heat chip, and its label SHALL say so
("热度标签" / "Heat chip"). When it is off, post badges SHALL NOT show the heat chip, including its colour and
"old post" mark. Other chips SHALL still show.

#### Scenario: Age chip off
- **WHEN** the heat chip switch is off and a post has other chips
- **THEN** the badge shows the other chips without the heat chip

#### Scenario: Nothing left to show
- **WHEN** every chip for a post is off or has no data
- **THEN** no badge is shown for that post
