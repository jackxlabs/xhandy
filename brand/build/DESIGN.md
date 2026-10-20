---
version: alpha
name: Xhandy
description: Xhandy puts post heat, your relationship with the author and your interaction
  history next to every post, so you can see which ones are worth a reply.
colors:
  brand-cyan: '#06b6d4'
  brand-violet: '#8b5cf6'
  brand-pink: '#ec4899'
  bg: '#f7f6f9'
  surface: '#ffffff'
  border: '#d9d8de'
  text: '#323038'
  text-muted: '#706e7a'
  solid: '#794bdc'
  solid-hover: '#6339b8'
  on-solid: '#ffffff'
  link: '#794bdc'
  focus: '#8b5cf6'
  success-solid: '#00873c'
  success-text: '#006e30'
  warning-solid: '#976500'
  warning-text: '#7b5100'
  danger-solid: '#c43234'
  danger-text: '#a32327'
  info-solid: '#0079a9'
  info-text: '#00628a'
  dark-bg: '#1e1d23'
  dark-surface: '#323038'
  dark-border: '#46454e'
  dark-text: '#f7f6f9'
  dark-text-muted: '#a3a1ac'
  dark-solid: '#794bdc'
  dark-solid-hover: '#8b5cf6'
  dark-on-solid: '#ffffff'
  dark-link: '#c3b4ff'
  dark-focus: '#a88dff'
  dark-success-solid: '#00873c'
  dark-success-text: '#82d895'
  dark-warning-solid: '#976500'
  dark-warning-text: '#f0b55d'
  dark-danger-solid: '#c43234'
  dark-danger-text: '#ffa59e'
  dark-info-solid: '#0079a9'
  dark-info-text: '#72cdff'
  ui-secondary: '#ebeaef'
  ui-secondary-hover: '#d9d8de'
  ui-muted: '#ebeaef'
  ui-muted-foreground: '#5b5964'
  ui-accent: '#ebe8ff'
  ui-accent-foreground: '#4d2a93'
  ui-input: '#888692'
  dark-ui-secondary: '#46454e'
  dark-ui-secondary-hover: '#5b5964'
  dark-ui-muted: '#46454e'
  dark-ui-muted-foreground: '#c1c0c8'
  dark-ui-accent: '#371a6e'
  dark-ui-accent-foreground: '#ebe8ff'
  dark-ui-input: '#888692'
