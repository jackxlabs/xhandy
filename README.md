# x-helper

Browser helpers for people who engage on X by hand. Working name.

**x-helper never acts for you.** It does not click, type, send, like, follow or schedule anything.
It reads the page and your own actions, shows hints, and keeps all data in your browser.
That is the point: you get faster without anything that looks like a bot to X.

## Features (v0.1)

- **Post badges**: how old each post is (posts older than 48 h are marked, since replying there rarely helps),
  how many times you have interacted with the author and when, and a highlight for accounts you choose.
- **Duplicate-reply warning**: while you type, warns if the reply is very similar to one you sent recently,
  or if you are about to send the same short reply ("great!", "加油") for the third time.
  Repetitive replies are what spam filters look for.
- **Daily stats**: a small bar with today's likes, replies, posts and time on X, plus an optional daily reply goal.
  `Alt+H` hides it. The toolbar popup shows the last 7 days.

X's own shortcuts already cover navigation and actions (`j`/`k`, `l` like, `r` reply, `t` repost, `?` for the list),
so x-helper does not replace them.

## Install (unpacked)

1. Download or clone this repository.
2. Open `chrome://extensions` (Chrome, Chromium, Edge, Brave), turn on **Developer mode**.
3. Click **Load unpacked** and choose this folder.
4. Open x.com. Settings are under the extension's **Options**.

## Privacy

- Only permission: `storage`. The content script runs on `x.com` and `twitter.com` only.
- No network requests, no analytics, no remote code.
- Export, import or delete everything from the Options page.

## Roadmap

- v0.2: interaction queue (open the next post to reply to with a shortcut), save posts to a local idea list,
  draft prefill for quote posts (you still press send), export and a generic webhook.
- v0.3: optional Notion sync, Chinese/English UI polish, store listing.

## Development

```sh
npm install
npm test                                   # unit tests
CHROMIUM=/usr/bin/chromium npm run e2e     # loads the extension against a fake timeline, never touches real X
```

X changes its markup often. Selectors live at the top of `src/content.js` (`SEL`), based on `data-testid` attributes.

## 中文说明

x-helper 是给“手动玩 X”的人用的浏览器插件：标出帖子发了多久、你和作者互动过几次，打字时提醒“这条回复和你刚发过的很像”，统计今天的点赞、回复、发帖数和在线时长。

它**不会替你做任何操作**：不点击、不输入、不发送、不点赞、不关注。只读取页面和你自己的操作，数据只存在你的浏览器里。

## License

MIT
