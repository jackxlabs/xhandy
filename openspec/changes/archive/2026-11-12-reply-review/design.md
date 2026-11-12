# Design

## Context

See proposal.md for motivation. What exists today:

- `src/page-hook.js` `collectPosts(root)` walks each cloned response and returns, per `Tweet`,
  `{ id, views?, replies?, author?, authorFollowers?, inReplyTo? }`. `collectCreated` reads the user's own
  `CreateTweet` / `CreateNoteTweet` result and returns `{ ok, kind, text, to, inReplyTo }` (no id, no time).
- `src/content.js` keeps `views`, `replyCounts`, `authorFollowers`, `handleFollowers` in memory-only maps
  (trimmed), and already notices own replies in responses (`p.author === me && p.inReplyTo`) to fill
  `xh:replied`. The user's own posts already get a heat chip, so view counts for them reach the content script.
- The signed-in account's follower count is written to `relMeta.me.followers` through `scheduleMe`.
- `xh:days` holds `{ likes, replies, posts, follows, unfollows, seconds }` per local date; the cleaner in
  `store.js` rebuilds each day from that fixed field list, so an extra field is dropped on import today.
- The side panel has two modes, `nfb` and `keys` (`togglePanel(open, mode)`), each with a popup row.
- Every write of a part rewrites the whole part as JSON; `xh:rel` showed how costly that gets, so a new part
  must be small and written rarely.

## Goals / Non-Goals

**Goals:**
- Record own posts' numbers and reply context with no new request, no new hook and no new permission.
- Keep the grouping logic in pure functions that unit tests can cover without a browser.
- Keep writes of the new part rare and small.

**Non-Goals:**
- Complete history. Numbers are as fresh as the last time X showed the post.
- IndexedDB, a background service worker, or any change to how `rel` is stored.

## Decisions

### 1. Fields read from X

`collectPosts(root, me)` gains, per post:
- `likes` from `legacy.favorite_count` and `at` from `Date.parse(legacy.created_at)` (both for every post:
  the parent's `at` is needed for reply delay);
- `to` from `legacy.in_reply_to_screen_name`;
- `text`, only when the author is `me` (handle or id match, same test as `collectInbound`): the displayed
  text (`note_tweet` text, else `full_text` cut to `display_text_range`), entities decoded, cut to 80
  characters. Other people's text is never put in the payload.

`collectCreated` gains `id` (`res.rest_id`) and `at` (`legacy.created_at`, else the receive time).
`emit` passes `me` to `collectPosts`. `collectViews` stays an alias.

Alternative considered: read numbers from the DOM of the user's posts. Rejected: likes and views are
abbreviated in the DOM ("1.2K"), and selectors break more often than the response shape.

### 2. Storage: new part `mine`

`mine: {}` in `DEFAULTS`, key `xh:mine`: post id → record with short keys, all optional except `k` and `t`:

| key | meaning |
|---|---|
| `k` | `"r"` reply or `"p"` post |
| `t` | created at (ms) |
| `v`, `l`, `r` | views, likes, replies; absent = unknown |
| `u` | when `v`/`l`/`r` were last received |
| `to` | handle replied to |
| `x` | first 80 characters of the text |
| `pt` | parent post created at |
| `pf` | parent author's followers when recorded |
| `mf` | the user's followers when recorded |
| `ph` | parent's views per hour at send time (only set from the create confirmation) |

`MAX_MINE = 2000`, trimmed oldest-`t` first inside the same update that adds records. `cleanMine` validates
ids with `ID`, handles with `isHandle`, numbers as non-negative finite, `x` as a string cut to 80, and drops
anything else; it runs on import and on load like the other cleaners.

No data is converted, so `VERSION` stays 5: a missing `xh:mine` reads as `{}` like any part without a stored
key. (If the implementer finds that a part without a key does not fall back to `DEFAULTS`, stop and report;
do not bump the version without review.)

Follower snapshots go into `days[date].followers`, an optional non-negative integer. The days cleaner keeps
it only when it is a valid number and otherwise leaves the field absent (never 0). `store.today()` does not
add it. Alternative considered: a separate `growth` part. Rejected: one more key to load for a single number
per day, and `days` is already read by the popup and the panel.

### 3. Recording in the content script

All in the existing payload handler, guarded by `settings.review`:

- **Create confirmation** (`payload.c` entry with `ok` and `id`): queue a record `{ k, t: at, to, x }`. For a
  reply, add context from the memory maps for `inReplyTo`: `pt` from a new memory-only `postTimes` map,
  `pf` from `authorFollowers`, `mf` from `relMeta.me.followers` (skip when 0), and `ph` from the existing
  `viewsPerHour` inputs when both views and time are known.
- **Own post in a response** (`p.author` is me): queue an upsert. Stats `v`/`l`/`r` are set only for fields
  present in the payload; `u` is set when any changed. If the record is new and is a reply, add `pt`, `pf`,
  `mf` from the maps when available, never `ph`. Context keys already present are not overwritten.
- `postTimes` is filled for every post with `at`, trimmed like the other maps.
- **Follower snapshot**: where `scheduleMe` is called with a follower count X actually sent
  (`typeof meUser.followers === "number"`), queue `followers` for today.

Writes are batched like `repliedPending`: one `store.update(["mine"], …)` at most every 10 seconds, and only
when the batch changes something (a value differs or a record is new). The snapshot rides on a separate
`store.update(["days"], …)` only when today's stored value differs. Parts are declared exactly; no
full-state update.

### 4. Review computation: `src/lib/review.js`

A new file exporting pure functions on `XH.review` (and `module.exports` for tests), loaded before
`content.js` in `manifest.json`:

- `median(numbers)`.
- `groups(mine, settings, now)` → for each of the three dimensions, an ordered list of
  `{ id, n, median | null, best: boolean }`, applying the spec's eligibility (reply, `v` known, age 24 h to
  90 d), the minimum of 5, and the 1.5× rule. Delay = `t − pt`; a negative delay is treated as unknown.
  Size = `pf / mf`. Heat buckets use `settings.heatWarm` / `settings.heatHot` against `ph`.
