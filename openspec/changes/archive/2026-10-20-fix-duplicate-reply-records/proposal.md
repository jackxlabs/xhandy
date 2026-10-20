# Proposal

## Why

Jack reports that the duplicate-reply warning sometimes claims he already said something. A replay of his
real local history (176 sent items, 2026-10-16 to 2026-10-20, aggregates only) shows the similarity
algorithm is not the cause: replaying every typed prefix (2,327 checks) produced zero false warnings, and
unrelated English replies score at most 0.27 against the 0.6 threshold. The bugs are in how sent text is
recorded:

1. **Every record is the text three times.** All 176 items are stored as `A\nA\nA`. The composer selector
   `[data-testid^="tweetTextarea_"]` matches three nested elements on real X, and their texts are joined.
   The test fixture has only one element, so tests never saw it. Effects: the short-text repeat warning
   ("you sent this N times") can never fire, because a short typed text never equals a tripled record
   (1 missed case in the data); the warning quotes the old text three times; history uses 3× the storage.
2. **Text is recorded on the send click, not on a confirmed send.** If X rejects the post (error, rate
   limit, X's own "duplicate status" error) or the user clicks twice, the text is still recorded and
   counted. The data has 2 identical records within 2 minutes; one of them made the warning fire a minute
   later for a post that, from the user's side, was never sent. This matches "it says I said something I
   didn't".

## What Changes

- Record a sent post or reply only when X confirms it, using X's own response to the user's post
  (read the same way follows are already read). Failed sends are not recorded or counted.
- Reply target comes from X's response instead of guessing from the last reply button clicked.
- If X's response is not seen at all (X changed its API), fall back to recording from the composer, so
  counting keeps working.
- Read the composer text once, from the editable element only, never from its wrappers.
- Migrate existing history: collapse tripled records to one copy (storage version 2 → 3). Imports of old
  export files get the same cleanup.
- The short-text repeat warning works again as a result.

Out of scope: changing the similarity algorithm or thresholds, per-feature on/off switches (a separate
settings change), recording edits of existing posts, and Direct Messages.

How the rules are kept: Xhandy still only reads. It reads X's response to a post the user sent
themselves, adds no requests, sends nothing anywhere, and stores no new kind of data (the same text,
kind, time and target as today).

## Capabilities

### New Capabilities
- `sent-history`: which of the user's own posts and replies are recorded, when, and in what form; feeds
  daily counts, per-author reply counts and the duplicate warning.
- `duplicate-reply-warning`: when the warning shows while typing, for long and short texts.

### Modified Capabilities

None (no specs exist yet).

## Impact

- `src/page-hook.js`: read X's response to creating a post; tell the content script a post request was
  seen and whether it succeeded.
- `src/content.js`: send handling, composer text, reply target.
- `src/lib/store.js`: event validation for the new payload, storage version 3 with the migration,
  cleanup on import.
- Tests: unit tests for the response parser, validation and migration; e2e fixture gets X's real
  nested composer and a fake post endpoint.
- `PRIVACY.md` and README Privacy: "where the data comes from" also lists X's answers to your own posts.
