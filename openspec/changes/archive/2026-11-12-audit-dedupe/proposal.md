# Proposal

## Why

The hq code-health signals (repository x-helper @ 8ee7a0b, commits since 6 months ago, 11 code files under
`src/`) put three files at the top of the hotspot list:

| File | Commits | FTA | Rank |
|---|---:|---:|---:|
| `src/content.js` | 39 | 162.8 | 1 |
| `src/lib/store.js` | 22 | 107.4 | 2 |
| `src/options/options.js` | 17 | 79.4 | 3 |

Reading them shows the same code written several times. v0.6 (left-nav panel) and v0.7 (drafts) will add
to these files, so the copies are removed first.

## What Changes

Structure only. No behaviour, storage, text or selector changes.

- `src/content.js`: drop the `updateTopPostsButton` wrapper; one function for "the account the user means"
  (focused post, else the profile in the URL) used by Alt+B and Alt+N; one builder for the two profile
  buttons; one builder for panel rows (recent unfollows, not following back, key accounts); one helper for
  "collect for 2 s, then write once" (replied posts, own account, inbound interactions); one helper for the
  memory-only maps that drop their oldest entries; one function for the empty inbound counter; note limits
  read from `store` instead of being written again; section comments renumbered.
- `src/lib/store.js`: the five `cap*` functions share one helper; `quietKeys` and `tintLevel` use `num()`.
- `src/options/options.js`: one row builder for the key accounts and notes lists.
- `src/popup/popup.js`: one click handler for the two panel rows.

## Out of Scope

- Splitting `content.js` or `store.js` into files (waits for the service worker / WXT work).
- Any change a user could notice.

## Project Rules

- Acting for the user, network, storage: untouched. The e2e steps "extension never clicks anything by
  itself" and "extension never fakes mouse or pointer events" are not edited.

## Impact

- `src/content.js`, `src/lib/store.js`, `src/options/options.js`, `src/popup/popup.js`
- No test changes expected: the existing unit tests and e2e steps pin the behaviour.
