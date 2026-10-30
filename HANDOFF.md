# HANDOFF: ui-refresh

Branch `ui-refresh` (pushed to origin). OpenSpec change: `openspec/changes/ui-refresh/`.

## Done
- Tasks 1.1 to 6.1 implemented by agy, reviewed by Claude, one commit per group.
- `npm test` 107/107, `CHROMIUM=/usr/bin/chromium npm run e2e` 90 ok, no FAIL (2026-10-30, Omarchy).

## Next
1. Task 6.2, manual check on real X (Mac and Linux, light and dark): check out `ui-refresh`, reload the
   unpacked extension, refresh x.com. Check post badges and icons, whether the stats bar's default
   bottom-right position overlaps X's chat drawer (if it does, raise the `hudBottom` default in
   `src/lib/store.js` and the e2e default-position step), dragging, panels with long names, popup, settings.
2. When Jack approves: merge into main, archive the change (`/opsx:archive`), delete the branch.
3. Task 6.3: retake `docs/relations-zh.png` and `docs/heat-zh.png` on real X, then the 1280×800 store screenshots.
