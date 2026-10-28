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
  `location.assign(url)` in the current tab (Jack 2026-10-28: a new tab felt heavy; Back returns to the
  profile). Query: `from:<handle> min_faves:<N> -filter:replies`.
- **N from follower count** (memory only, per handle, filled alongside `authorFollowers`):
  under 1K → 3, under 10K → 10, under 100K → 50, under 1M → 200, else 1,000; unknown → 10.
  Lowered 2026-10-28 after Jack tried the first tiers (10 … 5,000) on real accounts and found too few results.
- **Button**: `<button class="xh-top" type="button">` inserted once before the profile owner's Follow /
  Following button (found like Shift+F does, by user id or the @handle in its label, never one inside a
  post, hover card or the sidebar), falling back to `userActions` or the header; styled like X's own
  secondary pill (36px), with a label in the interface language and `aria-label` naming the handle. Click handler calls
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
- Opening could feel like "automation" → only ever one navigation per click or key press, never batched.
