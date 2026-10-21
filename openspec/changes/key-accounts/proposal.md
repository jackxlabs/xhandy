# Proposal

## Why

"Target accounts" (关注对象) is a list of handles typed into the settings page; posts by those accounts
get a blue edge and a "★ target" chip. Few people will type handles into a settings field, and the
Chinese name reads like "accounts I follow on X". People who reply by hand also want to know which of
the accounts they care about they have drifted away from, which today needs scrolling through history.

## What Changes

- Rename to key accounts (重点账号 / Key accounts). The chip reads "★ 重点" / "★ key".
- A star button at the end of every post badge (☆ / ★) adds or removes the author as a key account with
  one click; Alt+S does the same for the post selected with j/k. The button belongs to Xhandy, not to X.
- The settings page lists key accounts with search, the date each was added, and the last interaction
  in each direction; each row can be removed. Pasting handles (one per line) still adds many at once.
- A key accounts panel (Alt+K, or a button in the toolbar popup) lists key accounts sorted by how long
  it has been since either side interacted, and marks those quiet for at least N days (default 14).
  Rows only link to the profile.
- A feature switch for key accounts (star, highlight and panel), on by default.
- **BREAKING (storage)**: key accounts move from `settings.targets` to their own part with a migration;
  old exports with `settings.targets` still import.

Out of scope:
- Following or unfollowing on X; starring never touches X's Follow button.
- Notifications or reminders outside the panel (no toasts about quiet accounts).
- Groups or tags of key accounts, sync between devices.

How the rules are kept:
- Never acting for the user: the star is Xhandy's own button; nothing on X is clicked or changed, and the
  panel only links to profiles. The click is stopped from reaching X so it does not open the post.
- Network: none added.
- Storage: new part `keys`, VERSION 4 with a migrate() step and test; README Privacy and PRIVACY.md updated.

## Capabilities

### New Capabilities
- `key-accounts`: marking accounts as key accounts on X, managing them in settings, highlighting their
  posts, and the quiet-accounts panel.

### Modified Capabilities
- `feature-settings`: the switches list gains the key accounts switch.

## Impact

- `src/lib/store.js` (part `keys`, VERSION 4 migration, cleanState), `src/content.js` (badge star,
  Alt+S, Alt+K panel mode, highlight from `keys`), `src/content.css` (star button), `src/locales/*.js`,
  `src/options/*` (list UI, switch), `src/popup/*` (panel button).
- Tests: `test/store.test.js`, `test/e2e.mjs`, `test/fixtures/timeline.html` if needed.
- README (en, zh), PRIVACY.md.
