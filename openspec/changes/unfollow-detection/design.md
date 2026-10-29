# Design

## Context

See `proposal.md - Why` for motivation. Currently, `src/page-hook.js` clones X's API responses and dispatches `xh-relations` containing parsed `User` objects with `following` and `followedBy` flags. `src/content.js` batches these updates and stores them in `xh:rel` under `chrome.storage.local`. The Not Following Back panel (`Alt+U`) filters `s.rel` for `{ f: true, fb: false }` and renders a flat list.

## Goals / Non-Goals

**Goals:**
- Record mutual baselines (`mAt`) and detect when a mutual connection drops follow status (`lostAt`) passively during daily browsing.
- Prevent false positives from partial payloads or user-initiated unfollows.
- Present recent unfollows in a dedicated section in the `Alt+U` panel with dismiss capabilities (`ackAt`).
- Maintain zero extra network requests and full backwards compatibility with stored data.

**Non-Goals:**
- No automated network requests, background polling, or active GraphQL requests.
- No automated unfollow actions or bulk operations.
- No push desktop notifications or aggressive modal popups (only subtle panel presentation).

## Decisions

### 1. Store Baseline and Timestamps Directly in `xh:rel`

- **Choice**: Extend each handle entry in `xh:rel` with optional numerical timestamps:
  - `mAt`: Timestamp when mutual follow was confirmed (`f === true && fb === true`).
  - `lostAt`: Timestamp when unfollow was first detected.
  - `ackAt`: Timestamp when user dismissed the unfollow alert.
- **Alternative considered**: Create a separate top-level storage part (`xh:unfollows`).
  - *Rejected*: Adding a top-level part requires changing `PARTS`, migrating storage version, and synchronizing writes across two keys. Since `xh:rel` is already loaded and updated during relation events, embedding three optional numerical fields is cleaner, lighter, and backwards-compatible.

### 2. State Transitions During Relation Processing

In `src/content.js` within the `xh-relations` handler:
- **Case 1: Mutual Confirmed (`following === true && followedBy === true`)**:
  - Set `f = true`, `fb = true`.
  - Set `mAt = Date.now()`.
  - Delete `lostAt` and `ackAt` (if they previously existed, connection is restored).
- **Case 2: Unfollow Detected (`following === true && followedBy === false`)**:
  - If previous record had `fb === true` OR `mAt` set:
    - Set `lostAt = existing.lostAt || Date.now()`.
  - Set `f = true`, `fb = false`.
- **Case 3: User Unfollowed First (`following === false`)**:
  - Do NOT record `lostAt`.
  - Set `f = false`, update `fb` as received.

### 3. Sanitization in `store.cleanRelEntry`

Extend `cleanRelEntry(r)` in `src/lib/store.js`:
```js
function cleanRelEntry(r) {
  if (!isObj(r)) return null;
  const entry = { f: r.f === true, fb: r.fb === true, id: isId(r.id) ? r.id : null, n: str(r.n, 100), t: num(r.t) };
  if (isNonNegInt(r.mAt)) entry.mAt = r.mAt;
  if (isNonNegInt(r.lostAt)) entry.lostAt = r.lostAt;
  if (isNonNegInt(r.ackAt)) entry.ackAt = r.ackAt;
  return entry;
}
```
This safely validates imported or stored data without rejecting older entries that lack these fields.

### 4. UI Structure in Not Following Back Panel

- In `renderNfbPanel()`:
  - Partition accounts:
    - `recentUnfollows`: accounts where `lostAt` exists, `!ackAt`, and `!fb && f`.
    - `standardNfb`: all other accounts where `!fb && f` (including dismissed unfollows).
  - If `recentUnfollows` has items, render `<div class="xh-panel-section xh-panel-recent">`:
    - Section header: "Recently unfollowed you / 近期取关 (count)"
    - List of entries showing handle, display name, `XH.ago(lostAt)`, and dismiss button `×`.
    - Clicking dismiss sets `ackAt: Date.now()` in `xh:rel` and re-renders the panel.
  - Below that, render the standard searchable not-following-back list as before.

### 5. Three-State Relation Flags End to End

The safeguard in decision 2 only works if "X did not say" survives the trip from X's response to the handler. Today it does not:

- `src/page-hook.js` `collectRelations`: `following: !!r.following, followedBy: !!r.followed_by` turns an omitted field into `false`.
- `src/lib/store.js` `cleanRelations`: `following: x.following === true, followedBy: x.followedBy === true` does the same again.

**Choice**: Both places pass a flag through only when it is a boolean (`typeof === "boolean"`) and leave the key out otherwise. In the `xh-relations` handler in `src/content.js`, an omitted flag keeps the stored value (`prev.f` / `prev.fb`, or `false` for a new handle) and never triggers a transition. This also stops an omitted `following` from flipping a stored `f: true` to `false` (case 3) and hiding the account from the panel.

**Open question, to check on real X before implementing case 2**: whether `relationship_perspectives` sends an explicit `followed_by: false` or simply leaves the key out when someone does not follow you. If X omits it, the three-state rule means unfollows are never detected from that shape, and we need another signal (for example a payload that also carries an explicit `following: true` from the same object, treating a missing `followed_by` as `false` only there). Record what the real responses look like in this design before writing case 2.

## Risks / Trade-offs

- **[Risk]** Partial responses from X omitting `followed_by` (or `following`).
  → **Mitigation**: Three-state flags end to end (decision 5). If a flag is omitted, keep the stored value and do not trigger any transition.
- **[Risk]** X may omit `followed_by` whenever it is false, which would make detection impossible under the strict rule.
  → **Mitigation**: Verify on real X first (decision 5, open question; task 0.1).
- **[Trade-off]** `xh:rel` keeps one record per handle, so `lostAt` is cleared when the account follows back again. There is no history of past unfollows. Accepted for this change; a history list would belong to the planned IndexedDB move.
- **[Risk]** Inactive mutuals who never appear on timelines won't be detected immediately.
  → **Mitigation**: Accepted trade-off of the offline-by-default architecture. Users can still do a full sweep by scrolling `/following`, which will trigger detection for all visited accounts against their recorded `mAt`.
- **[Risk]** Unacknowledged alerts piling up.
  → **Mitigation**: The dismiss button (`×`) allows acknowledging each alert. Once acknowledged (`ackAt`), the account remains in the regular not-following-back list but leaves the prominent "recent unfollows" block.

## Migration Plan

- Backward-compatible schema extension: Existing records in `xh:rel` remain valid. Any existing record with `fb: true` will establish `mAt` on its next observed update.
- No version bump strictly required, but `store.test.js` will include full coverage for the new optional fields.
