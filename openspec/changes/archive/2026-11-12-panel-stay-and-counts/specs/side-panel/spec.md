# Spec Delta

## Purpose
The side panel on x.com hosts Xhandy's list views (not following you back, key accounts). This capability
covers how the panel behaves as a container, independent of which view it shows.

## ADDED Requirements

### Requirement: Panel stays open across page loads
While the side panel is open, Xhandy SHALL remember, for the current tab only, which view is shown, the
search text and the list's scroll position. When a page on x.com loads in that tab and the panel was open,
Xhandy SHALL reopen it on the same view with the same search text and scroll position, without the user
doing anything. Other tabs SHALL NOT be affected.

#### Scenario: Opening a profile from the list
- **WHEN** the panel is open on "Not following you back", scrolled down, and the user clicks an account in it
- **THEN** the profile loads and the panel is open on the same view at the same scroll position

#### Scenario: Search text is kept
- **WHEN** the user typed "ali" in the panel's search box and then clicks a result
- **THEN** after the profile loads, the search box still holds "ali" and the list is filtered by it

#### Scenario: Back button
- **WHEN** the user goes back from the profile to the previous page
- **THEN** the panel is still open on the same view

#### Scenario: Another tab
- **WHEN** the panel is open in one tab and the user opens x.com in a new tab
- **THEN** the panel is closed in the new tab

### Requirement: Closing is remembered
When the user closes the panel (close button, Esc, or the view's shortcut), it SHALL stay closed on later
page loads in that tab until the user opens it again. When the feature behind the shown view is turned off
in settings, the panel SHALL close and SHALL NOT be restored.

#### Scenario: Closed stays closed
- **WHEN** the user closes the panel with Esc and then reloads the page
- **THEN** the panel is closed

#### Scenario: Feature turned off
- **WHEN** the panel was open on key accounts, key accounts is turned off, and a page loads
- **THEN** the panel is closed

### Requirement: Restoring does not take focus
When the panel is restored after a page load, Xhandy SHALL NOT move keyboard focus into it, so X's own
shortcuts work on the page. When the user opens the panel themselves, focus SHALL go to the search box as
before.

#### Scenario: Shortcuts after restore
- **WHEN** the panel is restored after a profile loads and the user presses j
- **THEN** X selects the next post and nothing is typed into the panel's search box

### Requirement: Remembered state is not trusted
The remembered state SHALL be read defensively: an unknown view, a search text longer than 50 characters or
a malformed value SHALL be ignored and the panel SHALL stay closed. The remembered state SHALL contain only
the view, the search text and the scroll position.

#### Scenario: Malformed state
- **WHEN** the remembered state is not valid
- **THEN** the panel stays closed and no error surfaces on X
