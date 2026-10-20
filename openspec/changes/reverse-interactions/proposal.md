# Proposal

## Why

Xhandy counts the user's interactions with each author (likes and replies they gave), but not the other
direction. Jack asked for it on 2026-10-20: whether a relationship is two-way decides whether it is worth
keeping up, and "蓝V互关" culture runs on reciprocity. X already sends this to the browser: the
notifications timeline lists who liked, replied to, quoted or mentioned the user, and posts that reply to
the user appear in conversation views (structure confirmed from a real notifications response, 2026-10-20).

## What Changes

- Count, per account, what that account did to the user: likes of the user's posts, replies to the
  user, quotes of the user's posts, mentions of the user, with the time of the latest one.
- Sources: the notifications timeline, and any post in any response that replies to, quotes or mentions
  the signed-in user.
- Each interaction is counted once, however often X sends it again (stored ids of what was counted,
  capped).
- The interaction chip shows both directions, for example "我3 · 他5 · 今天" /
  "you 3 · them 5 · today" (no longer than today's chip: Jack found the badge row too long); a setting switches the reverse part off.

Out of scope: reposts and follows from notifications (no sample of a repost notification yet; follows are
already covered by relationship labels), fetching notifications the user has not scrolled to, opening
"show all" lists, and any history before the user installs this version.

Depends on `fix-duplicate-reply-records` (storage version 3) and reuses `collectPosts` from
`post-reply-signals`; apply after both.

How the rules are kept: read-only from responses X already sends; no requests, no clicks on "show all";
the counts and counted ids stay in `chrome.storage.local`, documented in README Privacy and PRIVACY.md.

## Capabilities

### New Capabilities
- `reverse-interactions`: what other accounts did to the user, how it is counted and shown.

### Modified Capabilities

None (no specs exist yet; the badge chip itself is in `post-badges`, added by `post-reply-signals`,
whose interaction chip text this change extends).

## Impact

- `src/page-hook.js`: pure `collectInbound(json, me)` for notification entries and posts aimed at the user.
- `src/lib/store.js`: `people[h].in = { likes, replies, quotes, mentions, last }`, new part `inSeen`
  (counted keys, capped), validation, export/import.
- `src/content.js`: counting and the two-direction chip; `src/lib/i18n.js`; `src/options/` switch.
- Tests, fixtures (made-up accounts shaped like the real response), README (en, zh), PRIVACY.md.
