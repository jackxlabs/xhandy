# Proposal

## Why

Xhandy helps while the user is choosing where to reply (heat, reply count, author size), but it never shows
what came of those replies. The user cannot tell whether replying early, or to bigger accounts, or on hot
posts, actually gets their replies seen, and cannot see their follower count next to the effort they put in.
The data needed is already in the responses X sends to the browser: Xhandy reads view counts for every post,
including the user's own, and already knows the user's follower count.

## What Changes

- Xhandy records the numbers of the user's own posts and replies (views, likes, replies) whenever X shows
  them in this browser, together with what the situation was when the reply was written: how long after the
  parent post, how big the parent's author was, and how hot the parent was.
- A new **Review** view in the side panel (`Alt+R`, or a row in the toolbar popup) shows:
  - a summary of the last 7 days: replies recorded and their median views;
  - "what gets seen": median views of the user's replies grouped by reply delay, by author size relative to
    the user, and by the parent's heat when replying, with the number of replies behind each figure, and no
    figure for a group with too few replies;
  - the user's 10 most-viewed replies of the last 30 days, each linking to the post;
  - when the numbers were last updated, and a link to the user's own Replies tab, where scrolling refreshes
    them (the same convention as the Following page for "Not following you back").
- **Growth record**: Xhandy keeps one follower count per day (the last value X showed that day). The Review
  view shows the change over 7 and 30 days and a small chart of followers against replies per day.
- A feature switch for the review (on by default, like every feature). When off, nothing new is recorded and
  the view and its entries are hidden. Stored review data is kept until the user clears it.

## Capabilities

### New Capabilities
- `reply-review`: recording the performance of the user's own posts and replies from data X already sends,
  the grouping rules, the Review view, its shortcut and its feature switch.
- `growth-record`: the daily snapshot of the user's own follower count and how it is shown.

### Modified Capabilities
<!-- None. The switch is specified inside reply-review, so the feature-settings delta in the unarchived
ui-refresh change is not touched. -->

## Out of scope

- Saying which reply brought which follower. X's data does not carry that, and Xhandy does not guess it.
- Profile visits, impressions by source, or anything else from X's own analytics pages.
- Any extra request to complete the numbers, and any automatic opening or scrolling of the Replies tab.
- Importing an X data archive.
- Advice written by an AI, and any single "score" for a reply or for the account.
- A shareable image of the review.
- Moving this data to IndexedDB (planned separately for all growing data).

## How the rules are kept

- **Never acts for the user**: the view only lists numbers and links. The link to the Replies tab is an
  ordinary link the user clicks. Nothing is clicked, typed, sent or scrolled by Xhandy.
- **Offline**: no network request is added. `src/page-hook.js` reads three more fields from the responses it
  already clones.
- **Storage**: one new part, `xh:mine`, in `chrome.storage.local`, capped at 2,000 posts, holding ids,
  counts, times and the first 80 characters of the user's own text. One optional number per day is added to
  `xh:days`. Defaults are added, old exports still import, and README "Privacy" and PRIVACY.md are updated.
- **Not bot-like**: nothing gets faster or batched; the view is read after the fact.

## Impact

- `src/page-hook.js` (`collectPosts`, `collectCreated`), `src/content.js` (payload handling, panel mode,
  shortcut), `src/content.css`.
- `src/lib/store.js` (new part, validation, cap, `days` field), new `src/lib/review.js` (pure grouping
  functions), `manifest.json` (script list).
- `src/popup/popup.html`, `src/popup/popup.js`, `src/options/options.html`, `src/options/options.js`,
  `src/locales/en.js`, `src/locales/zh.js`.
- `README.md` (features, shortcuts, Privacy, 中文说明), `PRIVACY.md`, `docs/release-template.md` (new shortcut).
- `test/` unit tests, `test/fixtures/`, `test/e2e.mjs`.
