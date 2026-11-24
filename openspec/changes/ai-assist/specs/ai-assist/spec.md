# Spec Delta

## ADDED Requirements

### Requirement: Optional provider configuration
AI SHALL default off. Bilingual settings SHALL offer OpenRouter, Gemini, OpenAI, Anthropic, DeepSeek, Ollama and custom OpenAI-compatible bases, editable models, language, tone and style examples (default on). Enabling SHALL request only the selected origin. Keys SHALL be stored separately, excluded from export/import, bound to their base URL, and deleted on reset. Import SHALL leave AI off.

#### Scenario: Initial install
- **WHEN** the extension loads with no AI setup
- **THEN** it sends no network requests and AI is disabled

#### Scenario: Moving data
- **WHEN** data is exported, imported or cleared
- **THEN** export contains no key, import cannot overwrite a key or enable AI, and clear removes the key

### Requirement: Manual candidates
A reply composer SHALL offer AI drafts with Alt+G, temporary tone/language choices and three candidates with approximate weighted counts. Rewrite actions SHALL include polish, shorten, translate and casual for nonempty reply/post composers. Only the user's explicit selection SHALL insert or replace text. Sending SHALL remain manual; duplicate warnings SHALL still work. Esc SHALL dismiss the candidates.

#### Scenario: Draft without selection
- **WHEN** generation completes
- **THEN** three candidates appear and the editor remains unchanged

#### Scenario: Selection
- **WHEN** the user selects a candidate for an unchanged editor
- **THEN** text is inserted at the saved selection, or replaced for a rewrite, and nothing is sent

#### Scenario: Stale editor
- **WHEN** the editor text, route or reply context changed since generation
- **THEN** candidate selection does not overwrite it

### Requirement: Private bounded requests
Only the worker SHALL send requests, after validating sender, enabled configuration, permission and bounded inputs. Requests SHALL time out after 30 seconds, not retry or follow redirects, and not expose keys in errors. Tests SHALL send only a tiny synthetic prompt. Failures SHALL show a localized explanation, with HTTP status where available and a settings link when configuration is missing.

#### Scenario: Invalid response
- **WHEN** a provider returns malformed output or an HTTP error
- **THEN** no candidate is inserted and a safe error explains the failure

### Requirement: Human writing and style reference
Prompts SHALL address specific parent content, include display name and handle, avoid generic praise, invented facts, emoji/hashtag/em-dash excess and AI self-identification, and request <=280 weighted characters. Examples SHALL be at most five unambiguously associated full replies within 30 days, sorted by views, used for style without copying.

#### Scenario: Missing association
- **WHEN** sent and mine cannot be matched unambiguously
- **THEN** no example is fabricated or sent for that record
