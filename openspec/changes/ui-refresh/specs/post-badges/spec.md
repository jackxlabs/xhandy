# Spec Delta

## MODIFIED Requirements

### Requirement: Heat chip without the age
The heat chip SHALL show the post's views per hour without the post's age, since X shows the age next to the
author's name. A hot post SHALL show the flame icon and the hot colour, a warm post the warm colour. A post
older than the "old post" threshold SHALL show the grey colour and the "old" mark. A post that is not old and
has no view data SHALL show no heat chip.

#### Scenario: Hot post
- **WHEN** a 22-hour-old post gets 950,000 views per hour
- **THEN** the chip shows the flame icon and reads "95万/时" / "950K/h" with no age

#### Scenario: Old post
- **WHEN** a post is 3 days old with 694 views per hour and the threshold is 48 hours
- **THEN** the chip is grey and reads "694/时 · 旧帖" / "694/h · old post"

#### Scenario: No view data
- **WHEN** a recent post has no view count from X
- **THEN** no heat chip is shown
