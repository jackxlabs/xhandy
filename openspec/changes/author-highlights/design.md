# Design

## Context

- Shortcuts in use: Shift+F (follow assistant), Alt+H (stats bar), Alt+U (not following back), Alt+K
  (key accounts panel), Alt+S (star). Alt+B is free. Shift+F already has a "selected post" lookup.
- Follower counts: `authorFollowers` (post id -> count, memory only) is filled from X's responses by
  `collectViews` in `src/page-hook.js`. There is no handle -> followers map yet.
- Profile pages: Shift+F's fallback already detects "on @handle's profile" from `location.pathname`.
  There is no selector for the profile header yet.
- X supports `min_faves:`, `from:` and `-filter:replies` in search today, as far as we know. This has to be
  checked on real X before implementation (task 1.1); if `min_faves` no longer works, stop and report.

## Goals / Non-Goals

**Goals:**
- One click from a profile to that account's best-received posts, in X's own search.

**Non-Goals:**
- Any ranking done by Xhandy, any data stored about the results.

## Decisions

- **URL**: `https://x.com/search?q=<encoded query>&src=typed_query&f=top`, opened with
  `window.open(url, "_blank", "noopener")` from the click or keydown handler (a user gesture, so no
  popup blocker). Query: `from:<handle> min_faves:<N> -filter:replies`.
- **N from follower count** (memory only, per handle, filled alongside `authorFollowers`):
  under 1K → 10, under 10K → 50, under 100K → 200, under 1M → 1,000, else 5,000; unknown → 100.
  These tiers are a starting guess (推断), to be tuned after Jack tries them on real accounts.
- **Button**: `<button class="xh-top" type="button">` inserted once after the profile name block, with a
  label in the interface language and `aria-label` naming the handle. Click handler calls
  `preventDefault()` and `stopPropagation()`. Not shown on the signed-in user's own profile (seeing one's
  own top posts is still possible with Alt+B). Re-inserted when X re-renders the header (same observer
  as badges; keyed by handle so it never doubles).
- **Selector**: add `profileName` to `SEL` (the `UserName` test id inside the profile header, to be
  confirmed on real X), and a fixture with that markup.
- **Alt+B**: same guard as Alt+S (`e.altKey && e.code === "KeyB"`, no ctrl/meta, not typing). Target:
  selected post's author; else the profile in the URL; else toast t("top_pick").
- **Setting**: `topPosts: true` in DEFAULTS.settings; off hides the button and disables Alt+B.

## Risks / Trade-offs

- X may drop or change search operators → the button would open an empty search. Mitigation: the query
  is visible and editable in X's search box; selector and operator are checked when X changes.
- New tabs could feel like "automation" → only ever one tab per click or key press, never batched.