- `topReplies(mine, now, limit = 10)` (last 30 days, `v` known, sorted by `v` then `l`).
- `week(mine, now)` → `{ n, median }` for replies created in the last 7 days (median over those with `v`).
- `growth(days, now)` → `{ d7, d30, series }` where `d7`/`d30` are `null` with fewer than two snapshots in
  the period and `series` is 30 entries `{ day, followers | null, replies }`.

Median rather than mean: one reply under a viral post would otherwise decide every group.

### 5. View

A third panel mode `review` in `content.js` next to `nfb` and `keys` (add it to `PANEL_MODES` so the panel
is restored after a page load, and close it without restoring when the `review` switch is off, like `keys`),
reusing `buildPanel`, the panel
header, `xh-panel-muted` and the existing row styles. The chart is inline SVG built with `el`-style DOM
calls (no `innerHTML` with data, no library): bars for replies, a polyline for followers split at gaps.
Numbers use `XH.compact`. All text through `t()` with keys in both locale files.

Shortcut: `Alt+R` handled where `Alt+U` / `Alt+K` are, with `!isTyping(e.target)` and `e.code === "KeyR"`.
Popup: a third entry row with id `review` using the same click handler loop, hidden when the switch is off.
Settings: switch `review: true` in the General section, wired like `topPosts`.

The link to the Replies tab is `/<handle>/with_replies`, an `<a>` the user clicks; shown only when the
signed-in handle is known.

## Risks / Trade-offs

- [X omits `views.count` or renames `favorite_count`] → fields are optional and stay unknown; the view then
  shows counts without medians. The final manual check on real X compares against X's own numbers.
- [Stale numbers: views keep growing after the last sighting] → the view shows when numbers were last
  received and how to refresh them; groups ignore replies younger than 24 h.
- [Context is approximate for replies not sent in this browser (`pf`, `mf` taken when first seen)] → `ph` is
  never set for them, and delay is exact because it comes from two creation times.
- [Small samples read as truth] → minimum of 5 per group, counts always shown, 1.5× rule before "best".
- [Write cost] → at 2,000 records the part is roughly 300 KB; one write per 10 s at most and only on change.
  It moves to per-record storage with the rest of the growing data later.
- [Events on `xh-relations` can be forged by page scripts] → records only for the signed-in handle, values
  validated by `cleanMine`, and the cap bounds the damage to wrong numbers in the user's own view.
- [`Alt+R` while typing on macOS types a character] → the shortcut is ignored while typing, same as `Alt+S`.

## Migration Plan

No conversion. Rollback: the older version ignores `xh:mine` and, on import, drops `days[*].followers`.
