# Proposal

## Why

Two problems found while using the "Not following you back" list (`Alt+U`) on real X:

1. Clicking an account in the list loads its profile as a full page load, which restarts Xhandy's content
   script, so the panel is gone and has to be reopened and scrolled again for every account checked.
2. The rows show only the name and when the account was last seen. To decide whether to keep following
   someone, the user wants to see how many followers the account has and how many accounts it follows,
   without opening each profile.

## What Changes

- The side panel (all its views) stays open across page loads in the same tab: after a click on a row, a
  reload, or the browser's Back button, the panel reopens on the same view, with the same search text and
  scroll position. Closing it (button, `Esc`, shortcut) keeps it closed. On restore it does not take
  keyboard focus, so `j`/`k` work on the page right away.
- Rows of the "Not following you back" view (both the "Recently unfollowed you" section and the normal
  list) show the account's follower and following counts when X has sent them, e.g.
  `12.4K followers · 310 following`. Counts X never sent are left out, not shown as 0.
- Xhandy stores these two counts with each relationship it already stores, updated whenever X sends them.

## Capabilities

### New Capabilities
- `side-panel`: how the side panel keeps its state across page loads in a tab.
- `not-following-back`: account size (followers and following) shown in the "Not following you back" view
  and how it is recorded. (The view's existing behaviour is not yet written as a spec; this change specifies
  only what it adds.)

### Modified Capabilities
<!-- None. -->

## Out of scope

- Navigating to the profile without a page load by driving X's own router: that would be Xhandy operating
  X's page.
- Sorting or filtering the list by size or ratio, and any "should unfollow" mark or score.
- Counts in the key accounts view, on post badges or in notes.
- Any request to fetch counts for accounts X has not shown, and any unfollow control in the list.
- Changing how often or how `xh:rel` is written (tracked separately).

## How the rules are kept

- **Never acts for the user**: the list stays read-only; rows are still plain links to profiles. Nothing is
  clicked or typed. Unfollowing still happens by hand on the profile, with the existing soft daily limit and
  pace reminders unchanged.
- **Offline**: no request is added. The counts come from the user objects `src/page-hook.js` already reads.
- **Storage**: two optional numbers per entry in `xh:rel` (no conversion, old exports still import). The
  panel's open state lives in the tab's `sessionStorage` (view, search text, scroll position; cleared when
  the tab closes or the panel is closed) because it must be per tab; it holds no data about other accounts.
  README "Privacy" and PRIVACY.md are updated for both.
- **Not bot-like**: the user decides faster but still acts one account at a time on X's own pages.

## Impact

- `src/page-hook.js` (`collectRelations`), `src/lib/store.js` (`cleanRelations`, `nextRel`, `cleanRelEntry`).
- `src/content.js` (panel state save/restore, row meta), `src/locales/en.js`, `src/locales/zh.js`.
- `README.md` (feature text, Privacy, 中文说明), `PRIVACY.md`.
- `test/` unit tests, `test/fixtures/following.json`, `test/e2e.mjs`.
