# Spec Delta

## Purpose

Warns the user, while they type a reply or post, that it closely matches something they recently sent,
because repeated replies are what X's spam filters look for. It only warns; it never blocks sending.

## ADDED Requirements

### Requirement: Compare only against confirmed history
The warning SHALL compare the text being typed only against entries in the sent history (see
`sent-history`), so it never cites text that X did not accept.

#### Scenario: Earlier send failed
- **WHEN** a send was rejected by X and the user types the same text again
- **THEN** no duplicate warning appears for that text

### Requirement: Warning for long near-duplicates
For a typed text longer than 6 letters or digits (after removing links, @mentions, spaces and punctuation),
the warning SHALL show when it matches one of the last `dupWindow` entries at or above `dupThreshold`,
quoting the matched entry once.

#### Scenario: Near-duplicate
- **WHEN** the user types a reply that matches a recent entry at or above the threshold
- **THEN** the warning shows the score, how long ago, the target, and the earlier text once

#### Scenario: Unrelated reply
- **WHEN** the typed text matches no recent entry at or above the threshold
- **THEN** no warning is shown

### Requirement: Warning for repeated short replies
For a typed text of 6 or fewer letters or digits, the warning SHALL show when the same text (after the same
normalisation) was already sent at least `repeatShort - 1` times among the last `dupWindow` entries.

#### Scenario: Third identical short reply
- **WHEN** `repeatShort` is 3, the user already sent "谢谢" twice, and types "谢谢" again
- **THEN** the warning says it was sent 2 times

#### Scenario: Second identical short reply
- **WHEN** `repeatShort` is 3, the user sent "谢谢" once, and types "谢谢" again
- **THEN** no warning is shown

### Requirement: The warning never blocks
The warning SHALL NOT disable, delay or click any X control; sending stays fully in the user's hands.

#### Scenario: Sending with the warning showing
- **WHEN** the warning is showing and the user sends anyway
- **THEN** X sends normally and the warning hides
