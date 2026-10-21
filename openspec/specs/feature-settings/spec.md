# feature-settings Specification

## Purpose
Lets the user switch each Xhandy feature on or off from one place on the settings page, so they keep
only the hints they want, with every feature on by default.

## Requirements

### Requirement: One place for feature switches
The settings page SHALL show a "Features / 功能开关" section before all other sections that holds every
on/off switch, each labelled in Chinese and English. Number fields SHALL stay in their feature's section.

#### Scenario: Opening the settings page
- **WHEN** the user opens the settings page
- **THEN** the first section lists switches for the post age chip, heat colour, interaction chip,
  interactions from others, reply count and author size, already-replied mark, follow relationship,
  duplicate-reply warning, follow and unfollow reminders, and the stats bar

#### Scenario: Dependent switches
- **WHEN** the post age chip or the interaction chip is unchecked
- **THEN** heat colour or interactions from others, shown indented under it, is disabled

#### Scenario: Saving a switch
- **WHEN** the user turns a switch off and presses Save
- **THEN** the setting is stored and open x.com tabs apply it without a reload

### Requirement: New switches default to on
New switches SHALL default to on. Data saved by an older version without these settings SHALL load
with them on, and old export files SHALL still import.

#### Scenario: Upgrading
- **WHEN** a user upgrades from a version without these switches
- **THEN** every feature behaves as before until the user turns something off

### Requirement: Post age chip switch
When the post age chip is off, post badges SHALL NOT show the age chip, including its heat colour and
"old post" mark. Other chips SHALL still show.

#### Scenario: Age chip off
- **WHEN** the post age chip is off and a post has other chips
- **THEN** the badge shows the other chips without the age chip

#### Scenario: Nothing left to show
- **WHEN** every chip for a post is off or has no data
- **THEN** no badge is shown for that post

### Requirement: Interaction chip switch
When the interaction chip is off, post badges SHALL NOT show the interaction chip in either form
("interacted N times" or the two-direction form), whatever the interactions-from-others switch says.
Interactions SHALL still be counted, so turning the chip back on shows up-to-date numbers.

#### Scenario: Interaction chip off
- **WHEN** the interaction chip is off and the user has interacted with a post's author
- **THEN** no interaction chip is shown, and the count keeps growing in storage

### Requirement: Duplicate-reply warning switch
When the duplicate-reply warning is off, the composer SHALL NOT show the duplicate warning. Sends SHALL
still be recorded, so turning it back on compares against the full history.

#### Scenario: Warning off
- **WHEN** the warning is off and the user types a reply identical to a recent one
- **THEN** no warning appears

### Requirement: Follow and unfollow reminder switch
When the follow and unfollow reminders are off, Xhandy SHALL NOT show limit or pace toasts and SHALL
NOT colour the stats bar's follow count. Follows and unfollows SHALL still be counted, and the ordinary
"followed" and "unfollowed" toasts SHALL still appear.

#### Scenario: Reminders off
- **WHEN** reminders are off and the user follows their 30th account today with a limit of 20
- **THEN** the ordinary "followed" toast appears, with no limit toast and no orange count
