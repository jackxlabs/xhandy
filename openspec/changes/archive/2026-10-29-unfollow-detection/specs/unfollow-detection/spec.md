# Spec Delta

## Purpose

Tracks mutual follow baselines passively from everyday browsing data, detects when mutual connections unfollow the user, and presents recent unfollow alerts with dismissal in the Not Following Back panel.

## ADDED Requirements

### Requirement: Mutual baseline recording
When an incoming relationship update shows an account is a mutual follow (`following: true` and `followed_by: true`), Xhandy SHALL set the mutual baseline timestamp (`mAt`) in the account's relationship record to the time of that update, so `mAt` is when the account was last seen as a mutual. If an unfollow was previously recorded (`lostAt`), Xhandy SHALL clear `lostAt` and `ackAt`.

#### Scenario: Establishing mutual baseline
- **WHEN** an incoming relation indicates both `following: true` and `followedBy: true`
- **THEN** the account's record in storage has `mAt` set to a non-negative timestamp, with `f: true` and `fb: true`

#### Scenario: Mutual re-established after unfollow
- **WHEN** an account with a prior `lostAt` timestamp is observed again with `followedBy: true`
- **THEN** `mAt` is updated to the current time, and `lostAt` and `ackAt` are removed

### Requirement: Passive unfollow detection
When an incoming relationship update for an account the user still follows (`following: true`) explicitly indicates `followed_by: false`, and that account previously had a recorded mutual baseline (`mAt` present), Xhandy SHALL record the unfollow detection timestamp (`lostAt`) if not already present.

#### Scenario: Mutual connection drops follow
- **WHEN** an account previously stored with `mAt` is observed with `following: true` and `followedBy: false`
- **THEN** `lostAt` is set to the current timestamp, and `fb` is set to `false`

#### Scenario: Non-mutual stays non-mutual
- **WHEN** an account stored with `f: true` and `fb: false` that never had a mutual baseline is observed again with `followedBy: false`
- **THEN** no `lostAt` timestamp is added

### Requirement: False-positive safeguards
Xhandy SHALL NOT record an unfollow detection when the incoming relationship payload lacks an explicit boolean `followed_by` status, or when the user does not follow the account (`following: false`).

#### Scenario: Missing or omitted relationship fields
- **WHEN** a relationship update is received without a definitive boolean `followedBy` value
- **THEN** stored `lostAt` and mutual status remain unchanged

#### Scenario: Omitted field is not read as false
- **WHEN** X's response for an account has `relationship_perspectives` without a `followed_by` key (or without a `following` key)
- **THEN** the relation event carries no `followedBy` (or `following`) value for that account, and the stored `fb` (or `f`) keeps its previous value

#### Scenario: User unfollowed first
- **WHEN** an account is observed with `following: false`
- **THEN** no unfollow alert is created, regardless of whether `followedBy` is true or false

#### Scenario: User unfollows, then follows again
- **WHEN** X confirms the user unfollowed a mutual, and the user later follows that account again and it is observed with `following: true` and `followedBy: false`
- **THEN** no unfollow alert is created, because the user's own unfollow removed `mAt`, `lostAt` and `ackAt` from the record

#### Scenario: Both flags true without an observed mutual
- **WHEN** a record has `f: true` and `fb: true` but no `mAt` (for example `fb` left over from before the user unfollowed and followed again) and the account is observed with `following: true` and `followedBy: false`
- **THEN** no unfollow alert is created

#### Scenario: Handle now belongs to a different account
- **WHEN** an incoming relation carries a user id that differs from the stored record's id for the same handle
- **THEN** the stored record is replaced as if the handle were new, and no unfollow alert is created from the old account's baseline

### Requirement: Baseline for mutuals stored before this change
Storage version 5 SHALL give every stored relationship with `f: true` and `fb: true` and no `mAt` a baseline `mAt` equal to its last-seen time `t`, so mutuals recorded before unfollow detection existed can still be detected.

#### Scenario: Upgrading from version 4
- **WHEN** a version 4 store holds a record `{ f: true, fb: true, t }` without `mAt`
- **THEN** after migration the record has `mAt: t`, and records that are not mutual are unchanged

### Requirement: Recent unfollows in panel
The Not Following Back panel (`Alt+U`) SHALL display a dedicated "Recent unfollows" section at the top when unacknowledged unfollow records (`lostAt` present and `ackAt` absent or zero) exist, ordered from newest detection to oldest. Each entry SHALL display the handle, display name, relative detection time, when the account was last seen as a mutual (if known), how often the user interacted with it (if any), and a dismiss button.

#### Scenario: Unacknowledged unfollows shown at top
- **WHEN** the user opens the Not Following Back panel and two accounts have unacknowledged `lostAt` timestamps
- **THEN** both accounts appear in the "Recent unfollows" section at the top of the panel, with their detection time ago displayed

#### Scenario: No unacknowledged unfollows
- **WHEN** all accounts either never unfollowed or have their unfollows dismissed (`ackAt` present)
- **THEN** the "Recent unfollows" section is not displayed, and only the standard not-following-back list is shown

### Requirement: Acknowledging unfollow alerts
When the user clicks the dismiss button (`×`) on a recent unfollow entry, Xhandy SHALL record `ackAt: Date.now()` on that account's record in `xh:rel`. The entry SHALL immediately leave the "Recent unfollows" section and appear only in the standard not-following-back list.

#### Scenario: Dismissing an unfollow alert
- **WHEN** the user clicks the dismiss button on a recent unfollow entry in the panel
- **THEN** `ackAt` is saved in storage, and the item immediately moves into the standard not-following-back list without reloading the page
