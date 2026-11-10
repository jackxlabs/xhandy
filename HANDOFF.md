# HANDOFF

## ui-refresh (merged into main 2026-10-31)
OpenSpec change `openspec/changes/ui-refresh/` stays unarchived until these are done (6.2 passed 2026-10-31):
1. Task 6.3: retake `docs/relations-zh.png` and `docs/heat-zh.png` on real X, then the 1280×800 store screenshots.
2. Then archive the change (`/opsx:archive`) and delete the `ui-refresh` branch.

## v0.6.1 (store update)
v0.6.0 is live on the Chrome Web Store (confirmed 2026-11-09): https://chromewebstore.google.com/detail/xhandy/ddchjfknionekeplnehokjbngoeccaan
2026-11-09: v0.6.1 committed (`9e0f0ea`), pushed to `origin` and `public`, GitHub Release v0.6.1 out, store package uploaded (`npm run cws -- upload`, SUCCEEDED).
1. Submitted for review 2026-11-10 via `npm run cws -- publish` (PENDING_REVIEW, publishes automatically after approval). Check with `npm run cws -- status`. The first try on 11-09 failed because GitHub timeouts made the listing URLs unreachable; move them to xhandy.app once the site is up.
2. Tell existing unpacked users to export, install from the store, import, and remove the old copy.
3. Screenshots: take more, with an English UI and less blur, and replace the two `docs/*-zh.png`, then finish ui-refresh task 6.3 above.
