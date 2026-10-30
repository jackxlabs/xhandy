# Tasks

## 1. Shared Pieces

- [x] 1.1 Add `src/lib/icons.js` with `XH.icon(name, size)` building `<svg>` via `createElementNS` (star, flame, note, warn, gear, close, search, lock, chevron; `stroke="currentColor"`, `aria-hidden="true"`, no `innerHTML`); load it before `content.js` in `manifest.json` and before the page scripts in `popup.html` and `options.html`; add a unit test that each name returns an `svg` element with at least one path or shape (a minimal DOM stub is enough); verify with `npm test`.
- [x] 1.2 Add `hudRight` / `hudBottom` (default 16) to `DEFAULTS.settings` in `src/lib/store.js`; test that old settings and an old export without them load with 16 / 16 and that non-numbers fall back to 16; verify with `npm test`.
- [x] 1.3 Move the Not following back filter and the quiet key accounts computation into pure `store.notFollowingBack(rel, meHandle)` and `store.quietKeys(keys, people, quietDays, now)`; make `renderNfbPanel` and `renderKeysPanel` call them; unit-test both (own handle excluded, invalid handles dropped, never-interacted counts as quiet); verify with `npm test` and the existing panel e2e steps.

## 2. On-Page Look (content.css / content.js)

- [x] 2.1 Replace the colour block in `src/content.css` with the role tokens from design decision 1 for light, dim and dark; remove `--xh-edge`, `--xh-frame`, `--xh-glow`, `--xh-mono` and the gradient `::before` rules; numbers use `inherit` font with `tabular-nums`; verify with the e2e suite and the SHOTS screenshots in light and dark.
- [x] 2.2 Chips: neutral grey by default, green mutual, orange warm/hot, violet replied; the heat chip drops "🔥 " from its text and gets the flame icon when hot; update the e2e heat chip check (currently `/^🔥 15K\/h/`) to check the text "15K/h" and the presence of the icon; verify with e2e.
- [x] 2.3 Star button uses the star icon (outline / filled through `aria-pressed`), keeps its label and click handling; note chip uses the note icon for text-only notes; profile buttons "高赞帖" / "备注" get the flame / note icons and lose the emoji in `src/locales/*.js`; verify with the existing key-accounts, top-posts and notes e2e steps.
- [x] 2.4 Toasts: neutral card, border and shadow, icon in the meaning colour before the title, no side bar; verify with the duplicate-reply and follow e2e steps and a SHOTS screenshot.
- [x] 2.5 Panels: count badge in the title, close icon, rounded search with search icon, initial-letter avatars coloured by a hash of the handle, one-line name + handle with ellipsis, recent unfollows on a tinted row, footer progress bar for today's unfollows vs the limit; add an e2e step with a 50-character display name checking the panel width is unchanged and the row's name line does not wrap; verify with e2e.

## 3. Stats Bar

- [ ] 3.1 Position the stats bar with `right` / `bottom` from `hudRight` / `hudBottom`, clamped inside the window on render and on `resize` without writing the clamped value; restyle it as one rounded pill with number + label pairs; verify with an e2e step that the default bar's box is in the bottom-right corner and does not overlap the composer fixture.
- [ ] 3.2 Drag: primary-button `pointerdown` on the bar, pointer capture, 4 px threshold, write the position once on `pointerup`; a click without movement does nothing; add e2e steps (drag with Playwright's real mouse moves, check the new position, reload and check it is kept, check a short click does not move it); keep "extension never clicks anything by itself" and "never fakes mouse or pointer events" passing unchanged; verify with e2e.
- [ ] 3.3 Other tabs follow a new position through `storage.onChanged`; add an e2e step with two pages; verify with e2e.

## 4. Toolbar Popup

- [ ] 4.1 Rebuild `src/popup/popup.html` / `popup.js`: header with icon and settings button, today card (date + five numbers), 7-day replies bars with day labels, total and average, entry rows with counts from task 1.3 and `Alt K` / `Alt U` key labels, entries hidden when their feature is off, privacy line; keep the "open x.com first" message; strings in both locales; verify with the "popup follows the chosen language" e2e step updated for the new layout plus a new step that checks today's numbers and the Not following back count against seeded storage.

## 5. Settings Page

- [ ] 5.1 Restructure `src/options/options.html` into a section nav (General, Post marks, Follow & unfollow, Duplicate replies, Key accounts, Notes, Data) with one visible section, switches placed per the `feature-settings` delta, units next to numbers, an "Advanced" `<details>` per section holding the fields listed in the `settings-page` spec, the stats bar "Reset position" action in General, and a layout that stacks the nav above the content below 700 px; verify with an e2e step that switches sections and a SHOTS screenshot at 1280 and 500 px.
- [ ] 5.2 Autosave in `src/options/options.js`: `saveSetting(key, value)` with the per-key range table, switches and selects on `change`, numbers on `change` and 600 ms after typing stops, "Saved" indicator, invalid input marked with `aria-invalid` and not saved; remove the Save button; replace the e2e `#save` click with autosave and add steps for an out-of-range value (pace 2 → 5) and an empty field (stored value kept); verify with e2e.
- [ ] 5.3 Reset position writes 16 / 16 and an open x.com tab moves the bar back without a reload; verify with an e2e step.

## 6. Docs and Final Check

- [ ] 6.1 Update README feature list and 中文说明 (stats bar dragging, popup, settings autosave), README Privacy and `PRIVACY.md` (stats bar position stored locally); verify by reading the diff.
- [ ] 6.2 Manual check on real X (Mac and Linux, light and dark): badges, stats bar default position against X's chat drawer (adjust the default if it overlaps, per design risks), dragging, panels with long names, popup, settings; record the result in the review report.
- [ ] 6.3 Retake `docs/relations-zh.png` and `docs/heat-zh.png` on real X after 6.2; verify the README images show the new look.

## Workflow follow-up

- Store screenshots (1280×800) are taken after this change is merged and checked on real X.
- Archive the change with `/opsx:archive` after merge.
