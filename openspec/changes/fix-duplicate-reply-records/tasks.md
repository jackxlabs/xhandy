# Tasks

## 1. Ground truth from real X

- [x] 1.1 Jack (manual, on real X, 2026-10-20) checked the composer and a real `CreateTweet` response.
  Findings:
  - The reply dialog composer has three matching elements: `tweetTextarea_0_label` (not editable),
    `tweetTextarea_0RichTextInputContainer` (not editable) and `tweetTextarea_0` (contenteditable). This
    confirms the tripling.
  - `CreateTweet` answers `data.create_tweet.tweet_results.result` with no `__typename` on `result`.
    `result.legacy` has `full_text`, `display_text_range`, `id_str`, `in_reply_to_status_id_str`,
    `in_reply_to_screen_name`, `in_reply_to_user_id_str`, `user_id_str`, `is_quote_status`.
    `result.core.user_results.result` is the user's own account (`core.screen_name`,
    `relationship_counts.followers`).
  - `display_text_range` counts Unicode code points, not UTF-16 units: cut with `Array.from(full_text)`.
    In the sample, a reply to a thread that mentions @grok starts with two auto mentions, both inside the
    cut-off range.
  Fixtures are written from this structure with made-up accounts and text, never from the real response.

## 2. Storage version 3 and history cleanup

- [x] 2.1 Add `untriple` to `src/lib/store.js`, apply it in `cleanState`, and verify with unit tests in
  `test/store.test.js`: a triple collapses, two copies and differing copies stay, empty text stays.
- [x] 2.2 Bump `VERSION` to 3 and add the v2 → v3 step to `migrate()` (after v1 → v2). Verify with
  migration tests: a v2 store with tripled entries ends with one copy each, same entry count, `xh:v` = 3;
  a v1 store migrates through both steps; `replaceAll` of an old export file is cleaned.

## 3. Read X's answer to the user's own posts

- [ ] 3.1 Add the pure `collectCreated(url, json, ok)` to `src/page-hook.js` and export it. Verify with unit
  tests (new `test/created.test.js` or in `test/relations.test.js`): reply with display range, quote post,
  long post via `CreateNoteTweet`, `TweetWithVisibilityResults` unwrap, HTML entities decoded, error
  response → `{ ok: false }`, 200 without errors or result → `{ shape: "unknown" }`, other URLs → nothing.
- [ ] 3.2 Make the fetch and XHR wrappers emit `{ seen: true }` when a post request starts and pass `ok`
  for post URLs on failure; other URLs keep today's behaviour. Verify: existing relation tests still pass
  and a unit or e2e check shows a failed post emits `{ ok: false }`.
- [ ] 3.3 Extend `store.cleanRelations` to return a validated `c` array. Verify with unit tests: valid
  entries pass; non-string text, text over 25,000 characters, invalid handle and unknown fields are dropped.

## 4. Pending send in the content script

- [ ] 4.1 Change `composerText` to read innermost matched boxes only, and update
  `test/fixtures/timeline.html` so the composer has X's real nesting (from 1.1). Verify: new e2e step
  "nested composer text is recorded once".
- [ ] 4.2 Replace immediate recording in `onSend` with the pending-send flow from design.md decision 2
  (seen / ok / fail / 3 s fallback / 60 s expiry; ignore confirmations with no pending send). Teach the e2e
  route to answer `/graphql/*/CreateTweet` like X, and have the fixture's send button call it. Verify with
  e2e steps: "a confirmed reply counts once, to X's named author", "a rejected send is not recorded or
  counted", "with no post request, the send is recorded from the composer after 3 s", "a forged
  confirmation without a send is ignored". The existing reply-counting and "r then send" steps still pass.
- [ ] 4.3 Verify the duplicate warning end to end with e2e steps: "the third identical short reply warns"
  and "text from a rejected send does not warn". The existing near-duplicate and unrelated-reply steps
  still pass.

## 5. Docs and release

- [ ] 5.1 Update `PRIVACY.md` ("Where the data comes from": X's answers to your own posts and replies) and
  the README Privacy section in English and Chinese. Verify: both name the new source, and nothing else
  about stored data changes.
- [ ] 5.2 Run `npm test` and `CHROMIUM=/usr/bin/chromium npm run e2e`; report pass/fail counts. Verify:
  all pass, and the e2e steps "extension never clicks anything by itself" and "extension never fakes mouse
  or pointer events" are unchanged (`git diff test/e2e.mjs` shows no edits inside them).

## Workflow follow-up

- Jack checks on real X after loading the build: send a reply, confirm the HUD reply count goes up once and
  the warning quotes text once.
- Claude reviews the diff, then the change is archived and the version bumped (v0.4.9 or folded into v0.5).
