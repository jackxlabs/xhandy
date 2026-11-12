# not-following-back Specification

## Purpose
The "Not following you back" view lists accounts the user follows that do not follow back, read-only, from
data X already sends. This capability covers what each row tells the user about an account.

## Requirements

### Requirement: Recording account size
When X sends an account's follower count or following count together with its follow relationship, Xhandy
SHALL store the counts it received with that account's relationship and replace older values. A count X did
not send SHALL keep its stored value, or stay unknown; it SHALL NOT be stored as zero. Xhandy SHALL NOT
make any request to obtain counts. Counts SHALL be included in export and import, and files exported
before this change SHALL import with counts unknown. When a handle is seen with a different user id, the
stored counts SHALL NOT carry over.

#### Scenario: Counts arrive
- **WHEN** X sends @alice with 12,400 followers and 310 following
- **THEN** both counts are stored with @alice's relationship

#### Scenario: Only one count sent
- **WHEN** X later sends @alice with 12,450 followers and no following count
- **THEN** followers is 12,450 and following stays 310

#### Scenario: Never sent
- **WHEN** X has sent @bob's relationship but never his counts
- **THEN** @bob's counts are unknown

#### Scenario: Handle changes owner
- **WHEN** @alice is seen with a different user id and no counts
- **THEN** the counts stored for the previous owner are gone

### Requirement: Account size in the list
Each row of the view, in both the "Recently unfollowed you" section and the normal list, SHALL show the
account's follower count and following count, in compact form and in the interface language, when they are
known. An unknown count SHALL be left out; when both are unknown the row SHALL look as it does today. The
list SHALL remain read-only: no control that follows or unfollows, and no mark suggesting whom to unfollow.

#### Scenario: Both known
- **WHEN** @alice has 12,400 followers and follows 310
- **THEN** her row shows "12K followers · 310 following" (Chinese: "粉丝 1.2万 · 关注 310") next to the
  existing "last seen" text

#### Scenario: One known
- **WHEN** only @carol's follower count is known
- **THEN** her row shows the follower count and no following count

#### Scenario: Unknown
- **WHEN** neither count of @bob is known
- **THEN** his row shows no counts and no zero

#### Scenario: Counts update while open
- **WHEN** the view is open and X sends new counts for a listed account
- **THEN** the row shows the new counts without reopening the panel
