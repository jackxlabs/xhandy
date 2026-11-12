# Tasks

Each task: `npm test` and the e2e suite pass with the same number of steps as before (112 unit tests, 97 e2e steps).

## 1. store.js

- [x] 1.1 One `capOldest(obj, max, timeOf)` behind `capReplied`, `capInSeen`, `capRel`, `capKeys`, `capNotes`; `quietKeys` and `tintLevel` use `num()`.

## 2. content.js

- [x] 2.1 Remove `updateTopPostsButton`; shared target lookup for Alt+B / Alt+N; note limits from `store`; inbound counter helper; memory-map helper; renumber section comments.
- [x] 2.2 One builder for the two profile buttons.
- [x] 2.3 One builder for panel rows.
- [x] 2.4 One helper for the three batched writers.

## 3. options.js and popup.js

- [x] 3.1 One row builder for the key accounts and notes lists; one click handler for the popup's two panel rows.

## 4. Check

- [x] 4.1 Run the code-health signals again and note the FTA of the three files before and after.

Result of 4.1 (2026-11-12, signals at 8ee7a0b plus the working tree): `content.js` FTA 162.8 -> 158.6
(1731 -> 1641 lines counted), `store.js` 107.4 -> 103.9, `options.js` 79.4 -> 78.4. All three stay above 60:
removing copies helps a little, the real drop needs the file split that is out of scope here.
