# Tasks

## 1. Parse what X sends

- [ ] 1.1 Write `test/fixtures/notifications.json` with made-up accounts and text, shaped like the real
  notifications response described in design.md (a like, a multi-post like, a follow, a "new post" alert,
  two replies). Verify: the file contains no real handles or ids from Jack's account.
- [ ] 1.2 Add the pure `collectInbound(json, me)` to `src/page-hook.js` and export it. Verify with unit
  tests: like pairs and keys, multi-post like lower bound, follows and "new post" alerts ignored, replies /
  quotes / mentions classified once with priority, the user's own posts ignored, auto mentions of a reply
  not counted as mentions, unknown `me` returns nothing.
- [ ] 1.3 Emit candidates in the event and validate them in `store.cleanRelations`. Verify with unit tests
  for valid and malformed candidates.

## 2. Storage

- [ ] 2.1 Add `people[h].in` handling in `cleanState` and part `inSeen` with the 20,000 cap, included in
  export/import/clear. Verify with unit tests: cap, old exports import, malformed entries dropped.

## 3. Counting and display

- [ ] 3.1 Count candidates in the content script (skip seen keys and the user's own posts; batched
  writes). Verify with e2e steps: "a notifications response counts likes and replies from others" and
  "loading the same notifications twice does not change counts".
- [ ] 3.2 Show both directions in the interaction chip with zh/en strings, and add the `showInbound`
  setting to options. Verify with e2e steps for the three chip scenarios in the spec.

## 4. Docs

- [ ] 4.1 Update README features (en, zh), README Privacy and PRIVACY.md (received interaction counts and
  counted ids). Verify: both languages describe the new data and its source.
- [ ] 4.2 Run `npm test` and the e2e suite; report counts. Verify: all pass and the two "never" e2e steps
  are unchanged.

## Workflow follow-up

- Jack checks on real X: open notifications, then a post by someone who liked him; the chip shows their
  count. Capture one repost notification sample for a follow-up change.
