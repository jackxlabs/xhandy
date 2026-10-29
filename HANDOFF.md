# HANDOFF: unfollow-detection

Updated 2026-10-29 on the Mac.

## Done

- Task 0.1 answered on real X: GraphQL `UserByScreenName` sends an explicit `"followed_by": false` for a followed account that does not follow back (`true` for a mutual). Recorded in design.md decision 5; case 2 kept as designed.
- All tasks 1.1–4.1 implemented (not committed yet): three-state flags in `collectRelations` / `cleanRelations`, `mAt` / `lostAt` / `ackAt` in `cleanRelEntry`, pure transition function `store.nextRel` used by the `xh-relations` handler, "Recently unfollowed you" section with `×` dismiss in the `Alt+U` panel, README (EN + 中文) and PRIVACY.md.
- Independent review by a subagent, fixes applied: detection trusts only `mAt` (now "last seen mutual"); storage v5 migration gives old mutuals `mAt = t`; the user's own unfollow clears `mAt` / `lostAt` / `ackAt` (`store.relAfterFriendship`) and drops a stale `following` from the 1 s batch; a handle that now has a different user id starts fresh; recent rows also show "still mutual {ago}" and interaction count.
- `npm test` 101/101, e2e 82/82. `openspec validate unfollow-detection` passes.

## Open (Jack to confirm on real X; not verified yet as of 2026-10-29)

- Only `UserByScreenName` was checked. Has the Alt+U list ever shown a real mutual as "not following you back"? If yes, some other GraphQL operation sends a placeholder `followed_by: false`, and alerts need an allow-list of operations (see design.md Risks).

## Next

1. Committed 2026-10-29 (not pushed). Jack is testing locally: reload the unpacked extension and use it on real X for a while. An alert only shows once X shows you a former mutual again with `followed_by: false`.
2. `/opsx:archive unfollow-detection`, then delete this file.
3. Releasing (version bump in `manifest.json`, `npm run pack`, push `public`) only when Jack says so.
