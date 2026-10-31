# HANDOFF

## ui-refresh (merged into main 2026-10-31)
OpenSpec change `openspec/changes/ui-refresh/` stays unarchived until these are done:
1. Task 6.2, manual check on real X (Mac and Linux, light and dark): reload the unpacked extension from `main`,
   refresh x.com. Check post badges and icons, whether the stats bar's default bottom-right position overlaps X's
   chat drawer (if it does, raise the `hudBottom` default in `src/lib/store.js` and the e2e default-position step),
   dragging, panels with long names, popup, settings.
2. Task 6.3: retake `docs/relations-zh.png` and `docs/heat-zh.png` on real X, then the 1280×800 store screenshots.
3. Then archive the change (`/opsx:archive`) and delete the `ui-refresh` branch.
