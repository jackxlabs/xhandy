# Tasks
- [x] 1. Add pure prompts, provider adapters, example selection and unit tests; npm test passes.
- [x] 2. Add permission-gated worker, separate credentials and settings/import/reset handling; worker and storage tests pass.
- [x] 3. Add bilingual settings and manual composer drafts/rewrites; local fake-provider e2e covers selection, dismissal and no automatic action.
- [x] 4. Update promises, privacy, release instructions and version 0.8.0; OpenSpec validates.
- [x] 5. Run unit and e2e checks, attempt independent cross-review and write verification receipt with remaining manual checks.

## Remaining verification outside the sandbox
- [ ] 6. Run the full e2e suite on the host; Chromium currently fails before tests start (see verification.md).
- [ ] 7. Complete cross-vendor review and resolve findings; agy cannot bind a socket in this sandbox.
- [ ] 8. Manually verify real X editor insertion/undo and all three themes before release.
