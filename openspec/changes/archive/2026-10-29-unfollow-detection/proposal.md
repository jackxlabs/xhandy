# Proposal

## Why

Xhandy currently maintains follow relationships (`xh:rel`) and surfaces accounts you follow that don't follow you back in the Not Following Back panel (`Alt+U`). However, this list is a flat snapshot: users cannot distinguish between accounts that never followed back and friends who were mutuals but recently unfollowed them. Furthermore, keeping this list up to date currently requires users to manually navigate to their `/following` page and scroll through their entire follow list.

Users want to know when mutual connections unfollow them without having to constantly perform full-page sweeps or run risky automated background scrapers. Since X already delivers relationship data for post authors and profile visits during normal daily browsing, Xhandy can passively track relationship baselines and detect when a verified mutual drops follow status, providing timely insights with zero extra network requests and zero bot-detection risk.

## What Changes

- **Mutual Baseline Tracking**: Track whether an account was confirmed as a mutual connection (`mAt`: timestamp when mutual relationship was observed) in `xh:rel`.
- **Passive Unfollow Detection**: When incoming relation data from normal browsing (`xh-relations`) explicitly indicates that an account the user follows has `followed_by: false`, while our stored baseline recorded them as a mutual (`mAt` present), record `lostAt: Date.now()`.
- **False-Positive Safeguards**: Only flag an unfollow when X explicitly sends `relationship_perspectives.followed_by === false` (never on omitted/null fields), and never when the user initiated the unfollow (`f: false`).
- **Recent Unfollows in Not Following Back Panel (`Alt+U`)**:
  - Add a distinct "Recent unfollows" section or filter at the top of the panel listing accounts whose unfollow was detected, sorted by `lostAt` descending.
  - Display how long ago the unfollow was detected (`lostAt`) and any known past interactions.
  - Allow the user to dismiss/acknowledge individual unfollow alerts with a dismiss button (`×`), setting `ackAt: Date.now()`.
- **Preserve Manual Full-List Audits**: Users can still visit their `/following` page to audit silent or inactive accounts; doing so continues to update the full baseline and will detect unfollows for any previously recorded mutuals encountered.

### Out of Scope

- No background polling, automated fetch loops, or active GraphQL requests to X's internal endpoints. All data comes exclusively from responses X already sends during organic browsing.
- No automated unfollowing or bulk unfollow actions. The panel remains strictly informational; unfollowing must always be executed manually by the user on X.
- No detection for accounts that never produce network activity seen by the browser (silent accounts still require visiting their profile or visiting `/following`).

### Rule Adherence

- **Never act for the user**: The extension remains read-only. Unfollow alerts only link to profiles; there are no bulk actions and no automatic unfollow triggers.
- **Offline by default**: Zero network requests are made. Detection relies entirely on cloning X's existing web responses via `page-hook.js`.
- **Local storage only**: All baseline timestamps and unfollow events are stored locally in `xh:rel` in `chrome.storage.local`.

## Capabilities

### New Capabilities

- `unfollow-detection`: Tracks mutual relationship baselines, passively detects unfollows from observed network responses during daily browsing, enforces false-positive safeguards, and surfaces recent unfollows with dismissal in the Not Following Back panel.

### Modified Capabilities

None.

## Impact

- `src/page-hook.js`: `collectRelations` currently coerces `followedBy: !!r.followed_by` (and `following: !!r.following`), so an omitted field arrives as `false` and would look like an unfollow. Pass both through as three-state values: `true`, `false`, or omitted when X did not send a boolean.
- `src/lib/store.js`:
  - `cleanRelations` currently keeps only `=== true`, which again turns "omitted" into `false`. Keep `following` / `followedBy` only when they are booleans and drop them otherwise.
  - Extend `cleanRelEntry` to accept and sanitize `mAt`, `lostAt`, and `ackAt`. Update `store.test.js` to verify serialization and sanitization.
- `src/content.js`:
  - In `xh-relations` event listener (today it writes `{ f: u.following, fb: u.followedBy }` straight into `relPending`), keep the stored `f` / `fb` when the incoming value is omitted, and compare incoming relationship entries against `S.rel`. If `prev.fb === true` and `incoming.followedBy === false` (and `incoming.following === true`), set `lostAt: Date.now()`. If `incoming.followedBy === true`, update `mAt: Date.now()` and clear `lostAt` / `ackAt`.
  - In `renderNfbPanel()`, render the "Recent unfollows" section when unacknowledged unfollows exist. Handle dismiss action.
- `src/locales/en.js` & `src/locales/zh.js`: Add i18n text keys for the recent unfollows section, time detected, and dismiss button tooltip.
- `test/store.test.js`: Add tests for cleaning and preserving unfollow baseline metadata, and for `cleanRelations` keeping omitted fields omitted.
- `test/relations.test.js`: Add tests for `collectRelations` three-state output and for the baseline / unfollow state transitions.
- `test/e2e.mjs`: Add verification for unfollow detection in the panel and dismiss functionality.
