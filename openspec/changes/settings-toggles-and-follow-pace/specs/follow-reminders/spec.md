# Spec Delta

## Purpose
Reminds the user when their own follows or unfollows, counted from X's confirmed answers, go past a
daily total or a pace, so they slow down before X limits the account. Reminders never block anything.

## ADDED Requirements

### Requirement: Daily limit reminder
When a follow confirmed by X brings today's follows above the daily follow limit, Xhandy SHALL show the
daily-limit toast, and the stats bar's follow count SHALL turn orange. The same SHALL hold for unfollows
with the daily unfollow limit (toast only; the stats bar has no unfollow count).

#### Scenario: Above the daily limit
- **WHEN** the daily follow limit is 20 and the user's 21st follow today is confirmed
- **THEN** the daily-limit toast appears and the follow count is orange

### Requirement: Pace reminder
When a follow confirmed by X makes the number of follows within the last M minutes greater than N, Xhandy
SHALL show a pace toast naming N and M, in Chinese and English, and the stats bar's follow count SHALL
turn orange while that is true. The same SHALL hold for unfollows with their own N. Defaults: N = 10 for
follows and for unfollows, M = 60 minutes; the user can change all three on the settings page.

#### Scenario: Following fast
- **WHEN** the user's 11th follow within 60 minutes is confirmed, and today's total is under the limit
- **THEN** a toast like "1 小时内已关注超过 10 个，关注太快可能被限流" appears

#### Scenario: Pace recovers
- **WHEN** the follows within the last 60 minutes drop back to 10 or fewer
- **THEN** the follow count is no longer orange, unless the daily limit is passed

#### Scenario: Pace counts across tabs and reloads
- **WHEN** the user follows 6 accounts in one tab, reloads, and follows 5 more within the hour
- **THEN** the 11th follow shows the pace toast

### Requirement: One toast per follow
Each confirmed follow or unfollow SHALL show at most one toast. When both the daily limit and the pace
are passed, the daily-limit toast SHALL be shown.

#### Scenario: Both passed
- **WHEN** a follow passes both the daily limit and the pace
- **THEN** only the daily-limit toast appears

### Requirement: Reminders never block
Reminders SHALL NOT prevent, delay, undo or click anything. Only follows and unfollows that X confirmed
SHALL count.

#### Scenario: Over every limit
- **WHEN** the user keeps following past both limits
- **THEN** each follow goes through as normal on X, with a toast each time

### Requirement: Bounded follow times
Xhandy SHALL keep only the times of recent follows and unfollows needed for the pace check, locally, and
SHALL drop times older than 24 hours and keep at most 100 of each.

#### Scenario: Old times dropped
- **WHEN** a follow is recorded and stored follow times are older than 24 hours
- **THEN** those old times are removed
