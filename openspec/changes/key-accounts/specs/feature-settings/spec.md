# Spec Delta

## MODIFIED Requirements

### Requirement: One place for feature switches
The settings page SHALL show a "Features / 功能开关" section right after the language setting and before
all other sections, holding every on/off switch, each labelled in the interface language. Number fields
SHALL stay in their feature's section.

#### Scenario: Opening the settings page
- **WHEN** the user opens the settings page
- **THEN** the features section lists switches for the post age chip, heat colour, interaction chip,
  interactions from others, reply count and author size, already-replied mark, follow relationship,
  key accounts, duplicate-reply warning, follow and unfollow reminders, and the stats bar

#### Scenario: Dependent switches
- **WHEN** the post age chip or the interaction chip is unchecked
- **THEN** heat colour or interactions from others, shown indented under it, is disabled

#### Scenario: Saving a switch
- **WHEN** the user turns a switch off and presses Save
- **THEN** the setting is stored and open x.com tabs apply it without a reload
