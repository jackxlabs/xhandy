## Context

`xh:people` holds, per lowercase handle, `{ likes, replies, last }` for what the user gave the author and an
optional `in: { likes, replies, quotes, mentions, last }` for what the author gave back (reverse-interactions
spec). `annotate(article)` in `src/content.js` already reads this entry to build the interaction chip, and
`annotateAll()` runs again whenever `people` or `settings` change, so anything computed in `annotate` updates live.

Marks already on a post: the blue inset edge (`article.xh-key`, `article.xh-target`, `box-shadow: inset 3px 0 0`),
chip colours (heat in orange/red, accent violet, amber for the key star). Theme tokens live in `src/content.css`
under `:root` and `:root[data-xh-theme="dim"|"dark"]`. The brand's primary colour is violet (`brand/brand.yaml`),
already used as `--xh-accent` (`#6d28d9` light, `#a78bfa` dim/dark).

The data is sparse at first: inbound counts only include what X showed in this browser (notifications page, posts
on screen), so they undercount. Each direction only stores its last time, not a time per interaction.

## Goals / Non-Goals

**Goals:**
- Two-way relationships stand out while scrolling, with no reading or hovering.
- Strength is explainable from the numbers in the interaction chip, plus time since the last interaction.
- No new stored data, no migration, no measurable cost on a busy timeline.

**Non-Goals:**
- Per-interaction timestamps or a decay that counts each interaction's age.
- A numeric score shown anywhere.
- Tints outside timeline posts (panels, popup, profiles).

## Decisions

### Score: shared count, log curve, half-life fade

A pure function `XH.tintLevel(person, settings, now)` (in `src/lib/store.js` next to `quietKeys`, so `node --test`
can load it) returns a step from 0 (no tint) to 8:

```
you    = likes + replies
them   = in.likes + in.replies + in.quotes + in.mentions
shared = min(you, them)                       // 0 → step 0
full   = clamp(settings.tintFull, 2, 500)
depth  = min(1, ln(1 + shared) / ln(1 + full))
latest = max(last, in.last)
half   = clamp(settings.tintHalfLife, 1, 365)
fade   = 0.5 ^ (max(0, now - latest) / (half days))
step   = round(depth × fade × 8)              // 0 → no tint
```

With the defaults (full 20, half-life 30): shared 1 today gives step 2, shared 3 gives 4, shared 10 gives 6,
shared 20+ gives 8; shared 1 after 120 days rounds to 0.

- *Why min()*: Jack wants "back-and-forth" to stand out; min is the simplest rule that ignores one-sided activity
  and can be read straight off the chip (`you 6 · them 3` → 3).
- *Why log*: early interactions matter most; a linear scale makes 1–5 nearly invisible next to a few heavy accounts.
- *Why fade from the latest of both sides*: matches how key accounts count "quiet" (`quietKeys` uses
  `max(youLast, themLast)`), and is the only time data stored. Alternative (fade from the older side) would punish
  a relationship where one side just answered, so not chosen.
- *Why steps, not a continuous value*: Jack asked for "the higher, the more visible" (continuous feel). Eight steps
  look continuous to the eye, and an attribute per step avoids writing inline styles on X's nodes.

### Rendering: classes plus a gradient layer

`annotate` sets the attribute `data-xh-tint="N"` (N 1–8) on the article, or removes it, before the early
return that handles "no chips" (the tint must show even when no chip does). CSS:

```css
article[data-xh-tint] { background-image: linear-gradient(var(--xh-tint-c), var(--xh-tint-c)); }
article[data-xh-tint="1"] { --xh-tint-c: color-mix(in srgb, var(--xh-accent) 4%, transparent); }
...
article[data-xh-tint="8"] { --xh-tint-c: color-mix(in srgb, var(--xh-accent) 16%, transparent); }
```

- `background-image` stacks on top of X's own `background-color`, so X's hover colour does not hide it.
- The blue edge is a `box-shadow`, so it draws over the tint and both stay visible.
- The 4%–16% range is a starting point; tune per theme in the manual check, using separate percentages under
  `:root[data-xh-theme="dim"|"dark"]` if dark themes need more.
- `color-mix` is supported in every Chromium the manifest targets.

### Settings

Add to `DEFAULTS.settings`: `showTint: true`, `tintFull: 20`, `tintHalfLife: 30`. `cleanSettings` already keeps
types and falls back to defaults, so old exports import unchanged and no `VERSION` bump is needed. The options page
gets one switch row and two number rows in `#sec-badges`, registered in the existing number ranges table in
`options.js` (`tintFull` 2–500, `tintHalfLife` 1–365, integers), with the numbers disabled while the switch is off,
like `showInbound` under `showSeen`. The tint ignores `showSeen` and `showInbound`: those only control chips.

## Risks / Trade-offs

- [Tint reads as noise on a timeline full of friends] → the log curve and fade keep most posts faint; the switch
  turns it off. Check on the real timeline during the manual check.
- [Violet tint looks like X's own "new post" or ad highlight] → compare on real X in all three themes; lower the top
  percentage if it does.
- [Inbound undercounting makes shared counts low] → accepted; documented in README as "from what X showed in this
  browser", same as the chip.
- [X reuses an article node for another post] → the attribute is recomputed on every `annotate`.
- [X rewrites the article's `class` on hover (React), found on real X] → the tint is an attribute, not a class, so
  it survives; an e2e step rewrites `className` and checks the tint is still drawn.

## Migration Plan

No data migration. Settings defaults fill in on first read. Rollback is removing the code; stored settings keys are
then ignored by `cleanSettings`.

## Open Questions

- Final opacity range per theme (decided in the manual check on real X).
