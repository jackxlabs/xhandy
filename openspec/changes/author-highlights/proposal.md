# Proposal

## Why

Before replying to someone, or when looking for topics, people want to see what an account wrote that
landed best. On X this takes an advanced search typed by hand (`from:alice min_faves:200`), which few
people know about. Twemex's "Highlights" shows that this view is useful. Xhandy can give it without any
network request or API cost, by opening X's own search with the right query.

## What Changes

- A "Top posts / 高赞帖" button on profile pages, placed next to the profile's name. Clicking it opens
  X's own search for that account's top original posts in a new tab:
  `from:<handle> min_faves:<N> -filter:replies`, sorted by Top.
- Alt+B (Option+B on Mac) does the same for the author of the post selected with j/k, or for the profile
  being viewed when no post is selected.
- N is chosen from the account's follower count when Xhandy has seen it, else a default. The query shows
  in X's search box, so the user can change N or drop `-filter:replies` there.
- A feature switch for top posts, on by default.

Out of scope:
- Fetching, ranking or caching anyone's posts inside Xhandy; the results page is X's own.
- A button on post badges or hover cards (badges are already full; may come later).
- Saving searches.

How the rules are kept:
- Never acting for the user: opening a new tab after the user clicks or presses a key is navigation,
  not an action on X. Nothing on X is clicked, typed or changed. The button belongs to Xhandy.
- Network: none added. The search runs on x.com in the user's own tab, the same as typing it there.
- Storage: one new setting (`topPosts`); no new part, no VERSION change.

## Capabilities

### New Capabilities
- `author-highlights`: opening X's search for an account's top posts from its profile or the selected post.

### Modified Capabilities
- `feature-settings`: the switches list gains the top posts switch.

## Impact

- `src/content.js` (profile header button, Alt+B, SEL entry for the profile name), `src/content.css`,
  `src/locales/*.js`, `src/options/*` (switch), `src/lib/store.js` (setting default).
- Tests: `test/e2e.mjs`, `test/fixtures/` (a profile page fixture if none exists), `test/store.test.js`
  only if settings expectations change.
- README (Features in English and 中文说明, shortcut Alt+B), `docs/release-template.md` (shortcuts).
