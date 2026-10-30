# Spec Delta

## Purpose

Defines what the toolbar popup shows: a quick read of today and the past week, and the way into Xhandy's
panels and settings.

## ADDED Requirements

### Requirement: Today first
The popup SHALL open with today's date and today's likes, replies, posts, follows and time on X, as large
numbers with their labels, in the interface language. Days with no activity SHALL show zeros.

#### Scenario: Opening the popup
- **WHEN** the user has given 12 likes and 23 replies today and opens the popup
- **THEN** the top of the popup shows 12 likes and 23 replies among today's five numbers

### Requirement: Seven-day replies chart
Below today's numbers the popup SHALL show a bar chart of replies for the last 7 days with today last and
highlighted, the day labels, and the 7-day total and daily average.

#### Scenario: A quiet week
- **WHEN** the user replied on only two of the last 7 days
- **THEN** the chart shows 7 bars, five of them empty, and the total and average match the two days

### Requirement: Entries to the panels
The popup SHALL list an entry for Key accounts showing the number of quiet key accounts and the shortcut
Alt+K, and an entry for Not following back showing how many followed accounts do not follow back and the
shortcut Alt+U. Choosing an entry SHALL open that panel in the active x.com tab and close the popup. When the
active tab is not x.com, the popup SHALL say to open x.com first. An entry SHALL be hidden when its feature is
switched off.

#### Scenario: Counts match the panels
- **WHEN** 7 followed accounts do not follow back and 2 key accounts are quiet
- **THEN** the popup shows 7 on the Not following back entry and 2 quiet on the Key accounts entry, the same
  numbers the panels show

#### Scenario: Not on x.com
- **WHEN** the active tab is not x.com and the user chooses Not following back
- **THEN** the popup stays open and says to open x.com first

### Requirement: Settings and privacy line
The popup SHALL have a settings button that opens the settings page, and SHALL end with the line that data is
stored only in this browser.

#### Scenario: Opening settings
- **WHEN** the user presses the settings button in the popup
- **THEN** the settings page opens
