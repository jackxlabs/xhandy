# Design

## Context
The MV3 extension has no worker. Content uses explicit storage parts and X editors are contenteditable. `sent` has full text, kind, recipient and confirmation time; `mine` has creation time, recipient, 80-character prefix and views, but no shared id in sent.

## Goals / Non-Goals
Provide manual AI assistance, not automation. No new dependencies, remote scripts, cloud service or network requests until opted in.

## Decisions
- Pure `ai.js` builds prompts, validates configuration, selects examples, builds provider requests and parses exactly three bounded strings. Provider dispatch is the future extension point for a cloud adapter; do not expose a nonworking cloud option.
- Settings add flat typed defaults without converting existing data (version 5 remains valid). API key is a separate `xh:aiKey` record bound to the exact API base URL, never a store part. Content only reads the existing part allowlist; it never requests or receives credentials. Chrome local storage access control is area-wide, so do not disable existing content storage access.
- API base URLs permit HTTPS or loopback HTTP only; no URL credentials, queries or fragments. Optional host declaration supports custom HTTPS origins plus loopback HTTP; request only the selected origin. Deny redirects, omit cookies and never show provider response bodies/errors (they can echo secrets). Configuration changes disable AI; re-enable explicitly. Imported settings always disable AI and cannot replace the key.
- One in-flight request per caller, 30 seconds including body reading, no retry. Disabling/changing AI aborts in-flight requests. Worker validates sender, operation and bounded inputs. Connection test sends only a tiny synthetic prompt.
- Examples match reply recipient, exact 80-character prefix and timestamps within two minutes; ambiguous matches are omitted. Select at most five distinct full replies from the last 30 days, descending known views. No additional collection or guessing.
- Reply context comes from the editor's dialog/status parent or the user's last reply-button action. Missing or ambiguous context means no generation, with an explanation. Rewriting needs only the current text. No automatic opening of composers.
- Use a native non-modal popover with visible close control, labeled native selects and existing theme tokens. Preserve the editor selection. Use insertText only after trusted candidate selection; a rewrite replaces only the original editor snapshot. If text, route, context or editor changes while waiting, do not apply stale output. Never synthesize clicks, pointer or input events. Check duplicate warnings directly after insertion as well as the normal input handler.
- Show X-weighted approximate count (CJK weight 2); never silently cut model output. The prompt requests <=280; over-limit candidates remain visible with count for user review. A precise twitter-text URL/emoji parser is out of scope and the UI labels counts approximate.
- Explicit settings Apply/enable action is needed for permission user activation and credential/config consistency; other ordinary settings retain autosave. Keys remain in the password field only on the options page. Switching base clears the displayed key; saved key binding prevents forwarding it to another provider.

## Risks / Trade-offs
X editor internals can change: validate insertText and undo in fixture, then manually check real X before release. Providers/models can be retired; model names remain editable. Native popover requires Chromium 114+ (manifest minimum). API permission is origin-wide by Chrome design, although requests use only the configured base path.

## Validation
Unit tests: prompt constraints, adapters, malformed output, endpoint validation, examples, worker authorization/timeout/redaction, credential export/import/reset. E2e: local fake HTTP provider, grant on settings action, draft/no mutation before choice, insertion/rewrites, Escape, no synthetic clicks, duplicate warning. Run npm test and CHROMIUM=/usr/bin/chromium npm run e2e; report sandbox failures honestly. Run cross-vendor review when available.

## Implementation notes
- AI composer code is a separate helper to avoid expanding the already large content.js; selectors and reply-context extraction stay in content.js.
- Chromium minimum is 114 for native Popover support. The HTML guide informed non-modal popovers, real buttons, accessible labels and restoring editor focus; no custom outside-click dismissal or focus trap is used.
- Test results and blocked host checks are recorded in verification.md. No real provider keys were used.