typography:
  sans:
    fontFamily: Inter
  cjk:
    fontFamily: Noto Sans SC
  mono:
    fontFamily: JetBrains Mono
  wordmark:
    fontFamily: Inter
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.5
  caption:
    fontFamily: Inter
    fontSize: 12.8px
    fontWeight: 600
    lineHeight: 1.5
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
components:
  button-primary:
    backgroundColor: '{colors.solid}'
    textColor: '{colors.on-solid}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: 8px 16px
    height: 40px
  button-primary-hover:
    backgroundColor: '{colors.solid-hover}'
    textColor: '{colors.on-solid}'
  button-primary-focus:
    backgroundColor: '{colors.solid}'
    textColor: '{colors.on-solid}'
  button-primary-disabled:
    backgroundColor: '{colors.ui-muted}'
    textColor: '{colors.ui-muted-foreground}'
  button-secondary:
    backgroundColor: '{colors.ui-secondary}'
    textColor: '{colors.text}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: 8px 16px
    height: 40px
  button-secondary-hover:
    backgroundColor: '{colors.ui-secondary-hover}'
    textColor: '{colors.text}'
  button-secondary-focus:
    backgroundColor: '{colors.ui-secondary}'
    textColor: '{colors.text}'
  button-secondary-disabled:
    backgroundColor: '{colors.ui-muted}'
    textColor: '{colors.ui-muted-foreground}'
  button-ghost:
    backgroundColor: transparent
    textColor: '{colors.text}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: 8px 16px
    height: 40px
  button-ghost-hover:
    backgroundColor: '{colors.ui-accent}'
    textColor: '{colors.ui-accent-foreground}'
  button-ghost-focus:
    backgroundColor: transparent
    textColor: '{colors.text}'
  button-ghost-disabled:
    backgroundColor: transparent
    textColor: '{colors.ui-muted-foreground}'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: 8px 12px
    height: 40px
  input-hover:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
  input-focus:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
  input-disabled:
    backgroundColor: '{colors.ui-muted}'
    textColor: '{colors.ui-muted-foreground}'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.xl}'
    padding: 24px
  card-hover:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
  card-focus:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
  card-disabled:
    backgroundColor: '{colors.ui-muted}'
    textColor: '{colors.ui-muted-foreground}'
  badge:
    backgroundColor: '{colors.solid}'
    textColor: '{colors.on-solid}'
    typography: '{typography.caption}'
    rounded: '{rounded.full}'
    padding: 2px 10px
  badge-hover:
    backgroundColor: '{colors.solid-hover}'
    textColor: '{colors.on-solid}'
  badge-focus:
    backgroundColor: '{colors.solid}'
    textColor: '{colors.on-solid}'
  badge-disabled:
    backgroundColor: '{colors.ui-muted}'
    textColor: '{colors.ui-muted-foreground}'
  badge-secondary:
    backgroundColor: '{colors.ui-secondary}'
    textColor: '{colors.text}'
    typography: '{typography.caption}'
    rounded: '{rounded.full}'
    padding: 2px 10px
  nav:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    height: 64px
    padding: 0 24px
  nav-link:
    backgroundColor: transparent
    textColor: '{colors.ui-muted-foreground}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: 6px 12px
  nav-link-hover:
    backgroundColor: '{colors.ui-accent}'
    textColor: '{colors.ui-accent-foreground}'
  nav-link-focus:
    backgroundColor: transparent
    textColor: '{colors.text}'
  nav-link-disabled:
    backgroundColor: transparent
    textColor: '{colors.ui-muted-foreground}'
  nav-link-active:
    backgroundColor: '{colors.ui-accent}'
    textColor: '{colors.link}'
---

# Xhandy

> Generated from brand.yaml by brand-kit compile.py. Edit brand.yaml instead.

## Overview
Xhandy is a browser extension for people who engage on X by hand. Next to every post it shows how old the post is and how fast it is getting views, whether you and the author follow each other, and how often you have interacted. It warns you before you send a near-duplicate reply. It never clicks or sends anything for you, keeps all data in your browser, and is free and open source.

Personality: Plain (not a flashy analytics dashboard); Savvy (not preachy); Handy (not feature bloat)

## Colors
| token | hex | use |
|---|---|---|
| brand-cyan | #06b6d4 | Gradient start; extension panel edge, icon tile |
| brand-violet | #8b5cf6 | Gradient middle; primary colour for UI. Numbers in the extension use violet-800 (replaces the old separate ink #4c1d95, Jack 2026-10-20) |
| brand-pink | #ec4899 | Gradient end |
| bg | #f7f6f9 | light role (neutral.50) |
| surface | #ffffff | light role (white) |
| border | #d9d8de | light role (neutral.200) |
| text | #323038 | light role (neutral.900) |
| text-muted | #706e7a | light role (neutral.600) |
| solid | #794bdc | light role (violet.600) |
| solid-hover | #6339b8 | light role (violet.700) |
| on-solid | #ffffff | light role (white) |
| link | #794bdc | light role (violet.600) |
| focus | #8b5cf6 | light role (violet.500) |
| success-solid | #00873c | light role (success.600) |
| success-text | #006e30 | light role (success.700) |
| warning-solid | #976500 | light role (warning.600) |
| warning-text | #7b5100 | light role (warning.700) |
| danger-solid | #c43234 | light role (danger.600) |
| danger-text | #a32327 | light role (danger.700) |
| info-solid | #0079a9 | light role (info.600) |
| info-text | #00628a | light role (info.700) |
| dark-bg | #1e1d23 | dark role (neutral.950) |
| dark-surface | #323038 | dark role (neutral.900) |
| dark-border | #46454e | dark role (neutral.800) |
| dark-text | #f7f6f9 | dark role (neutral.50) |
| dark-text-muted | #a3a1ac | dark role (neutral.400) |
| dark-solid | #794bdc | dark role (violet.600) |
| dark-solid-hover | #8b5cf6 | dark role (violet.500) |
| dark-on-solid | #ffffff | dark role (white) |
| dark-link | #c3b4ff | dark role (violet.300) |
| dark-focus | #a88dff | dark role (violet.400) |
| dark-success-solid | #00873c | dark role (success.600) |
| dark-success-text | #82d895 | dark role (success.300) |
| dark-warning-solid | #976500 | dark role (warning.600) |
| dark-warning-text | #f0b55d | dark role (warning.300) |
| dark-danger-solid | #c43234 | dark role (danger.600) |
| dark-danger-text | #ffa59e | dark role (danger.300) |
| dark-info-solid | #0079a9 | dark role (info.600) |
| dark-info-text | #72cdff | dark role (info.300) |

