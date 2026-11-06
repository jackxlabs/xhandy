# Chrome Web Store listing

Text to paste into the developer dashboard. Checked against Chrome's docs on 2026-11-04:
[listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing),
[privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy),
[images](https://developer.chrome.com/docs/webstore/images),
[user data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).
Upload `dist/xhandy-<version>-store.zip`. The short description comes from `_locales/`.

## Store listing tab

- **Category:** Social Networking (or the nearest one the dashboard offers).
- **Languages:** English and Chinese (Simplified), each with its own description below.
- **Homepage URL:** https://github.com/jackxlabs/xhandy
- **Support URL:** https://github.com/jackxlabs/xhandy/issues
- **Small promo tile:** `docs/store/promo-tile-440x280.png`
- **Screenshots:** see "Screenshots" below.

### Detailed description (English)

```
Xhandy shows quiet hints while you use X by hand, so you can see which posts are worth a reply and who you already know.

Xhandy never acts for you. It does not click, type, send, like, follow or schedule anything. It reads the X pages you open and your own actions on them, and shows hints.

NEXT TO EVERY POST
• Post heat: views per hour, orange and red when a post is taking off, grey when it is old
• Follow status: mutual, you follow, or follows you
• Interaction history: how often you and the author have interacted, in both directions
• Interaction tint: a light background on posts by people you talk with often
• Reply signals: how many replies a post already has, and how much bigger the author is than you
• A mark on posts you already replied to

WHILE YOU WRITE
• A warning when a reply is very similar to one you sent recently

KEEPING TRACK
• Key accounts: star the people you care about and see who has gone quiet
• Private notes, statuses and tags for any account
• Not following you back: a read-only list, with mutuals who recently stopped following you on top. It has no unfollow button and no bulk action
• Daily stats: today's likes, replies, posts, follows, unfollows and time on X
• Reminders when you follow or unfollow too fast or pass a daily limit you set. They only remind, they never block

SHORTCUTS
• Top posts (Alt+B): opens X's own search for an account's best-received posts
• Follow assistant (Shift+F): moves focus to the author's own Follow button. You press Enter

YOUR DATA
Everything stays in your browser. Xhandy has no server, no analytics and no remote code, and it makes no network requests of its own. It reads the data X already sends to your browser. You can export or delete everything from the settings page, and every feature has its own switch.

Xhandy is open source (MIT): https://github.com/jackxlabs/xhandy

Xhandy is an independent project. It is not affiliated with, endorsed by or sponsored by X Corp.
```

### Detailed description (中文)

```
Xhandy 在你手动刷 X 时给出顺手的提示：哪条帖子值得回，哪个作者你已经认识，一眼就能看到。

Xhandy 从不替你操作：不点击、不输入、不发送、不点赞、不关注，也不定时发布。它只读取你打开的 X 页面和你自己的操作，然后显示提示。

每条帖子旁边
• 帖子热度：每小时浏览量，正在起量时标橙、标红，旧帖变灰
• 关注关系：互关、我关注或关注我
• 互动记录：你和作者双方各互动过几次
• 互动底色：经常来回互动的作者，帖子带一层淡色底
• 回复信号：帖子已有多少回复，作者的粉丝是你的几倍
• 已回复标记：标出你回复过的帖子

写回复时
• 回复和你最近发过的很像时提醒你

帮你记着
• 重点账号：给在意的人加星标，看看谁好久没互动了
• 账号备注：给任何账号记私密备注、状态和标签
• 没回关我：只读列表，最近取关你的互关好友排在最上面。没有取关按钮，也没有批量操作
• 今日统计：今天的点赞、回复、发帖、关注、取关数和在线时长
• 节奏提醒：关注、取关太快或超过你设的每日上限时提醒，只提醒，不拦截

快捷操作
• 高赞帖（Alt+B）：打开 X 自带的搜索，查看某个账号反响最好的帖子
• 关注助手（Shift+F）：把焦点移到作者本人的「关注」按钮上，按 Enter 的是你

你的数据
所有数据只存在你的浏览器里。Xhandy 没有服务器，不做统计，不加载远程代码，自己也不发任何网络请求，只读取 X 本来就发给浏览器的数据。设置页可以导出或删除全部数据，每个功能都有单独的开关。

Xhandy 开源（MIT）：https://github.com/jackxlabs/xhandy

Xhandy 是独立项目，与 X Corp. 没有任何关联，也未获其认可或赞助。
```

## Privacy practices tab

### Single purpose

```
Show hints next to posts and in small panels while the user reads and replies on X by hand, based on the X pages the user opens and the user's own actions, so the user can decide where to engage. The extension never acts on X for the user.
```

### Permission justifications

`storage`:

```
Keeps the user's settings, daily counts, follow relationships, interaction counts, key accounts, notes and recent reply text in chrome.storage.local on the user's device. Nothing is synced or sent anywhere.
```

`unlimitedStorage`:

```
A long follow list (up to 30,000 accounts) plus notes and recent replies can exceed the default 10 MB limit. Without this permission, saving would fail for users who follow many accounts. Data stays on the device.
```

Host access (content scripts on `https://x.com/*` and `https://twitter.com/*`):

```
Every feature works on X's pages: the extension adds hints next to posts and reads the user's own actions there. A script in the page world clones X's own API responses to read follow relationships, view counts and the results of the user's own actions. It never changes a response, never sends a request of its own and sends nothing anywhere. The extension runs on no other site.
```

### Remote code

"No, I am not using remote code."

### Data usage

Chrome requires disclosure even when data stays on the device (user data FAQ 3), so tick these three:

| Category | Tick | What Xhandy handles, on the device only |
|---|---|---|
| Personally identifiable information | Yes | Handles, display names and user IDs of accounts X shows; the user's own handle and ID |
| User activity | Yes | The user's clicks on like, reply, send and follow, keyboard shortcuts, text typed in the reply box (for the duplicate warning) |
| Website content | Yes | The user's last 300 replies and posts, view and reply counts, post IDs |
| Health, financial, authentication, location | No | Not handled |
| Personal communications | No | Direct messages are not read or stored. API responses are only searched for account objects and post data |
| Web history | No | Visited pages are not recorded. Time on X is a single daily number |

Tick all three certifications: data is not sold to third parties, not used for purposes unrelated to the single purpose, and not used for creditworthiness or lending.

### Privacy policy URL

https://github.com/jackxlabs/xhandy/blob/main/PRIVACY.md

## Test instructions tab (for the reviewer)

Leave the username and password empty. The notes field holds 500 characters.

```
No test account: works with any X account, nothing of its own. Sign in to x.com, open Home: posts show chips by the author's name, stats bar bottom-right. Alt+U: not-following-back panel. Alt+K: key accounts. Select a post with j/k, press Shift+F: focus moves to Follow; the extension never clicks. Toolbar icon: popup. Options: switches, export, import, delete. src/page-hook.js (MAIN world) only reads clones of X's API responses; it changes nothing and makes no requests.
```

## Screenshots

1280×800, up to 5, square corners, no padding. Taken on real X, then blurred and cropped:

1. Timeline with heat, relationship and interaction chips, including a hot post.
2. Not following you back panel (`Alt+U`) with the stats bar visible.
3. Key accounts panel (`Alt+K`), and a starred account's post with its blue edge.
4. Note editor (`Alt+N`) on a profile, with a status chip.
5. Toolbar popup with the 7-day chart, or the duplicate-reply warning.

Other people's avatars, names and handles are blurred unless they agreed to appear.
