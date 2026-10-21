# ui-language Specification

## Purpose
Lets the user pick the language of Xhandy's interface, independent of the browser language, and keeps
translations organised so a new language can be added without touching feature code.

## Requirements

### Requirement: Language setting
The settings page SHALL offer a language choice before all other settings, with the options Auto,
English and 中文. Each language SHALL be named in its own language; Auto SHALL be labelled in the
current interface language. The default SHALL be Auto. Choosing an option SHALL save it at once,
without pressing Save and without changing any other unsaved field.

#### Scenario: Default for a new user
- **WHEN** a user installs Xhandy and has never changed the language
- **THEN** the language is Auto

#### Scenario: Picking a language
- **WHEN** the user picks 中文 on the settings page
- **THEN** the choice is stored immediately, and other fields keep the values typed into them

### Requirement: Resolving Auto
With Auto, Xhandy SHALL use Chinese when the browser language starts with "zh" and English for every
other language. A stored value that is not a supported language SHALL be treated as Auto.

#### Scenario: Chinese browser
- **WHEN** the language is Auto and the browser language is zh-TW
- **THEN** the interface is in Chinese

#### Scenario: Other browser language
- **WHEN** the language is Auto and the browser language is de-DE
- **THEN** the interface is in English

### Requirement: One language everywhere
The settings page, the toolbar popup and every hint Xhandy shows on x.com (badges, stats bar, panel,
toasts, duplicate warning) SHALL use the chosen language. The settings page SHALL NOT show two
languages side by side, and its `lang` attribute SHALL match the chosen language. Number formats that
depend on language (万 in Chinese, K in English) SHALL follow the chosen language.

#### Scenario: English on a Chinese browser
- **WHEN** the browser language is zh-CN and the user picks English
- **THEN** the settings page, popup and x.com hints are all in English, and view counts use K

#### Scenario: Settings page in one language
- **WHEN** the user opens the settings page with English chosen
- **THEN** no Chinese text appears apart from the language option named 中文

### Requirement: Switching without reload
Changing the language SHALL update the settings page at once and the hints on open x.com tabs the next
time they redraw, without reloading X. A toast already on screen MAY stay in the old language.

#### Scenario: Open X tab
- **WHEN** an x.com tab is open with Chinese badges and the user picks English in settings
- **THEN** the badges and stats bar in that tab switch to English without a reload

### Requirement: Translation files
Each supported language SHALL have its own translation file, and supported languages SHALL be listed in
one place. A string missing from a language SHALL fall back to English. English SHALL be complete.

#### Scenario: Missing string
- **WHEN** a key exists in English but not in another language
- **THEN** that language shows the English text for it

#### Scenario: Completeness check
- **WHEN** the unit tests run
- **THEN** they fail if a supported language lacks an English key, has a key English lacks, or uses
  different {placeholders} from English for the same key