## Typography
- sans: Inter, system-ui, sans-serif
- cjk: Noto Sans SC, sans-serif
- mono: JetBrains Mono, ui-monospace, monospace
- wordmark: Inter, sans-serif

| step | size | line height | letter spacing | CSS |
|---|---|---|---|---|
| xs | 10.2px | 1.5 | 0em | `0.640rem` |
| sm | 12.8px | 1.5 | 0em | `0.800rem` |
| base | 16.0px | 1.5 | 0em | `1.000rem` |
| lg | 20.0px | 1.35 | 0em | `1.250rem` |
| xl | 25.0px | 1.35 | -0.01em | `clamp(1.469rem, 1.432rem + 0.163vw, 1.562rem)` |
| 2xl | 31.2px | 1.15 | -0.01em | `clamp(1.719rem, 1.627rem + 0.408vw, 1.953rem)` |
| 3xl | 39.1px | 1.15 | -0.02em | `clamp(2.002rem, 1.830rem + 0.764vw, 2.441rem)` |
| 4xl | 48.8px | 1.15 | -0.02em | `clamp(2.319rem, 2.033rem + 1.274vw, 3.052rem)` |
| 5xl | 61.0px | 1.15 | -0.02em | `clamp(2.670rem, 2.222rem + 1.990vw, 3.815rem)` |

Use the role colours (bg, surface, border, text, text-muted, solid, link, focus) rather than raw ramp steps; tokens.css switches them for dark mode. The brand gradient is decorative only (icon tile, hero backgrounds).

## Logo
- icon: logo/final/icon.svg
- icon_small: logo/final/icon-small.svg (16 and 32 px)
- lockup: logo/final/lockup.svg (bold icon as the X + handy)
- tile: White mark on a rounded #06b6d4 → #8b5cf6 → #ec4899 gradient tile
- reads_as: Two facing crescents that read as both X and H (X + handy)
- clear_space: 25% of the icon height
- min_size: Icon 16 px, lockup 96 px wide
- files: logo/export/

## Shapes

```yaml
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
```

Corners come from one base radius (0.5rem); controls use md, cards xl, badges and pills full. The logo tile keeps its own
radius (app icon), it is not a UI token.

## Components

