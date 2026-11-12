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

## Code audit (2026-11-12)
Two OpenSpec changes are implemented, archived and committed (2026-11-12), not pushed: `openspec/changes/archive/2026-11-12-audit-small-fixes/`
(import clamps number settings to `store.SETTING_RANGES`, a failed migration is retried, 11 unused strings
removed, docs corrected) and `openspec/changes/archive/2026-11-12-audit-dedupe/` (structure only). 112 unit tests and 97 e2e
steps pass.
1. Committed on `main`, not pushed and not released: push to `origin` when Jack says. No version bump yet.
2. Open, needs Jack: how to cut `xh:rel` writes. Measured in Chromium: one `store.update(["rel"])` takes
   about 35 ms at 1,000 relationships, 320 ms at 10,000 and 1 s at 30,000, and it runs about once a second
   while timelines load. Skipping writes when nothing changed would make `mAt` up to an hour late, which
   changes the unfollow-detection spec, and does not help for accounts seen for the first time. The other
   choices are a longer batching window or per-record storage (IndexedDB in a service worker).
3. Open, needs Jack: Alt+U / Alt+K / Alt+H while typing (check on macOS whether Option+U/K/H in the reply
   box is swallowed), and whether to add CI.
4. Dropped after measuring: merging the three JSON walks in `src/page-hook.js` (under 0.5 ms per 100 KB response).


## Panel fixes and reply review (2026-11-12)
Order agreed with Jack 2026-11-12: `panel-stay-and-counts` first, then `reply-review`. Claude writes specs and
reviews, agy implements (herdr agent `xh-dev`, edit-only).
1. `openspec/changes/panel-stay-and-counts/`: groups 1 and 2 implemented, reviewed and committed on branch
   `panel-stay-and-counts` (not pushed, not merged). 117 unit tests and 104 e2e steps pass.
   Next: task 3.1, Jack checks on real X (reload the extension; Alt+U, click a few accounts, use Back; scroll the
   own Following page and see whether rows show follower AND following counts). The following-count field path
   (`relationship_counts.following`, fallback `legacy.friends_count`) is unconfirmed: if only followers show, fix
   the path in `collectRelations`. Then merge to `main`, archive the change, and decide on a version bump.
2. `openspec/changes/reply-review/` (reply review + daily follower snapshot): spec written and valid, untracked,
   no code yet. Jack agreed: store the first 80 characters of own posts, shortcut Alt+R, one switch for review and
   follower snapshots. Next: hand task group 1 to agy on a new branch `reply-review`, in a fresh agy session.
