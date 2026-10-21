# Proposal

## Why

Several Xhandy features can only be tuned, not switched off: the age chip, the "interacted N times" chip,
the duplicate-reply warning and the follow and unfollow reminders. The switches that do exist are spread
across sections of the settings page. Separately, the follow reminder only looks at the daily total, but
what tends to get an account limited is following many accounts in a short time. Both need to be in
place before the store listing, since the listing describes the settings.

## What Changes

- A "Features / 功能开关" section at the top of the settings page that holds every on/off switch, with
  dependent switches (heat colour, interactions from others) shown as sub-options of their parent.
- New switches: post age chip, interaction chip, duplicate-reply warning, follow and unfollow reminders.
  All default to on, so nothing changes for existing users until they switch something off.
- A pace reminder for follows and for unfollows: when more than N happen within M minutes (defaults 10
  in 60 minutes), the same orange count and toast as the daily limit appear. The daily limit stays.
- The reminders keep their current display (orange HUD count, a toast on each follow past a limit). They
  only remind and never block.

Out of scope:
- Duplicate-reply false positives: fixed by fix-duplicate-reply-records (confirmed sends only, tripled
  text cleaned up). No further change here.
- Changing the reminder display, default daily limits, or the follow assistant.
- Settings sync between devices (planned separately, network features are opt-in).

How the rules are kept:
- Never acting for the user: reminders stay hints; nothing is clicked, sent, followed or blocked.
- Network: no requests are added.
- Storage: new settings get defaults in DEFAULTS; follow and unfollow times are stored locally in a new,
  bounded part. README Privacy and PRIVACY.md are updated for it.

## Capabilities

### New Capabilities
- `feature-settings`: which features can be switched on and off, where the switches live, and what each
  switch hides.
- `follow-reminders`: daily-total and pace reminders for the user's own follows and unfollows.

### Modified Capabilities

## Impact

- `src/lib/store.js`: new settings (showAge, showSeen, dupWarn, followWarn, followPace, unfollowPace,
  paceMinutes) and a new part `pace` with validation in cleanState.
- `src/content.js`: annotate() honours showAge and showSeen; checkDup() honours dupWarn; onFriendship()
  and the HUD use the pace check and followWarn.
- `src/lib/i18n.js`: pace toast strings in Chinese and English.
- `src/options/options.html`, `options.js`: the switches section and the pace fields.
- Tests: `test/store.test.js`, `test/e2e.mjs`. Docs: README (en, zh), PRIVACY.md.
