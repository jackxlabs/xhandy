# Xhandy brand voice and rules

> Generated from brand.yaml v8 (2026-10-20). Edit brand.yaml, then run compile.py.

## Identity
- **short**: 刷 X 时的顺手提示
- **medium**: Xhandy 是刷 X 时的顺手提示：帖子热度、你们的关系和互动记录标在每条帖子旁边，一眼看出该回哪条。
- **long**: Xhandy 是给手动玩 X 的创作者用的浏览器插件。刷 X 时，它把帖子发了多久、每小时多少浏览、你和作者是否互关、互动过几次，直接标在每条帖子旁边，一眼看出该回哪条；打字时还会提醒你别发重复回复。它从不替你点击或发送，数据只存在你的浏览器里，开源免费。
- **category**: stated: X 浏览器插件：给手动玩 X 的人用的提示工具; actual: 纯手动刷 + 靠脑子记；想知道关系只能点进主页或悬浮在头像上看；或者用其他 X 浏览器插件
- **positioning**: 给靠手动互动起号的中文创作者：Xhandy 把帖子热度、你们的关系和互动记录一起标在每条帖子旁边，一眼看出该回哪条。别的插件各管一项，Xhandy 一个全有，而且从不替你操作。

### Audience: zh-creators
- who: 简中蓝 V 创作者：靠手动互动起号、在意浏览和收益的中文 X 用户（主要受众）
- problem: 不知道哪条帖子值得回；和谁互关、互动过几次只能点进主页或悬浮在头像上看，不直观

### Audience: en-engagers
- who: 手动互动的英文 X 用户（第二受众）
- problem: 同上：不知道该回哪条，关系和互动记录要一个个点开才能看到

**Not for**
- 想全自动涨粉的人：要自动关注、自动回复、挂机互动的

**Refuses to be**
- 替用户操作的工具：不点击、不输入、不发送、不点赞、不关注、不取关，也不做批量动作
- 收集数据的工具：默认不联网、不做统计、不加载远程代码，数据只在用户浏览器里
- 让账号看起来像机器人的加速器：关注、取关有软上限提醒，重复回复会提醒

**Naming**
- 对外名称 Xhandy（X 大写，其余小写），不写 XHandy、X-handy、X Handy
- 中文文案里也写 Xhandy，不起中文名
- 仓库和本地文件夹叫 x-helper，只在开发场景出现，对外不用

**Personality**
- 直白: is 标签一眼看懂，例如「2小时 · 1.5万/时」; is not 花哨的数据大屏
- 懂行: is 懂 X 的玩法：超过 48 小时变灰、重复回复会被当成垃圾; is not 爱说教
- 顺手: is 不打扰、快捷键直达、浮层不挡点击; is not 功能堆砌

**Products**
- Xhandy (已上线，v0.4.7，从 GitHub Releases 下载): Chromium 浏览器扩展（Chrome、Edge、Brave），在 X 上显示帖子时效和每小时浏览量、关注关系、互动记忆、重复回复提醒、每日统计；关注助手和「没回关我」面板
- v0.5 (planned): 路线图：互动队列、灵感清单、引用草稿预填、导出和 webhook
- v0.6 (planned): 路线图：可选的 Notion 同步、上架商店

## Proof points (the only facts to cite)
- 从不替你操作 — 不点击、不输入、不发送、不点赞、不关注；关注助手只把焦点放到 X 自己的关注按钮上，按 Enter 的是用户。e2e 测试 extension never clicks anything by itself 和 never fakes mouse or pointer events 保证这一点 [readme]
- 不联网，数据只在你的浏览器里 — 只有 storage 和 unlimitedStorage 两个权限；没有网络请求、统计或远程代码；可导出、导入、清空 [readme]
- 一眼看出哪条帖子正火 — 每小时浏览 1000 以上标橙，1 万以上标红带 🔥；超过 48 小时的帖子变灰 [readme]
- 记得你和每个作者的关系 — 显示互关状态（⇄ 互关 / → 我关注他 / ← 他关注我 / 未关注）和互动次数、最近一次时间 [readme]
- 一个插件全有 — 热度和时效标记、关注关系、互动次数和最近一次时间、重复回复提醒、每日统计、关注助手、没回关我面板，都在同一个插件里 [readme]
- 开源，免费 — 公开仓库 jackxlabs/xhandy，从 GitHub Releases 下载 [readme]
- 中英文界面 — 浏览器语言是中文时显示中文，否则英文 [readme]

