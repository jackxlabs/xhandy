> **下载：** 点下面 Assets 里的 `xhandy-{{version}}.zip`（不是 Source code）。English below.

## 本版更新

{{changes_zh}}

## 安装（第一次用）

1. 下载下面的 `xhandy-{{version}}.zip` 并解压，得到一个 `xhandy` 文件夹。**把它放在一个以后不会动的位置**（比如「文档」里），浏览器每次都从这里加载。
2. 在 Chrome、Edge 或 Brave 的地址栏打开 `chrome://extensions`，打开右上角的**开发者模式**。
3. 点**加载已解压的扩展程序**，选择 `xhandy` 文件夹（里面有 `manifest.json` 的那一层）。
4. 打开 x.com 刷新一下，底部出现一条统计栏就说明装好了。建议把 Xhandy 固定到工具栏。

## 更新（已经装过）

下载新的 zip，解压后**覆盖原来的 `xhandy` 文件夹**，再到 `chrome://extensions` 点 Xhandy 的 ⟳ 重新加载。不要换文件夹位置：换了位置，原来的数据就读不到了。

## 怎么用

装好后正常刷 X 就行，每条帖子旁边会多几个标签：

![热帖标记](https://github.com/jackxlabs/xhandy/raw/main/docs/heat-zh.png)

- `2小时 · 1.5万/时`：发了多久、每小时浏览量。1000/时以上变橙，1 万以上变红带 🔥
- `⇄ 互关` / `→ 我关注他` / `← 他关注我` / `未关注`：你和作者的关注关系
- `互动3次 · 今天`：你和这个作者互动过几次；对方也和你互动过时显示 `我3 · 他5 · 今天`
- `💬 23 · 46K · 12×`：已有多少回复、作者多少粉丝，作者比你大 2 倍以上时显示是你的几倍
- `✓ 已回复`：你已经回复过这条
- `☆`：点一下把作者设为重点账号，变成实心 `★`，帖子有蓝色边线；再点一次取消
- 写回复时和你发过的很像，会提醒；底部统计栏显示今天的赞、回复、发帖、关注和在线时长

![关注关系、互动次数、「没回关我」列表和今日统计（其他用户的信息已打码）](https://github.com/jackxlabs/xhandy/raw/main/docs/relations-zh.png)

| 按键 | 作用 |
|---|---|
| `j` / `k` | X 自带：选中下一条 / 上一条帖子 |
| `Shift+F` | 选中帖子作者的「关注」按钮，按 `Enter` 关注、`Esc` 取消（插件自己不会点） |
| `Alt+S` | 将选中帖子的作者设为或取消重点账号（也可以直接点帖子上的 ☆） |
| `Alt+K` | 打开「重点账号」面板，最久没互动的排在前面，标出沉寂账号 |
| `Alt+U` | 打开「我关注了、没回关我」列表 |
| `Alt+H` | 隐藏或显示底部统计栏 |

Mac 上 `Alt` 是 `Option` 键。完整说明见 [README 的中文说明](https://github.com/jackxlabs/xhandy#中文说明)。

Xhandy 不会替你点击、输入、发送或关注任何东西，数据只存在你自己的浏览器里，不联网。

## 反馈

有想法、遇到问题，直接在 X 上私信 [@JackHuang47](https://x.com/JackHuang47)，最好附一张截图。

---

## English

**Download** `xhandy-{{version}}.zip` from Assets below (not "Source code").

**What's new:** {{changes_en}}

**Install:** unzip it somewhere it can stay, open `chrome://extensions` (Chrome, Edge, Brave), turn on **Developer mode**, click **Load unpacked** and choose the `xhandy` folder.
**Update:** unzip the new version over the same folder and click reload on Xhandy. Don't move the folder: your data is tied to its path.

**Use:** posts get badges for age and views per hour (🔥 when hot), your follow relationship with the author, how often you've interacted (both ways, `you 3 · them 5`), the reply count and author size (`💬 23 · 46K · 12×`), and `✓ replied` on posts you already answered. Click `☆` to make the author a key account (`★`, click again to remove); `Alt+K` shows which key accounts have gone quiet. `Shift+F` focuses the author's Follow button (you press Enter), `Alt+U` lists accounts that don't follow you back, `Alt+H` hides the stats bar. Full guide in the [README](https://github.com/jackxlabs/xhandy#readme).

Xhandy never clicks, types, sends or follows for you, and all data stays in your browser.
Feedback: DM [@JackHuang47](https://x.com/JackHuang47) on X.
