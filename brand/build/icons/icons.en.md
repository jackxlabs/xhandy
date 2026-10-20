# Xhandy · Icon library recommendation

**Pick: Iconoir** (`iconoir@7.12.1`, MIT, https://iconoir.com)

- Target stroke: **1.69** (24 px grid, 16 px text next to a 20 px icon) · measured from Inter-Variable.ttf at weight 400
- Mark terminals: rounded (the small mark has no sharp corners) (0)
- no icon library in the project yet

| Library | Licence | SVG files | stroke (default → used) | Score | stroke · terminals · coverage · variants |
|---|---|---|---|---|---|
| Iconoir | MIT | 1383 | 1.5 * → 1.75 | 7.47 | 2.47 · 2 · 2 · 1 |
| Phosphor | MIT | 1512 | 1.5 → 1.5 | 7.25 | 2.25 · 2 · 2 · 1 |
| Tabler Icons | MIT | 5166 | 2.0 * → 1.75 | 7.12 | 2.12 · 2 · 2 · 1 |
| Lucide | ISC | 2121 | 2.0 * → 1.75 | 6.12 | 2.12 · 2 · 2 · 0 |
| Heroicons | MIT | 324 | 1.5 → 1.5 | 5.25 | 2.25 · 2 · 0 · 1 |

\* adjustable stroke. Shapes are drawn for the default weight and look starved or clogged far from it, so the stroke score is 70% the default and 30% the adjusted value.

Scores are a starting point; the brand owner picks. To change: `icons.py brand.yaml --library <name>`.

Licence traps: Remix Icon changed its licence in 2026 and forbids use in logos and app icons; Font Awesome Free icons are CC BY 4.0 and need attribution; Material Symbols is Apache-2.0 and keeps its NOTICE. See references/icons.md.