## Voice
Xhandy 说话像坐你旁边的朋友：话少，但每句都有用

| axis | 1-5 | note |
|---|---|---|
| formal / casual | 3 | 说明文的清楚，不端着也不玩梗 |
| serious / playful | 2 | 认真为主，偶尔一句轻松话 |
| plain / technical | 2 | 大白话，技术词换成用户看得懂的说法 |
| reserved / bold | 2 | 克制，不夸大效果，局限直接说 |

**直白**
- do: 先给结论和具体数字
- don't: 形容词堆砌、模糊的「提升」「优化」
- before: Xhandy 智能分析帖子热度，助你精准把握流量密码！
- after: 每小时 1 万浏览以上的帖子标红，一眼看出哪条正火。

**懂行**
- do: 用半句话讲清 X 上为什么要这样
- don't: 说教，或者列一长串注意事项
- before: 为了您的账号安全，请务必注意不要频繁关注他人。
- after: 每天关注超过 20 个会提醒你：关注太快容易被限流。

**顺手**
- do: 直接说按哪个键、在哪里找
- don't: 大段功能介绍
- before: 您可以通过使用我们精心设计的快捷键功能来大幅提升效率。
- after: 选中帖子按 Shift+F，焦点会跳到作者的关注按钮上。

### Use / not
| use | not | why |
|---|---|---|
| 帖子 | 推文、推特 | README 和界面统一用帖子；平台已改名 X |
| X | 推特、Twitter | 平台现名 |
| 互关、回关 | 互粉、回粉 | README 和界面用词 |
| 关注、取关 | 加关注、取消关注（界面里可以用全称） | README 用词，简短 |
| 提醒 | 拦截、禁止、限制 | 软上限只提醒不拦截，用错词会让人以为插件会阻止操作 |
| 浏览量 | 曝光量、流量 | 标签显示的就是 X 的浏览数 |

### Never say
- 保证不封号、绝对安全: 太绝对，做不到保证；只能说不替你操作、有软上限提醒
- 智能、AI 分析: Xhandy 没有 AI 功能，所有标记都是规则和 X 自己的数据
- 流量密码、黑科技、神器、赋能: 空洞的营销腔，和直白的个性冲突
- 您: README 和界面都用「你」

Jargon: 技术词（Manifest V3、service worker、data-testid）只出现在开发文档；面向用户时换成「浏览器插件」「X 改了页面」这类说法

### Style
- numbers: 用阿拉伯数字和真实阈值（1000/时、20 个、48 小时），不写「大量」「很多」
- spacing_and_case: 产品文档（README、发版说明、商店页）中英文、数字之间空一格；Jack 个人 X 帖子按他的 x-voice-guide 紧挨着写
- punctuation: 不用感叹号；界面名、按钮名用「」
- emoji: 产品文案不用 emoji；界面标签里只有 🔥（热帖）和 ⇄ → ←（关系）
- emphasis: 加粗只用于警告和关键操作，例如「把它放在一个以后不会动的位置」
- person: 称用户为「你」；Xhandy 用名字自称，不用「我们」
- limits: 能力有边界就直接说，例如「这份列表不完整」「X 可能改了数据，别信这份列表」
- spelling: 中文用简体；产品名、快捷键、X 的界面词保留英文

### Patterns that read as AI (rewrite them)
- 「不是 A，而是 B」「不只是 A，更是 B」这类对比否定 e.g. "Xhandy 不是工具，而是你的互动伙伴" → 直接说它做什么
- 三段排比、对仗工整的句子 e.g. "更快、更准、更安全" → 挑一个，配一个数字
- 结尾升华或金句 e.g. "让每一次互动都有意义" → 停在最后一个事实上
- 书面连接词 e.g. "说白了、本质上、值得注意的是、总的来说" → 删掉

