# x-helper

Browser helpers for people who engage on X by hand. Working name.

**x-helper never acts for you.** It does not click, type, send, like, follow or schedule anything.
It reads the page and your own actions, shows hints, and keeps all data in your browser.
That is the point: you get faster without anything that looks like a bot to X.

## Features (v0.4)

- **Post badges**: how old each post is (posts older than 48 h are greyed out, since replying there rarely helps),
  how many times you have interacted with the author and when, and a highlight for accounts you choose.
- **Post heat**: the age badge also shows views per hour since posting (`2h · 15K/h`) and turns orange
  from 1,000/h and red with 🔥 from 10,000/h, so you can see at a glance which posts are worth joining.
  The view count is the one X already sent with the post; posts under 30 minutes old count as 30 minutes
  so a few early views don't look like a spike. Thresholds are in Options.
- **Follow relationship**: each post shows whether you and the author follow each other
  (⇄ mutual, → you follow, ← follows you, not following). It is read from the data X already sends
  to your browser while you scroll; x-helper makes no extra requests. Display only: it never follows or
  unfollows anyone.
- **Not following you back** (`Alt+U`, or the button in the toolbar popup): a panel on the right listing
  accounts you follow that don't follow you, with search. Built from the same data; for the full list, open your
  own Following page and scroll to the bottom once. Read-only on purpose: each row only links to the profile,
  there is no unfollow button and no bulk action. Unfollows you make by hand on X are counted, with a reminder
  above a soft daily limit (default 20). If none of the accounts you follow shows as following you back,
  the panel warns that X may have changed its data instead of showing a misleading list.
- **Follow assistant** (`Shift+F` on a post selected with `j`/`k`): finds the author's own Follow button
  (already on the page, e.g. in a hover card you opened by pointing at the author, or else on the author's
  profile) and focuses it. You press `Enter` to follow or `Esc` to cancel (`Alt+←` returns from the profile);
  x-helper never clicks it and never fakes mouse events.
  Counts follows per day and reminds you above a soft daily limit (default 20), because following fast is
  what gets accounts limited. Follows and unfollows are counted when X confirms them, so every way of
  following counts (Follow buttons, a post's ⋯ menu, ...) and failed ones don't.
- **Duplicate-reply warning**: while you type, warns if the reply is very similar to one you sent recently,
  or if you are about to send the same short reply ("great!", "加油") for the third time.
  Repetitive replies are what spam filters look for.
- **Daily stats**: a small bar with today's likes, replies, posts and time on X, plus an optional daily reply goal.
  `Alt+H` hides it, and it fades while you scroll. The toolbar popup shows the last 7 days.
- **Looks at home on X**: post badges use X's own colours and follow its Default, Dim and Lights out themes.
  x-helper's own surfaces (stats bar, panel, toasts, popup) share one look: X's shapes with a cyan-violet-pink
  top edge and monospace numbers, and a progress bar for the daily reply goal. Overlays ignore the mouse
  (`pointer-events: none`), so they never block a click on X.

X's own shortcuts already cover navigation and actions (`j`/`k`, `l` like, `r` reply, `t` repost, `?` for the list),
so x-helper does not replace them.

## Install (unpacked)

1. Download or clone this repository.
2. Open `chrome://extensions` (Chrome, Chromium, Edge, Brave), turn on **Developer mode**.
3. Click **Load unpacked** and choose this folder.
4. Open x.com. Settings are under the extension's **Options**.

## Privacy

- Permissions: `storage` and `unlimitedStorage` (so a long follow list never hits Chrome's 10 MB cap).
  Scripts run on `x.com` and `twitter.com` only.
- Stored in this browser only: your settings, daily counts, per-author like/reply counts, follow relationships,
  and the text of your last 300 replies and posts (used for the duplicate-reply warning).
- `src/page-hook.js` runs in the page so it can read X's own API responses (follow relationships,
  view counts, and X's answers to your own follows and unfollows). It clones responses and never changes or
  sends anything.
- No network requests, no analytics, no remote code.
- Export, import or delete everything from the Options page.

## Roadmap

- v0.5: interaction queue (open the next post to reply to with a shortcut), save posts to a local idea list,
  draft prefill for quote posts (you still press send), export and a generic webhook.
- v0.6: optional Notion sync, Chinese/English UI polish, store listing.

## Development

```sh
npm install
npm test                                   # unit tests
CHROMIUM=/usr/bin/chromium npm run e2e     # loads the extension against a fake timeline, never touches real X
```

X changes its markup often. Selectors live at the top of `src/content.js` (`SEL`), based on `data-testid` attributes.

## 中文说明

x-helper 是给“手动玩 X”的人用的浏览器插件：标出帖子发了多久和每小时浏览量（每小时 1000 以上标橙，1 万以上标红 🔥，一眼看出哪条正火、值得跟进）、你和作者是否互关、互动过几次，选中帖子按 Shift+F 选中作者的「关注」按钮（页面上有就直接选中，比如你自己把鼠标移到作者头像上弹出的资料卡；没有就跳到作者主页再选中。你按 Enter 才会关注，插件不模拟鼠标），按 Alt+U 在右侧列出「我关注了、但没回关我」的账号（只读，没有取关按钮，取关要自己去对方主页点，超过每日软上限会提醒），打字时提醒“这条回复和你刚发过的很像”，统计今天的点赞、回复、发帖、关注、取关数和在线时长（关注和取关以 X 确认成功为准，从关注按钮、帖子「⋯」菜单等任何入口操作都算）。

它**不会替你做任何操作**：不点击、不输入、不发送、不点赞、不关注。只读取页面和你自己的操作，数据只存在你的浏览器里。

## License

MIT
