# Design

## Context

- Settings live in `xh:settings`. `cleanSettings` copies every key in `DEFAULTS.settings` with a type
  check, and `store.get()` fills missing parts and keys from DEFAULTS, so new settings need no VERSION
  bump or migrate() step.
- Existing switches: showHeat, showRel, showReplies, showReplied, showInbound, hud. The settings page
  has one checkbox per switch inside each feature section; `options.js` lists them by id.
- `annotate()` in `src/content.js` builds chips in order: age (with heat), relationship, interaction,
  replies, replied, target star. `checkDup()` runs on composer input. `onFriendship()` runs once per
  follow or unfollow that X confirmed (`friendships/create|destroy.json`) and shows one toast. The HUD
  colours the follow count when today's follows > followLimit.

## Goals / Non-Goals

**Goals:**
- Every feature has a switch, all in one section, all defaulting to on.
- A pace check that survives reloads and works across tabs.

**Non-Goals:**
- Changing toast or HUD appearance, or the daily limits' defaults.
- A switch for the target-account star (an empty list already turns it off) or the daily reply goal
  (0 already turns it off).

## Decisions

- **Setting names**: `showAge` (age chip incl. heat and "old post"), `showSeen` (interaction chip),
  `dupWarn`, `followWarn` (follow and unfollow limit and pace reminders), `followPace: 10`,
  `unfollowPace: 10`, `paceMinutes: 60`. All booleans default to true. One `followWarn` switch for both
  directions, because the risk is the same; separate limits stay as numbers.
- **showSeen and showInbound**: showSeen gates the interaction chip. showInbound only picks the
  two-direction form inside it. In the UI, showInbound is indented under showSeen and disabled while
  showSeen is unchecked (its stored value is kept). Same for showHeat under showAge.
- **Empty badge**: if the chips list is empty, remove any existing `.xh-badge` from the post and add
  none. Until now the age chip was always there, so this case did not exist.
- **Pace storage**: a new part `pace: { follows: [t...], unfollows: [t...] }`, written together with
  `days` and `rel` in onFriendship's `store.update(["days", "rel", "pace"], ...)`. On each write, drop
  times older than 24 h and keep the newest 100. 24 h covers any paceMinutes up to 1440; the settings
  field allows 5 to 1440. cleanState validates it (arrays of non-negative numbers, same limits).
  Alternative considered: keep times in memory only. Rejected, because a reload or a second tab would
  reset the count, which is exactly when people follow quickly.
- **Pace check**: after recording, count stored times with `now - t <= paceMinutes * 60000`, including
  the new one. Toast when count > pace. Toast priority in onFriendship: daily limit, then pace, then the
  ordinary toast. With followWarn off, skip both reminder toasts and the HUD colour.
- **HUD**: the follow count is "warn" when followWarn is on and (today's follows > followLimit or the
  follow pace count > followPace). The HUD re-renders on storage changes already; the pace colour can
  clear only on the next render, which is fine for a hint (no timer added).
- **Strings**: `follow_pace` zh "{m} 分钟内已关注超过 {n} 个，关注太快可能被限流", en "Over {n} follows in
  {m} minutes. Following fast can get the account limited." Same for `unfollow_pace`. When m is 60, zh
  says "1 小时内" and en "an hour", so the common case reads naturally.

## Risks / Trade-offs

- [The HUD stays orange a little after the pace window passes, until something re-renders it] → It is a
  hint, and the next follow, like or storage change re-renders it.
- [A user turns the age chip off and loses the "old post" mark they relied on] → It is opt-out and the
  label says the switch covers age, heat and old posts.
- [Moving checkboxes to a new section breaks e2e selectors] → Ids stay the same; only their position
  changes.

## Migration Plan

No migration. New keys are filled from DEFAULTS when read; old exports import through cleanState.
Rollback: an older version ignores the extra settings keys and the `xh:pace` key.
