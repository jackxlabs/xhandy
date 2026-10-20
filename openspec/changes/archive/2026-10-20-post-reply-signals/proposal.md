# Proposal

## Why

People who grow by replying pick posts by three signals beyond age and heat: how crowded the replies
already are, how big the author is compared with them (growth guides say 5–20× your size), and whether
they already replied. Xhandy shows age, views per hour, relationship and interaction history, but not
these. ReplyWisely, the closest competitor, folds similar signals into one opaque score; Xhandy's voice is
"plain", so it shows the numbers themselves. All of the data is already in the responses X sends while
the user scrolls (confirmed on real X 2026-10-20: `legacy.reply_count` on posts,
`relationship_counts.followers` on users, `in_reply_to_status_id_str` on the user's own replies).

## What Changes

- New badge chip: reply count and author follower count, with the author's size relative to the user
  when the user's own follower count is known (for example "💬 23 · 4.6万粉 · 12×").
- New badge chip "✓ replied" on posts the user has already replied to, from any device, as far as X has
  shown it in this browser.
- Settings: one switch per new chip, both on by default.
- Stored data: the ids of posts the user replied to (capped) and the user's own follower count.

Out of scope: an overall "worth replying" score, sorting or filtering the timeline, keyword highlighting
(v0.6), and anything about other people's interactions with the user (change `reverse-interactions`).

Depends on `fix-duplicate-reply-records` (confirmed sends give the replied-to post id).

How the rules are kept: read-only, from X's own responses; no requests; the new data stays in
`chrome.storage.local`, and README Privacy and PRIVACY.md list it.

## Capabilities

### New Capabilities
- `post-badges`: the chips Xhandy adds next to a post's author name, what each shows and when.

### Modified Capabilities

None (no specs exist yet).

## Impact

- `src/page-hook.js`: `collectViews` grows into per-post stats (views, reply count, author, replied-to post);
  `collectRelations` also reads follower counts.
- `src/content.js`: new chips in `annotate`, the replied set, the user's own follower count.
- `src/lib/store.js`: new part `replied`, `relMeta.me`, validation; `src/lib/i18n.js`: labels in zh and en.
- `src/options/`: two switches. Tests and fixtures; README feature list (en, zh), Privacy, PRIVACY.md.
