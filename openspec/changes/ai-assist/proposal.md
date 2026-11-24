# Proposal

## Why
Writing thoughtful replies across languages takes time. Offer opt-in drafts and rewrites with the user's own provider, while leaving selection and sending to the user.

## What Changes
- Add bilingual AI settings, seven provider presets, language, tone and optional style examples.
- Add three reply candidates (Alt+G) and polish/shorten/translate/casual rewrites near composers.
- Allow insertion only after an explicit candidate selection; sending and all X actions remain manual.
- Add a background-only, permission-gated request adapter and isolated credential storage; update privacy documentation and version to 0.8.0.

## Capabilities
### New Capabilities
- `ai-assist`: opt-in provider configuration, candidate generation and explicit insertion.
### Modified Capabilities
None. Existing duplicate warnings remain active.

## Impact
manifest.json, package.json, src/lib/ai.js, src/background.js, src/content.js and CSS, options, locales, store reset/import behavior, unit/e2e tests, README, PRIVACY, CLAUDE.md, OpenSpec context and release instructions. No new dependencies.

## Out of scope
Cloud login/provider implementation, automatic sending, bulk generation, packaging and publishing.

## How the rules are kept
AI is off initially, requests originate only from the worker after granting the configured origin. The key stays outside exported state. Only selecting a candidate edits the composer; nothing clicks or sends on X.
