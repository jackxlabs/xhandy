# Tasks

## 1. Read the data

- [x] 1.1 Replace `collectViews` with `collectPosts` in `src/page-hook.js` (keep the exported name working
  for existing tests or update them) and read `relationship_counts.followers` in `collectRelations`.
  Verify with unit tests on a made-up fixture shaped like real X (no real accounts): reply count, author
  handle and followers, `inReplyTo`, posts without views.
- [x] 1.2 Extend `store.cleanRelations` for the new fields (non-negative integers, valid ids and handles).
  Verify with unit tests for valid and malformed values.

## 2. Storage

- [x] 2.1 Add part `replied` and `relMeta.me` with defaults, validation in `cleanState`, the 5,000 cap,
  and inclusion in export/import/clear. Verify with unit tests: cap drops oldest, old exports import with an
  empty set, malformed ids are dropped.
- [x] 2.2 Add settings `showReplies` and `showReplied` (default true) to `DEFAULTS`, `cleanSettings` and
  `src/options/` with zh/en labels. Verify: an options e2e or unit check shows both switches saved.

## 3. Badge chips

- [x] 3.1 Record replied posts from confirmed sends and from the user's own posts in responses; keep the
  own follower count. Verify with e2e steps "a confirmed reply marks the post as replied" and "a reply from
  another device (in a response) marks the post".
- [x] 3.2 Render the replies/size chip and the replied chip in `annotate` with zh/en strings in
  `src/lib/i18n.js` and styles in `src/content.css` for light, dim and dark. Verify with e2e steps for each
  scenario in `specs/post-badges/spec.md` (all data, no own count, no data, switched off, replied chip).

## 4. Docs

- [ ] 4.1 Update README features (en and zh), README Privacy and PRIVACY.md for the replied post ids and
  own follower count. Verify: both languages list the new chips and the new stored data.
- [ ] 4.2 Run `npm test` and the e2e suite; report counts. Verify: all pass and the two "never" e2e steps
  are unchanged.

## Workflow follow-up

- Jack checks on real X that counts match X's own numbers on a few posts.
- Apply after `fix-duplicate-reply-records` is merged.
