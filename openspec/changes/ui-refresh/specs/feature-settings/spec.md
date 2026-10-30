# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: One place for feature switches`
- TO: `### Requirement: Feature switches in their sections`

## MODIFIED Requirements

### Requirement: Feature switches in their sections
Each on/off switch SHALL be shown at the top of its feature's section on the settings page, labelled in the
interface language, above that feature's number fields: the stats bar and top posts in General; the heat
chip, heat colour, interaction chip, interactions from others, reply count and author size, already-replied
mark and follow relationship in Post marks; follow and unfollow reminders in Follow & unfollow; the
duplicate-reply warning in Duplicate replies; key accounts and notes in their own sections.

#### Scenario: Opening the settings page
- **WHEN** the user opens Post marks on the settings page
- **THEN** it lists switches for the heat chip, heat colour, interaction chip, interactions from others,
  reply count and author size, already-replied mark and follow relationship

#### Scenario: Dependent switches
- **WHEN** the heat chip or the interaction chip is off
- **THEN** heat colour or interactions from others, shown indented under it, is disabled

#### Scenario: Saving a switch
- **WHEN** the user turns a switch off
- **THEN** the setting is stored at once and open x.com tabs apply it without a reload

#### Scenario: Top posts off
- **WHEN** the top posts switch is off
- **THEN** profiles show no top posts button and Alt+B does nothing

#### Scenario: Notes off
- **WHEN** the notes switch is off
- **THEN** profiles show no note button, posts show no note chip, Alt+N does nothing, and stored notes are
  kept