```yaml
components:
  button-primary:
    backgroundColor: "{colors.solid}"
    textColor: "{colors.on-solid}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.solid-hover}"
    textColor: "{colors.on-solid}"
  button-primary-focus:            # plus a 2px ring in {colors.focus}, 2px offset (design.md has no ring property yet)
    backgroundColor: "{colors.solid}"
    textColor: "{colors.on-solid}"
  button-primary-disabled:
    backgroundColor: "{colors.ui-muted}"
    textColor: "{colors.ui-muted-foreground}"
  button-secondary:
    backgroundColor: "{colors.ui-secondary}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 40px
  button-secondary-hover:
    backgroundColor: "{colors.ui-secondary-hover}"
    textColor: "{colors.text}"
  button-secondary-focus:          # ring as button-primary-focus
    backgroundColor: "{colors.ui-secondary}"
    textColor: "{colors.text}"
  button-secondary-disabled:
    backgroundColor: "{colors.ui-muted}"
    textColor: "{colors.ui-muted-foreground}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 40px
  button-ghost-hover:
    backgroundColor: "{colors.ui-accent}"
    textColor: "{colors.ui-accent-foreground}"
  button-ghost-focus:              # ring as button-primary-focus
    backgroundColor: transparent
    textColor: "{colors.text}"
  button-ghost-disabled:
    backgroundColor: transparent
    textColor: "{colors.ui-muted-foreground}"
  input:                           # 1px border in {colors.ui-input} (3:1 on the page, WCAG 1.4.11)
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 8px 12px
    height: 40px
  input-hover:                     # border {colors.text-muted}
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  input-focus:                     # border {colors.focus} + 2px ring {colors.focus}
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  input-disabled:
    backgroundColor: "{colors.ui-muted}"
    textColor: "{colors.ui-muted-foreground}"
  card:                            # 1px border {colors.border}
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: 24px
  card-hover:                      # only for clickable cards: border {colors.ui-input}
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  card-focus:                      # clickable cards: ring as button-primary-focus
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  card-disabled:
    backgroundColor: "{colors.ui-muted}"
    textColor: "{colors.ui-muted-foreground}"
  badge:
    backgroundColor: "{colors.solid}"
    textColor: "{colors.on-solid}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 2px 10px
  badge-hover:                     # only when the badge is a link or filter
    backgroundColor: "{colors.solid-hover}"
    textColor: "{colors.on-solid}"
  badge-focus:
    backgroundColor: "{colors.solid}"
    textColor: "{colors.on-solid}"
  badge-disabled:
    backgroundColor: "{colors.ui-muted}"
    textColor: "{colors.ui-muted-foreground}"
  badge-secondary:
    backgroundColor: "{colors.ui-secondary}"
    textColor: "{colors.text}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 2px 10px
  nav:                             # bottom border {colors.border}
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    height: 64px
    padding: 0 24px
  nav-link:
    backgroundColor: transparent
    textColor: "{colors.ui-muted-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 6px 12px
  nav-link-hover:
    backgroundColor: "{colors.ui-accent}"
    textColor: "{colors.ui-accent-foreground}"
  nav-link-focus:                  # ring as button-primary-focus
    backgroundColor: transparent
    textColor: "{colors.text}"
  nav-link-disabled:
    backgroundColor: transparent
    textColor: "{colors.ui-muted-foreground}"
  nav-link-active:
    backgroundColor: "{colors.ui-accent}"
    textColor: "{colors.link}"
```

- **Buttons.** One primary button per view. Secondary for the other actions, ghost for toolbars and low-emphasis actions.
  Hover darkens (light) or lightens (dark) one ramp step; focus shows a 2px ring in `{colors.focus}` with a 2px offset in the page
  background colour; disabled uses muted colours, never only lowered opacity on text that must stay readable. Minimum target 24 × 24
  px (WCAG 2.2), 40 px tall by default.
- **Input.** Border `{colors.ui-input}` keeps 3:1 against the page so the field is findable; placeholder in
  `{colors.ui-muted-foreground}`; focus switches the border to `{colors.focus}` and adds the ring. Error state: border and message
  in `{colors.danger-text}`, message below the field, never colour alone.
- **Card.** Surface colour, 1px `{colors.border}`, radius xl, 24px padding. Only clickable cards get hover and focus states.
- **Badge.** Short labels only (one or two words). Primary badge for one status per view; secondary for neutral tags.
- **Nav.** Surface background with a bottom border. Links in `{colors.ui-muted-foreground}`, the current page in `{colors.link}` on
  `{colors.ui-accent}` with `aria-current="page"`.
- The brand gradient never fills buttons, inputs or badges; it stays decorative (icon tile, hero backgrounds).

## Do's and Don'ts
Imagery: Real screenshots of the extension with the relevant part highlighted; promo images use the brand gradient background with the logo
- Do: Screenshots from real X pages, with other people's avatars and names blurred; public posts by public figures may stay unblurred (Jack 2026-10-20)
- Do: Keep the numbers in screenshots real; never inflate them
- Do: One set of screenshots per interface language
- Don't: Fake UI mock-ups or inflated view counts
- Don't: Stock photos and generic AI illustrations
- Don't: X's own logo used as decoration
- Don't: Never build the mark like X's logo (a thick and a thin straight diagonal with a break)
- Don't: The mark itself is pure black or white; brand colours go on the tile and backgrounds
