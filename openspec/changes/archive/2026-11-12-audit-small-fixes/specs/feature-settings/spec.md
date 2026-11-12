# Spec Delta

## ADDED Requirements

### Requirement: Imported number settings stay in range
Each number setting that has a field on the settings page SHALL have one allowed range, used both by the
settings page and by import. Importing a file SHALL bring a number setting outside its range to the
nearest allowed value, and SHALL round a whole-number setting. Settings already stored SHALL be read
unchanged.

#### Scenario: Import file with a value below the range
- **WHEN** the user imports a file whose settings hold `staleHours: -5`
- **THEN** the stored value is 1, the lowest allowed

#### Scenario: Import file with a value above the range
- **WHEN** the user imports a file whose settings hold `paceMinutes: 100000`
- **THEN** the stored value is 1440, the highest allowed

#### Scenario: Value in range
- **WHEN** the user imports a file whose settings hold `followLimit: 35`
- **THEN** the stored value is 35

#### Scenario: Typing in the settings page
- **WHEN** the user types a number outside the range in a field on the settings page
- **THEN** it is saved as the nearest allowed value, as before
