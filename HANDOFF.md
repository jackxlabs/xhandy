# HANDOFF

## ui-refresh (merged into main 2026-10-31)
OpenSpec change `openspec/changes/ui-refresh/` stays unarchived until these are done (6.2 passed 2026-10-31):
1. Task 6.3: retake `docs/relations-zh.png` and `docs/heat-zh.png` on real X, then the 1280×800 store screenshots.
2. Then archive the change (`/opsx:archive`) and delete the `ui-refresh` branch.

## v0.6.1 (store update)
v0.6.0 is live on the Chrome Web Store (confirmed 2026-11-09): https://chromewebstore.google.com/detail/xhandy/ddchjfknionekeplnehokjbngoeccaan
v0.6.1 = the notifications-list shift fix (`226cc3e`) + store install and migration steps in README and `docs/release-template.md`.
1. After Jack OKs: commit, `npm run pack`, push `origin`, then (Jack's go) push `public` and `gh release create v0.6.1 dist/xhandy-0.6.1.zip -R jackxlabs/xhandy --notes-file <notes>` (regenerate notes with `scripts/release-notes.sh`).
2. Upload `dist/xhandy-0.6.1-store.zip` in the developer dashboard (Jack).
3. Tell existing unpacked users to export, install from the store, import, and remove the old copy.
4. Screenshots: take more, with an English UI and less blur, and replace the two `docs/*-zh.png`, then finish ui-refresh task 6.3 above.
