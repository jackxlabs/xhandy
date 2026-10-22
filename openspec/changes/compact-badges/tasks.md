## 1. Chip texts

- [x] 1.1 Heat chip without age, old-post and no-data cases (src/content.js); e2e: update "badges show post age, old post is marked stale" and "views per hour colour the age chip" to the new texts, and assert a recent post with no view data has no heat chip
- [x] 1.2 Relationship chip hidden for "neither follows", shorter zh texts (src/content.js, src/locales); e2e: a "none" relationship shows no relationship chip, and "→ 我关注" shows in Chinese
- [x] 1.3 One-direction interaction chip "1次 · 2天前" / "1× · 2d ago" (locales); update the e2e steps that match the old text
- [x] 1.4 `XH.replyChip` without the author count, compact ratio (src/lib/i18n.js); unit tests in test/i18n.test.js for the spec scenarios (23 → "💬 23 · 12×", large ratio in both languages, "💬 6", unknown own count); update the e2e reply chip step
- [x] 1.5 Settings labels for showAge / showHeat (locales); i18n completeness test still passes

## 2. Placement

- [ ] 2.1 Factor `placeAsRow(article, badge)` out of `fitBadge`; focal post on its status page always in a row (src/content.js); fixture: a status-page fixture or a URL the test can open where the focal post has tweetText; e2e: focal post badge is before its text, a reply on the same page stays in its name row
- [ ] 2.2 Keep the existing "doesn't fit" e2e step passing; add one where the post has no tweetText and the badge is not clipped (scrollWidth <= clientWidth + 1)

## 3. Docs

- [ ] 3.1 README (English Features and 中文说明) and docs/release-template.md chip examples match the new texts; no privacy change
