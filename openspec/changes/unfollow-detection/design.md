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
  - `mAt`: Timestamp when the account was last seen as a mutual (`following === true && followedBy === true` in an update).
  - `lostAt`: Timestamp when unfollow was first detected.
  - `ackAt`: Timestamp when user dismissed the unfollow alert.
- **Alternative considered**: Create a separate top-level storage part (`xh:unfollows`).
  - *Rejected*: Adding a top-level part requires changing `PARTS`, migrating storage version, and synchronizing writes across two keys. Since `xh:rel` is already loaded and updated during relation events, embedding three optional numerical fields is cleaner, lighter, and backwards-compatible.

### 2. State Transitions During Relation Processing

In `src/content.js` within the `xh-relations` handler:
- **Case 0: Handle Reused**: if the incoming id and the stored id are both known and differ, start from an empty record.
- **Case 1: Mutual Confirmed (`following === true && followedBy === true`)**:
  - Set `f = true`, `fb = true`.
  - Set `mAt = Date.now()` on every mutual sighting (last seen mutual).
  - Delete `lostAt` and `ackAt` (if they previously existed, connection is restored).
- **Case 2: Unfollow Detected (`following === true && followedBy === false`)**:
  - If previous record has `mAt` (not merely `f` and `fb` both true, which also happens after the user unfollows and follows again):
    - Set `lostAt = existing.lostAt || Date.now()`.
  - Set `f = true`, `fb = false`.
- **Case 3: User Unfollowed First (`following === false`)**:
  - Do NOT record `lostAt`.
  - Set `f = false`, update `fb` as received.
- **User's own unfollow** (`onFriendship`, X confirmed `friendships/destroy`): delete `mAt`, `lostAt` and `ackAt` (`store.relAfterFriendship`), and drop `following` from any sighting still waiting in the 1 s batch, since it was read before the unfollow.

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

**Answer (checked on real X, 2026-10-29)**: X sends the key explicitly. In the GraphQL `UserByScreenName` response, a followed account that does not follow back has `"followed_by": false, "following": true` inside `relationship_perspectives`; a mutual has `"followed_by": true`. The old REST 1.1 user lists (flat user objects with `next_cursor` / `total_count`) also carry an explicit `"followed_by": false`, but `collectRelations` does not read that shape today. Case 2 stays as designed.

## Risks / Trade-offs

- **[Risk]** Partial responses from X omitting `followed_by` (or `following`).
  → **Mitigation**: Three-state flags end to end (decision 5). If a flag is omitted, keep the stored value and do not trigger any transition.
- **[Risk]** Only `UserByScreenName` has been checked on real X. If some other GraphQL operation (search typeahead, lists, who-to-follow) sends `followed_by: false` as a placeholder for a mutual, that would raise false alerts. The existing Alt+U list relies on the same flags, so such placeholders would also put mutuals into that list; whether that has ever been seen is still to be confirmed by Jack on real X.
- **[Risk]** X may omit `followed_by` whenever it is false, which would make detection impossible under the strict rule.
  → **Mitigation**: Verify on real X first (decision 5, open question; task 0.1).
- **[Trade-off]** `xh:rel` keeps one record per handle, so `lostAt` is cleared when the account follows back again. There is no history of past unfollows. Accepted for this change; a history list would belong to the planned IndexedDB move.
- **[Risk]** Inactive mutuals who never appear on timelines won't be detected immediately.
  → **Mitigation**: Accepted trade-off of the offline-by-default architecture. Users can still do a full sweep by scrolling `/following`, which will trigger detection for all visited accounts against their recorded `mAt`.
- **[Risk]** Unacknowledged alerts piling up.
  → **Mitigation**: The dismiss button (`×`) allows acknowledging each alert. Once acknowledged (`ackAt`), the account remains in the regular not-following-back list but leaves the prominent "recent unfollows" block.

## Migration Plan

- Storage version 5: records with `f: true`, `fb: true` and no `mAt` get `mAt = t` (when they were last seen, as mutuals). Detection then trusts only `mAt`. Other records are unchanged, and the `rel` key is written only if something changed.
- Imports (`replaceAll`) keep `mAt` / `lostAt` / `ackAt` when present but do not backfill `mAt`: in a version 5 export, `f` and `fb` both true without `mAt` can mean the user unfollowed and followed again. Mutuals from an older export get a baseline on their next mutual sighting.
