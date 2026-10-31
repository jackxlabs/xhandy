# Spec Delta

## Purpose

Defines how everything Xhandy draws looks, so that its badges, toasts, stats bar, panels, popup and settings
page read as one calm system that fits next to X in light and dark mode.

## ADDED Requirements

### Requirement: Colour carries meaning only
Surfaces, text and borders that Xhandy draws SHALL use neutral greys that match X. Colour SHALL be used only
for meaning: green for a mutual follow, orange for heat and warnings, red for a detected unfollow, and violet
for things about the user (their numbers, the replied mark, the selected item and the main action); the
key account star and edge keep their own colours. The brand gradient SHALL NOT appear on badges, toasts, the stats bar, panels, the popup or the
settings page.

#### Scenario: A post with several chips
- **WHEN** a post shows a mutual chip, an interaction chip and a warm heat chip
- **THEN** the mutual chip is green, the heat chip is orange, and the interaction chip is grey

#### Scenario: No gradient edge
- **WHEN** the stats bar, a panel or the popup is shown
- **THEN** none of them has a gradient edge or gradient background

### Requirement: Numbers use the interface font
Numbers that Xhandy shows SHALL use the same font as the surrounding text, with figures of equal width so
columns and changing numbers do not jump. Xhandy SHALL NOT use a monospace font for numbers.

#### Scenario: Stats bar numbers
- **WHEN** the stats bar shows today's counts
- **THEN** the counts use the page's font with equal-width figures, not a monospace font

### Requirement: Icons are drawn, not emoji
Xhandy's icons (key account star, heat flame, note, warning, settings, close, search, lock) SHALL be inline
line icons that take the colour of their text, so they look the same on every system. Xhandy SHALL NOT use
emoji as icons, and SHALL NOT load icons or fonts over the network.

#### Scenario: Same look on every system
- **WHEN** a hot post's heat chip is shown on Windows, macOS and Linux
- **THEN** the flame is the same line icon in the chip's colour on all three

### Requirement: Toasts
Xhandy's toasts SHALL be rounded cards on a neutral surface with a thin border and shadow, with an icon in
the toast's meaning colour before the title. They SHALL NOT have a coloured bar along one side.

#### Scenario: Duplicate reply toast
- **WHEN** the duplicate reply warning appears
- **THEN** it shows an orange warning icon, a title, the similarity line and the earlier reply in a grey
  quote box, with no coloured side bar

### Requirement: Light and dark
Every surface Xhandy draws SHALL follow X's light or dark appearance on x.com and the browser's colour scheme
in the popup and settings page, with text contrast of at least 4.5:1 in both.

#### Scenario: X in dark mode
- **WHEN** X is in dark mode
- **THEN** badges, toasts, the stats bar and panels use the dark colours and stay readable

### Requirement: Long names never overflow
In panels and the popup, a display name and handle SHALL stay on one line and be cut with an ellipsis when
they do not fit. They SHALL NOT widen the panel or push other parts of the row out of view.

#### Scenario: Very long display name in a panel
- **WHEN** an account with a 50-character display name is listed in the Not following back panel
- **THEN** the row stays one line high for the name, ends the name with an ellipsis, and the panel keeps its
  width
