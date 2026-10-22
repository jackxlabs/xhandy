## Why

On a real Mac browser the post badge is cut off: X's name row has a fixed width, and on a post's own page the
Subscribe button takes more of it, so "💬 10K · …" shows as "💬 1" and the star disappears. Half of what the
badge shows is already on the same post (X shows the post's age next to the name and the reply count in the
action bar), and the most common relationship, "not following", is noise.

## What Changes

- Heat chip: shows views per hour only ("🔥 95万/时" / "🔥 950K/h"); the age is dropped because X shows it.
  Old posts keep the grey colour and the "old" mark. With no view data, a recent post shows no heat chip.
- Relationship chip: shorter text ("→ 我关注" / "← 关注我" / "⇄ 互关"), and no chip when neither follows
  the other.
- Interaction chip (one direction): "1次 · 2天前" / "1× · 2d ago" instead of "互动1次 · 2天前". The
  two-direction form ("我3 · 他5 · 今天") is unchanged.
- Reply chip: reply count plus size ratio ("💬 10K · 9万×"); the author's follower count is dropped. The
  ratio uses compact numbers.
- Placement: on a post's own page (the focal post) the badge always has its own row above the post text.
  Elsewhere it stays in the name row and moves to its own row only when it does not fit, so nothing is cut off.
- Settings labels for the age switch follow the new meaning (heat chip).

Out of scope: new data, new switches, changing the two-direction chip, the replied chip or the star, a hover
card for hidden details, and the storage schema (no migration needed).

## Capabilities

### New Capabilities
- `badge-layout`: where the badge goes and that it is never cut off.

### Modified Capabilities
- `post-badges`: reply chip content.
- `feature-settings`: the age chip switch now controls the heat chip.
- `reverse-interactions`: the one-direction interaction chip text.

## Impact

- `src/content.js` (annotate, fitBadge), `src/content.css`, `src/lib/i18n.js` (replyChip), `src/locales/en.js`
  and `zh.js`, `src/options/` labels, `test/e2e.mjs`, `test/i18n.test.js`, `test/fixtures/timeline.html`,
  README (en and zh chip examples), `docs/release-template.md`.
- Rules: display only. Nothing new is read, stored or sent; Xhandy still never clicks or types for the user.
