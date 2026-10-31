# Spec Delta

## Purpose

Defines the layout and saving behaviour of the settings page, so the user finds a setting by the feature it
belongs to and never loses a change by forgetting to save.

## ADDED Requirements

### Requirement: Section navigation
The settings page SHALL show a navigation list of sections (General, Post marks, Follow & unfollow,
Duplicate replies, Key accounts, Notes, Data) and show one section at a time, General first. The chosen
section SHALL be marked in the list. On a narrow window the list SHALL sit above the section instead of
beside it.

#### Scenario: Choosing a section
- **WHEN** the user chooses "Follow & unfollow" in the list
- **THEN** only that section's settings are shown and "Follow & unfollow" is marked as current

#### Scenario: Narrow window
- **WHEN** the settings page is 500 px wide
- **THEN** the section list is above the settings and nothing scrolls sideways

### Requirement: Switches and units
On/off settings SHALL be shown as switches with their label and, where useful, a one-line description.
Number fields SHALL show their unit next to the value (for example hours, views per hour, per day, minutes,
days, %).

#### Scenario: A threshold with its unit
- **WHEN** the user opens Post marks
- **THEN** the old-post threshold reads 48 with "hours" next to it

### Requirement: Changes save automatically
Every change on the settings page SHALL be saved without a Save button: a switch or choice when it changes, a
number when the field loses focus or the user pauses typing. The page SHALL show a short "Saved" indicator
after each save. Open x.com tabs SHALL apply the change without a reload.

#### Scenario: Turning a switch off
- **WHEN** the user turns off "Duplicate reply warning"
- **THEN** "Saved" appears and an open x.com tab stops showing the warning without a reload

#### Scenario: Typing a number
- **WHEN** the user changes the daily follow limit from 20 to 30 and moves to another field
- **THEN** 30 is stored and "Saved" appears

### Requirement: Invalid numbers are not saved
When a number field is empty or not a number, the page SHALL NOT save it, SHALL mark the field and say why,
and SHALL keep the stored value. A number outside its allowed range SHALL be saved as the nearest allowed
value and the field SHALL show that value.

#### Scenario: Empty field
- **WHEN** the user clears the old-post threshold and leaves the field
- **THEN** the field is marked, nothing is saved, and the stored value is still 48

#### Scenario: Out of range
- **WHEN** the user enters 2 as the pace window in minutes
- **THEN** 5 is saved and the field shows 5

### Requirement: Advanced settings collapsed
Fine-tuning numbers that most users never change (similarity threshold, how many recent replies to compare,
short-reply repeat count, pace window, relationship staleness) SHALL be in a collapsed "Advanced" part of
their section, opened by the user.

#### Scenario: Duplicate replies section
- **WHEN** the user opens Duplicate replies
- **THEN** the warning switch is shown and the similarity threshold appears only after opening "Advanced"
