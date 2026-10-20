# Design

## Context

Notifications response structure, from a real response on 2026-10-20 (store fixtures with made-up data
only): `data.viewer_v2.user_results.result` is the viewer (`rest_id`), with
`notification_timeline.timeline.instructions[]`; `TimelineAddEntries.entries[].content.itemContent` is either

- `TimelineNotification` with `id`, `timestamp_ms`, `notification_icon` (`heart_icon` for likes,
  `person_icon` for follows, `bell_icon` for "new post" alerts), `template.__typename ===
  "TimelineNotificationAggregateUserActions"`, `template.from_users[].user_results.result` (full users,
  truncated: "Tian Yi and 37 others" listed 10), `template.target_objects[].tweet_results.result` (the
  user's posts). `clientEventInfo.element` names the kind (`users_liked_your_tweet`,
  `user_liked_multiple_tweets`, `users_followed_you`, `device_follow_tweet_notification_entry`).
- `TimelineTweet` with `tweet_results.result` (a full post), `clientEventInfo.element`
  `user_replied_to_your_tweet`.

Posts carry `legacy.in_reply_to_user_id_str`, `in_reply_to_screen_name`, `entities.user_mentions[]`,
`quoted_status_result.result`, and the author at `core.user_results.result`.

## Goals / Non-Goals

**Goals:** honest lower-bound counts from what X has shown; never double count.

**Non-Goals:** completeness; reposts and follows (no repost sample yet; follows are relationship data).

## Decisions

1. **Like detection by structure, not text.** A notification counts as likes when
   `notification_icon === "heart_icon"` and the template is the aggregate type; `element` is a secondary
   check (`*liked*`). Text such as "liked 6 of your posts" is localised and never parsed. Keys:
   `L:<likerId>:<postId>` per pair of `from_users` × `target_objects` whose author is the viewer.
2. **Replies, quotes, mentions by scanning every post**, not only notifications, so the user's own post
   pages count too. One classification per post, priority reply > quote > mention, key `P:<postId>`.
   Mentions skip the leading auto mentions of a reply (inside `display_text_range`'s cut).
3. **Identity.** `me` = signed-in handle (`SEL.profileLink`) plus viewer `rest_id` from
   `viewer_v2` when seen (kept in `relMeta.me.id`, introduced by `post-reply-signals`). Already present on main: `relMeta.me = { handle, followers, id, t }`, `collectPosts` with author handle,
   and own-post detection in `annotate` (`own`) and `isMe()` in content.js. Posts match by id
   when known, else by handle. Unknown → `collectInbound` is not called.
4. **Storage.** `people[h].in = { likes, replies, quotes, mentions, last }` (absent = zeros, so no version
   bump). Counted keys in part `inSeen`: `{ key: timestamp }`, cap 20,000, oldest dropped, batched writes
   (one per 2 s). Writes declare `["people", "inSeen"]`.
5. **Event payload.** page-hook emits raw candidates `n: [{ kind, from: {handle,id,name}, key, at }]`;
   the content script drops candidates whose key is in `inSeen` or whose author is the user, then
   counts. Validation in `cleanRelations` (kind enum, handle, key pattern `^[LP]:\d{1,20}(:\d{1,20})?$`).
6. **Chip text.** `interacted_both` strings in zh/en ("我{a} · 他{b} · {ago}", "you {a} · them {b} · {ago}"),
   kept as short as today's chip since X's name row truncates long badges; latest time = max(own `last`, `in.last`). Setting
   `showInbound`, default true.

## Risks / Trade-offs

- [Forged events inflate counts] → same exposure as today's relation events; worst case is a wrong
  number in the badge, never an action. Keys must look like X ids.
- [`inSeen` grows on heavy accounts] → cap 20,000 (~1 MB); oldest keys may be recounted only if X sends
  that months-old notification again, which is rare.
- [X changes notification structure] → nothing is counted; existing chips are unaffected. A unit test on
  the fixture documents the expected shape.

## Migration Plan

Additive: new part with defaults, new optional field on people entries. Old exports import with zero
reverse counts.

## Open Questions

- Repost and quote notifications: their `notification_icon` / `element` values are not in the sample.
  Quotes are already covered by post scanning; reposts can be added later from a sample without changing
  this design.
