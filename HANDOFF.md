# HANDOFF: unfollow-detection

Updated 2026-10-29 on Omarchy. Continue on the Mac.

## Done

- OpenSpec change `openspec/changes/unfollow-detection/` is written, reviewed against the code and committed (`openspec validate unfollow-detection` passes). No code written yet.
- Key point from the review: today an omitted `followed_by` / `following` becomes `false` twice (`src/page-hook.js` `collectRelations` uses `!!`, `src/lib/store.js` `cleanRelations` uses `=== true`). The change makes them three-state (true / false / omitted) end to end; see design.md decision 5.

## Next step: task 0.1 (blocks task 2.1)

On real X, find out whether `relationship_perspectives` carries an explicit `followed_by: false` or leaves the key out when someone does not follow you back.

How (no code change needed):
1. Open the profile of an account you follow that does not follow you back.
2. DevTools → Network → filter `graphql` → open the `UserByScreenName` response (also check a timeline response such as `HomeTimeline`) → search for `relationship_perspectives`.
3. Compare with a mutual's profile (should show `followed_by: true`).

Then write the answer into design.md, decision 5 "Open question":
- Explicit `false` is sent: keep the design, start with tasks 1.1–1.4.
- Key is left out: revise case 2 in design.md (and the spec's safeguard requirement) before writing 2.1. Tasks 1.x can still go ahead.

Then `/opsx:apply unfollow-detection`. Before committing: `npm test` and `CHROMIUM=... npm run e2e`.

## Blocked

Nothing else. Delete this file when the change is archived.
