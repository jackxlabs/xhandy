## Why

With the shorter chips from compact-badges, the badge usually fits next to the author's name, also on a post's
own page. Jack prefers it there: forcing the focal post's badge onto its own row moves it away from the name for
no reason when it fits.

## What Changes

- The focal post on a status page follows the normal rule: the badge stays in the name row and moves above the
  text only when it does not fit.

Out of scope: chip texts and the "doesn't fit" fallback, which stay as they are.

## Capabilities

### Modified Capabilities
- `badge-layout`: remove the focal-post requirement.

## Impact

`src/content.js` (focalStatusId removed), `test/e2e.mjs`, README (en and zh). Display only; no data, network or
storage change.
