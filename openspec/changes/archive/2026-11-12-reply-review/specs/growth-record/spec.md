# Spec Delta

## Purpose
Keeps a daily record of the signed-in account's follower count, from data X already sends, so the user can
see follower growth next to their own activity.

## ADDED Requirements

### Requirement: Daily follower snapshot
When the review is on and X sends the signed-in account's follower count, Xhandy SHALL store it as that
day's follower count (local date), replacing an earlier value from the same day. A day on which X sent no
count SHALL have no value; it SHALL NOT be stored as zero or copied from another day. No request SHALL be
made to obtain the count. Snapshots SHALL be part of export and import, and an import of a file without
them SHALL succeed.

#### Scenario: First sighting of the day
- **WHEN** X sends the user's own profile data showing 1,204 followers
- **THEN** today's follower count is 1,204

#### Scenario: Later the same day
- **WHEN** X later sends 1,210 on the same day
- **THEN** today's follower count is 1,210

#### Scenario: A day without X
- **WHEN** the user did not open X on a day
- **THEN** that day has no follower count

#### Scenario: Review off
- **WHEN** the review switch is off
- **THEN** no follower count is stored for the day

### Requirement: Growth shown in the Review view
The Review view SHALL show the change in followers over the last 7 days and the last 30 days, each computed
from today's (or the latest) snapshot and the snapshot closest to the start of the period within it, and a
chart of the last 30 days with the follower count as a line and replies per day as bars. Days without a
snapshot SHALL be shown as gaps in the line, not as zero. With fewer than two snapshots in a period the
view SHALL say that growth appears after a few days of use instead of showing a change.

#### Scenario: A week of snapshots
- **WHEN** the snapshot 7 days ago is 1,150 and today's is 1,210
- **THEN** the view shows +60 for 7 days

#### Scenario: Only one snapshot
- **WHEN** only today has a snapshot
- **THEN** the view says growth appears after a few days of use, and shows no change figure

#### Scenario: Missing days
- **WHEN** three days in the last 30 have no snapshot
- **THEN** the line has gaps on those days and the replies bars are still drawn
