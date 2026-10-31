# Spec Delta

## Purpose

Defines where the stats bar sits on x.com and how the user moves it, so it never covers what they are working
on and stays where they put it.

## ADDED Requirements

### Requirement: Default position
When the user has not moved it, the stats bar SHALL sit in the bottom-right corner of the window, 16 px from
the right and bottom edges, so it does not cover the reply box in the centre column.

#### Scenario: First time on x.com
- **WHEN** the user opens x.com with the stats bar on and has never moved it
- **THEN** the stats bar is in the bottom-right corner, not over the centre column

### Requirement: The user can drag the stats bar
The user SHALL be able to move the stats bar by pressing on it and dragging. Dragging SHALL move only the
stats bar, SHALL NOT select text or click anything on X, and SHALL NOT start from a plain click.

#### Scenario: Dragging
- **WHEN** the user presses on the stats bar and drags it to the top-left area of the window
- **THEN** the stats bar follows the pointer and stays where it is released

#### Scenario: A click is not a drag
- **WHEN** the user clicks the stats bar without moving the pointer more than a few pixels
- **THEN** the stats bar does not move

### Requirement: The position is remembered
Xhandy SHALL store the stats bar's position, measured from the window's right and bottom edges, in the local
settings when a drag ends, and SHALL use it in every x.com tab and after a reload. Export and import SHALL
include it.

#### Scenario: Another tab
- **WHEN** the user drags the stats bar in one x.com tab and then opens x.com in another tab
- **THEN** the stats bar is at the new position in the other tab

### Requirement: The stats bar stays in the window
The stats bar SHALL always be fully inside the window. When the window becomes smaller than the stored
position allows, the stats bar SHALL be shown at the nearest position inside the window, and the stored
position SHALL stay unchanged until the user drags it again.

#### Scenario: Window made narrower
- **WHEN** the stats bar was dragged far from the right edge and the user makes the window narrower
- **THEN** the stats bar moves just enough to stay fully visible

### Requirement: Reset position
The settings page SHALL offer a "Reset position" action for the stats bar that puts it back at the default
position in every open x.com tab.

#### Scenario: Resetting
- **WHEN** the user presses "Reset position" in settings
- **THEN** the stats bar returns to the bottom-right corner in open x.com tabs without a reload