### Channels
- **readme**: format: 说明体：先一句话说是什么，再按功能列，配截图；中英文各一份; tone: 清楚、具体
- **release_notes**: format: 用 docs/release-template.md；本版更新一两句话，写用户能感知的变化; tone: 平实
- **store_listing**: format: 第一行用短版一句话介绍，正文列功能，结尾附与 X Corp 无关的声明; length: 标题 ≤ 45 字符；简短描述 ≤ 132 字符
- **ui**: format: 一行以内，数字在前；出错时说可能的原因和下一步，不怪用户; tone: 提醒，不命令
- **x_post**: format: Jack 个人号提到 Xhandy 时，用他自己的经历讲，按 jack-personal-brand 的 x-voice-guide 写; tone: Jack 的口吻

## Compliance (hard rules block publishing)
- [hard] 说明与 X Corp 无关：不暗示是 X 官方产品或获其认可 Required: "Xhandy is an independent project. It is not affiliated with, endorsed by or sponsored by X Corp.". Forbidden: "X 官方", "X 认证", "official X", "by X", "X-approved". Applies to: store_listing, readme, release_notes, website. Why: 商标和商店审核；logo 也刻意避开 X 官方 logo 的造型 [readme 2026-10-17]
- [hard] 不把 Xhandy 说成自动化或批量工具：不写自动关注、自动回复、一键批量、涨粉神器 Forbidden: "自动关注", "自动回复", "一键批量", "涨粉神器", "auto-follow", "auto-reply", "bulk", "on autopilot". Applies to: all. Why: 产品规矩第 1 条：永远不替用户操作；这类说法也会招来 X 风控和商店审核问题 [dev-rules 2026-10-19]

## Competitors

**X互关雷达** https://chromewebstore.google.com/detail/x-mutual-radar/gheaelnpnfiakildlchjkomnbfccddep
- they say: 在 x.com 页面标记互关和单向关注关系，并可选择显示 following / followers 关注率（商店描述原文）
- our difference: Xhandy 在同一个标签里还给出互动次数和最近一次时间，并配热度标记
- do not echo: 互关雷达, 关注率, mutual radar, 雷达, radar

**X 爆款监测** https://chromewebstore.google.com/detail/x-viral-monitor/dkplofpecmjmbhgjgleeflcnfgfkdfpd
- they say: X 推文流速徽章、长图阅读、Markdown 复制、转发星图、Grok 回复辅助，全部本地处理，零数据收集（商店描述原文）
- our difference: Xhandy 的热度标记和关系、互动记录在同一个标签里；不做 AI 回复辅助，回复全由你自己写
- do not echo: 爆款, 流速徽章, 零数据收集, viral, zero data collection, 爆款监测, 流速, viral monitor

**互关检测 / 粉丝数类小插件（X(Twitter) 互关检测助手、X Following Tracker、Follower Lens、x-follower-count）** https://github.com/yaohongan/x-follower-lens
- they say: 单项工具：识别互关、导出关注列表、在用户名旁显示粉丝数
- our difference: Xhandy 的「没回关我」面板只读、不提供取关按钮，并把关系放进时间线标签
- do not echo: 互关检测, mutual checker

**tendX / SuperX / BlackMagic** https://www.tendx.app/
- they say: 英文工具：记录你发出的点赞、回复、私信，或在主页上叠加双方互动数据；SuperX、BlackMagic 为付费
- our difference: Xhandy 免费开源、不联网，把互动记录直接标在时间线上
- do not echo: interaction history, engagement CRM

**AutoFollowers** https://chromewebstore.google.com/detail/autofollowers/cioeeikbgpoepcgfmpfaajgkaommkbni
- they say: Twitter/X 批量取关与关注，按认证状态、粉丝区间、互关状态筛选
- our difference: 反面对照：Xhandy 从不批量、从不替你操作
- do not echo: 批量关注, 批量取关, bulk follow, mass unfollow, 批量, 一键, bulk, one-click
