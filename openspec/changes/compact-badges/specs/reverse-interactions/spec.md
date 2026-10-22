## MODIFIED Requirements

### Requirement: Two-direction interaction chip
When the reverse view is on, the interaction chip SHALL show the user's count and the other account's
count, and the time of the latest interaction in either direction. When only one side has interactions,
the other side shows 0. When the reverse view is off, or the other account has no interactions, the chip
SHALL show the user's count and the time in the short form "1次 · 2天前" / "1× · 2d ago".

#### Scenario: Both directions
- **WHEN** the user gave 3 interactions and the author gave 5, the latest today
- **THEN** the chip reads "我3 · 他5 · 今天" in Chinese and "you 3 · them 5 · today" in English

#### Scenario: Only the author interacted
- **WHEN** the user never interacted with the author but the author liked the user's posts twice
- **THEN** the chip reads "我0 · 他2 · …" / "you 0 · them 2 · …"

#### Scenario: Reverse view off
- **WHEN** the user turns the reverse view off in settings and interacted once with the author 2 days ago
- **THEN** the chip reads "1次 · 2天前" / "1× · 2d ago"
