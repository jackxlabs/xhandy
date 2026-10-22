## Context

The badge is a `span.xh-badge` appended to X's `[data-testid="User-Name"]`. It is `inline-flex`, `nowrap`,
`overflow: hidden`, so a long badge is clipped. On a post's own page the name row shares its line with the
Subscribe button and is narrower still. Chips are built in `annotate()` in `src/content.js`; texts come from
`src/locales/*.js`; the reply chip from `XH.replyChip` in `src/lib/i18n.js`.

Already on branch `badge-overflow` (keep it, build on it): `SEL.tweetText`, `fitBadge(article, badge)` that,
one animation frame after the badge content changes, adds `xh-badge-row` and moves the badge before the
post's own `[data-testid="tweetText"]` when `scrollWidth > clientWidth + 1`; the `.xh-badge.xh-badge-row` CSS;
a `#narrow` fixture post; and the e2e step "a badge that doesn't fit in the name row moves above the post
text, with nothing cut off".

## Goals / Non-Goals

Goals: shorter chips with no duplicate of what X shows on the same post; never cut off; focal post always
in its own row. Non-goals: new data, hover details, schema changes.

## Decisions

- Heat chip text: views per hour only. `hot` adds "🔥 ". Old posts: `t("per_hour") + " · " + t("stale")`
  when the rate is known, `t("stale")` alone when not. No rate and not old: no chip. `fmtAge` stays for other
  uses (if none remain, delete it).
- Relationship: `rel_none` is no longer shown; delete the `rel_none` string if nothing else uses it. New
  texts: zh `rel_following: "→ 我关注"`, `rel_follower: "← 关注我"`; en `rel_following: "→ you follow"`,
  `rel_follower: "← follows you"` (en unchanged).
- Interaction, one direction: zh `interacted: "{n}次 · {ago}"`, en `interacted: "{n}× · {ago}"`.
- `XH.replyChip(replies, authorFollowers, myFollowers)`: `["💬 " + XH.compact(replies)]`, plus
  `XH.compact(Math.round(ratio)) + "×"` when ratio >= 2. The author count is no longer shown, so `XH.kNum`
  may become unused; delete it only if nothing uses it.
- Focal post: on a path matching `^/[^/]+/status/(\d+)`, the article whose `tweetInfo(article).id` equals that
  id gets `xh-badge-row` and is placed before its own tweet text right away (same placement code as
  `fitBadge`; factor out a `placeAsRow(article, badge)` helper). X reuses the page when navigating, so decide
  per annotate call from `location.pathname`.
- Reused elements: X can show another post in the same article element. The badge stores the post id
  (`data-post`); when it changes, the badge goes back to the name row before fitting again, and the star
  reads the author with `tweetInfo` when clicked.
- "Own tweet text" means the first `[data-testid="tweetText"]` in the article that is not inside a quoted
  post (`closest('[role="link"]')` is null). No text: place the row right after the name row (User-Name's
  parent, or User-Name itself when its parent is the article).
- Settings labels: zh `opt_showAge: "热度标签（每小时浏览量、旧帖）"`, `opt_showHeat: "显示每小时浏览量并标颜色"`;
  en `opt_showAge: "Heat chip (views per hour, old post)"`, `opt_showHeat: "Show views per hour and colour"`.
  Setting keys stay `showAge` / `showHeat`.

## Risks / Trade-offs

- Badges in two places on one timeline look uneven on narrow windows → accepted; cutting text off is worse.
  Jack checks the look on real X before merging.
- Without age in the chip, a post with no view data shows less → X's own time is right next to it.
- Measuring `scrollWidth` forces layout → only once per content change, in `requestAnimationFrame`.
