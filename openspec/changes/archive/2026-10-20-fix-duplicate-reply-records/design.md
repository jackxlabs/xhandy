# Design

## Context

See proposal.md for the evidence. Current flow: a capture-phase click listener (and Ctrl/Cmd+Enter in a
composer) calls `onSend`, which reads `composerText(dialog || document)` and immediately writes `sent`,
`days` and `people`. The reply target comes from `pendingReply` (last reply button or "r" key, valid
10 minutes) or the post page's author. `page-hook.js` already wraps `fetch` and `XMLHttpRequest.open`
for `/i/api/` and `/graphql/` URLs, clones successful JSON responses, and sends a JSON string on the
`xh-relations` window event, which `store.cleanRelations` validates. Follows already work this way.

## Goals / Non-Goals

**Goals:**
- History and counts reflect what X actually created.
- The fix keeps working, in degraded form, when X changes its post endpoint.
- Existing users' history is cleaned without loss.

**Non-Goals:**
- No change to `similarity.js` or the default thresholds.
- No new stored fields (post ids are not stored).
- No network requests of any kind.

## Decisions

### 1. Confirm sends from X's GraphQL post mutations
`page-hook.js` recognises POST URLs matching `/graphql/<id>/(CreateTweet|CreateNoteTweet)` (long posts use
the second). A pure function `collectCreated(url, json, ok)` returns, for these URLs only:
- success: `{ ok: true, kind, text, to }` from `data.create_tweet.tweet_results.result` or
  `data.notetweet_create.tweet_results.result` (unwrap `TweetWithVisibilityResults.tweet` if present). Do not require `__typename` on `result`: X omits it in this response
  (confirmed on real X, tasks.md 1.1).
  Text is `note_tweet.note_tweet_results.result.text` when present, else `legacy.full_text` cut to
  `legacy.display_text_range` (drops the leading "@handle " X adds to replies). The range counts
  Unicode code points, so cut `Array.from(full_text)`, not the UTF-16 string. `kind` is "reply" when
  `legacy.in_reply_to_status_id_str` is set; `to` is `legacy.in_reply_to_screen_name` or null.
- failure: `{ ok: false }` when the response is not ok, is not JSON, or has `errors` and no result.

Today `emit` ignores non-ok responses; for these two URLs the hook must also emit on failure, so the
fetch and XHR wrappers pass `ok` through instead of returning early. The hook additionally emits
`{ seen: true }` when such a request starts, so the content script knows X's answer is coming.
The payload travels in the existing event as a new field `c: [...]`. Alternative considered: a second
event name. Rejected: one validated channel is simpler to audit.

Why not keep the click as the source of truth: it cannot tell success from failure, and X sometimes
rejects sends (rate limits, its own duplicate-status error, network drops).

### 2. A pending send bridges click and confirmation
`onSend` no longer writes storage. It stores `pendingSend = { t, text, dialogTarget }` (composer text and
the old target guess, for the fallback) and starts a 3-second timer.
- `seen` arrives → cancel the timer, keep waiting up to 60 s for the outcome.
- `ok: true` arrives while a send is pending → write `sent`, `days`, `people` from X's data, clear pending.
- `ok: false` arrives → clear pending, write nothing.
- timer fires with nothing seen → write from `pendingSend` exactly as today (the fallback).
- 60 s pass after `seen` with no outcome → clear pending, write nothing.

Confirmations with no pending send are ignored (the forged-event scenario). Thread sends (several
CreateTweet calls for one click) record each confirmed post while the pending window is open; the window
closes 60 s after the click. `lastSendAt` de-duplication stays for the click + Ctrl+Enter case.

Alternative considered: watching the DOM for the new post appearing. Rejected: fragile and slower, and
the post often does not appear in the current view.

### 3. Composer text from editable boxes only
`composerText(scope)` selects `[data-testid^="tweetTextarea_"]`, then keeps only elements that do not
contain another matched element (the innermost, which is the contenteditable box). This does not depend
on X's exact wrapper names. `checkDup` already reads the innermost via `closest`, so typing is unchanged.

### 4. Storage version 3
`VERSION = 3`. `migrate()` gains a v2 → v3 step: read `xh:sent`, map each `text` through `untriple`, write
it back. `untriple(text)` returns `a` when `text === a + "\n" + a + "\n" + a` and `a` is non-empty,
else `text`. `cleanState` (used by import) applies `untriple` too, so old exports are cleaned. Only
exactly three copies are collapsed: all 176 real records have three, and a two-copy rule would risk
collapsing real text such as "好\n好".

The existing v1 → v2 step must still run first for very old installs, then v2 → v3.

### 5. Validation
`cleanRelations` returns `c` with entries `{ seen: true }`, `{ ok: false }` or
`{ ok: true, kind: "reply"|"post", text: string ≤ 25,000, to: handle|null }`; anything else is dropped.
The warning UI already renders with `textContent`, so a forged text cannot inject markup.

## Risks / Trade-offs

- [X changes the response shape but keeps the endpoint name] → `collectCreated` finds no result and
  returns `{ ok: false }`, so sends stop being recorded silently. Mitigation: treat "200 with no errors and
  no recognisable result" as `{ shape: "unknown" }`, which uses the composer fallback instead of dropping.
- [Fixture drifts from real X again] → the fixture copies the nesting observed on real X; task 1.1 has
  Jack confirm the test ids on real X before the fixture is written.
- [Text from X differs slightly from what was typed (t.co links, entity decoding)] → `normalize` already
  strips links and mentions; decode `&amp;`, `&lt;`, `&gt;` from `full_text`.
- [A forged event during a real pending send could record fake text] → limited to a 60-second window the
  user opened themselves; the impact is a wrong history line, never an action on X.

## Migration Plan

Ships as a normal version bump. Upgrade runs the v2 → v3 migration on first read. Rollback: an older
version reads v3 data fine (same shape; only text was shortened), so no reverse migration is needed.
