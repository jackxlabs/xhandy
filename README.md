# x-helper

Browser helpers for people who engage on X by hand. Working name.

**x-helper never acts for you.** It does not click, type, send, like, follow or schedule anything.
It reads the page and your own actions, shows hints, and keeps all data in your browser.
That is the point: you get faster without anything that looks like a bot to X.

## Features (v0.3)

- **Post badges**: how old each post is (posts older than 48 h are marked, since replying there rarely helps),
  how many times you have interacted with the author and when, and a highlight for accounts you choose.
- **Follow relationship**: each post shows whether you and the author follow each other
  (⇄ mutual, → you follow, ← follows you, not following). It is read from the data X already sends
  to your browser while you scroll; x-helper makes no extra requests. Display only: it never follows or
  unfollows anyone, and it has no bulk-unfollow list on purpose.
- **Follow assistant** (`Shift+F` on a post selected with `j`/`k`): finds the author's own Follow button
  (already on the page, in X's hover card, or else on the author's profile) and focuses it. You press `Enter`
  to follow or `Esc` to cancel (`Alt+←` returns from the profile); x-helper never clicks it.
  Counts follows per day and reminds you above a soft daily limit (default 20), because following fast is
  what gets accounts limited.
- **Duplicate-reply warning**: while you type, warns if the reply is very similar to one you sent recently,
  or if you are about to send the same short reply ("great!", "加油") for the third time.
  Repetitive replies are what spam filters look for.
- **Daily stats**: a small bar with today's likes, replies, posts and time on X, plus an optional daily reply goal.
  `Alt+H` hides it, and it fades while you scroll. The toolbar popup shows the last 7 days.
- **Looks native**: colours follow X's Default, Dim and Lights out themes. Overlays ignore the mouse
  (`pointer-events: none`), so they never block a click on X.

X's own shortcuts already cover navigation and actions (`j`/`k`, `l` like, `r` reply, `t` repost, `?` for the list),
so x-helper does not replace them.

## Install (unpacked)

1. Download or clone this repository.
2. Open `chrome://extensions` (Chrome, Chromium, Edge, Brave), turn on **Developer mode**.
3. Click **Load unpacked** and choose this folder.
4. Open x.com. Settings are under the extension's **Options**.

## Privacy

- Only permission: `storage`. Scripts run on `x.com` and `twitter.com` only.
- `src/page-hook.js` runs in the page so it can read X's own API responses (follow relationships).
  It clones responses and never changes or sends anything.
- No network requests, no analytics, no remote code.
- Export, import or delete everything from the Options page.

## Roadmap

- v0.4: interaction queue (open the next post to reply to with a shortcut), save posts to a local idea list,
  draft prefill for quote posts (you still press send), export and a generic webhook.
- v0.5: optional Notion sync, Chinese/English UI polish, store listing.

## Development

```sh
npm install
npm test                                   # unit tests
CHROMIUM=/usr/bin/chromium npm run e2e     # loads the extension against a fake timeline, never touches real X
```

X changes its markup often. Selectors live at the top of `src/content.js` (`SEL`), based on `data-testid` attributes.

## 中文说明

x-helper 是给“手动玩 X”的人用的浏览器插件：标出帖子发了多久、你和作者是否互关、互动过几次，选中帖子按 Shift+F 弹出作者资料卡并选中「关注」（你按 Enter 才会关注），打字时提醒“这条回复和你刚发过的很像”，统计今天的点赞、回复、发帖数和在线时长。

它**不会替你做任何操作**：不点击、不输入、不发送、不点赞、不关注。只读取页面和你自己的操作，数据只存在你的浏览器里。

## License

MIT
