# Design

## Context

`page-hook.js` walks every JSON response: `collectViews` finds `Tweet` objects (`__typename === "Tweet"`,
`rest_id`, `views.count`), `collectRelations` finds `User` objects with `relationship_perspectives`.
`content.js` keeps view counts in a memory-only `views` Map (max 5,000) and renders chips in `annotate`.
The signed-in handle comes from `SEL.profileLink`. Field paths were confirmed on real X on 2026-10-20
(see `fix-duplicate-reply-records` tasks 1.1): users carry `core.screen_name`, `rest_id`,
`relationship_counts.followers`; posts carry `legacy.reply_count`, `legacy.user_id_str`,
`legacy.in_reply_to_status_id_str`, and the author at `core.user_results.result`.

## Goals / Non-Goals

**Goals:** plain numbers on the badge; the replied mark survives reloads and covers other devices.

**Non-Goals:** no combined score; no persistence of reply or follower counts of other people (they
change quickly and are on every response anyway).

## Decisions

1. **Per-post stats replace `collectViews`.** A pure `collectPosts(root)` returns
   `{ id, views?, replies?, author?, authorFollowers?, inReplyTo? }` per `Tweet`. Reply and follower counts
   go into memory-only Maps next to `views` (same 5,000 cap). Keeping them out of storage avoids write
   load and stale data. Alternative: storing follower counts in `rel` entries; rejected, `rel` holds up to
   30,000 entries and is rewritten as a whole.
2. **Replied set as its own storage part `replied`**: `{ [postId]: timestamp }`, cap 5,000, oldest
   dropped. Sources: a confirmed send with `in_reply_to_status_id_str` (from the fix change), and any post
   in a response whose author handle equals the signed-in handle and that has `inReplyTo`. Writes are
   batched (at most one write per 2 s) like relation updates. New part with a default, so no storage
   version bump; `cleanState` validates ids with `isId`.
3. **Own follower count in `relMeta.me = { handle, followers, t }`**, updated when a `User` with the
   signed-in handle appears. Small, avoids a new part.
4. **Formatting** (revised after Jack saw it on real X, 2026-10-20: the chip was too long for X's name row
   and "0.4×" for smaller authors was confusing). `XH.replyChip` in i18n.js: reply count via `XH.compact`,
   author followers via `XH.kNum` (K/M in every language), ratio `Math.round(author / me)` only when ≥ 2. Chip order:
   age/heat, relationship, interactions, replies/size, replied, target.
5. **Settings** `showReplies` and `showReplied`, default `true`, in `DEFAULTS.settings`, `cleanSettings`
   and the options page.

## Risks / Trade-offs

- [Signed-in handle not found (profile link selector changed)] → no replied marks from other devices and
  no ratio; confirmed sends still mark posts. The rest of the badge is unaffected.
- [Badge gets crowded] → each chip has its own switch; replies chip is short by design.
- [Reply counts lag X's UI] → the count is what X sent with the post; acceptable, it is a rough signal.

## Migration Plan

New part and settings get defaults; nothing to migrate. Old exports import with an empty `replied`.
