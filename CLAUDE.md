# Xhandy（仓库名 x-helper）

给「手动玩 X」的人用的 Chromium 浏览器扩展（Manifest V3，没有构建步骤，仓库根目录就是扩展目录）。功能和路线图见 `README.md`。

对外名称是 Xhandy（2026-10-17 定）。本地文件夹和仓库目前还叫 `x-helper`：文件夹不要随手改名，改了扩展 ID 会变，数据就丢了（见「发版」）。存储键前缀 `xh:` 保持不变。

## 不能破的规矩

1. **永远不替用户操作**：不点击、不输入、不发送、不点赞、不关注、不取关，也不做任何批量动作。只读页面和用户自己的操作，然后显示提示。关注助手只负责找到 X 自己的关注按钮并让它获得焦点，按 Enter 的是用户。e2e 里有「extension never clicks anything by itself」这一项，不能删，也不能绕过。
2. **默认不联网**：不发网络请求，不做统计，不加载远程代码。`page-hook.js` 只克隆 X 自己的 API 响应来读数据，不修改，也不外发。以后加外部功能（webhook、Notion 同步）时，必须由用户自己在设置里打开，联网权限用 `optional_host_permissions` 在打开时再申请，请求从后台 service worker 发，不从内容脚本发。
3. **数据只在本地**：用户数据只存在 `chrome.storage.local`。改了存什么、存在哪，同步改 README 的 Privacy 一节和 `PRIVACY.md`（上架商店用的隐私政策）。
4. **不要像机器人**：每日关注、取关有软上限，只提醒，不拦截；重复回复会提醒。新功能如果会让用户的操作更快、更像批量，要先想清楚会不会触发 X 的风控。

## 代码结构

- `src/page-hook.js`：跑在页面环境（`world: MAIN`），从 X 的 API 响应里读互关关系、浏览量，以及用户自己关注、取关的结果（`friendships/create|destroy.json`，每日关注、取关数就按它统计，不看点的是哪个按钮），通过事件交给内容脚本。事件谁都能发，内容脚本收到后先过 `store.cleanRelations` 校验。纯函数 `collectRelations` / `collectViews` / `collectFriendship` 有单元测试。
- `src/content.js`：内容脚本主体。X 页面的选择器全部放在文件开头的 `SEL` 里，用 `data-testid`。X 经常改页面结构，坏了先查这里。
- `src/lib/store.js`：存储层，见下一节。
- `src/lib/similarity.js`：重复回复的相似度计算。`src/lib/i18n.js`：中英文文案。
- `src/popup/`：工具栏弹窗（近 7 天统计）。`src/options/`：设置页（含导出、导入、清空）。

## 存储

- 每个顶层部分单独一个键：`xh:settings`、`xh:people`、`xh:sent`、`xh:days`、`xh:rel`、`xh:relMeta`。版本号在 `xh:v`（当前是 2）。v1 时全部放在一个 `xh` 键里，`store.js` 第一次读写时会自动迁移。
- 写入用 `store.update([要改的部分], fn)`，只读写声明过的部分。fn 碰到没声明的部分会直接报错，所以加新逻辑时把用到的部分都列上。不要为了省事退回 `store.update(fn)` 全量写：在线计时每 15 秒写一次，`rel` 最多 3 万条，全量写会拖慢 X 页面。
- 改数据结构时：`DEFAULTS` 里加默认值；需要转换老数据就把 `VERSION` 加 1，在 `migrate()` 里写迁移，并在 `test/store.test.js` 里加迁移测试。不能让老用户丢数据。导出文件是完整的状态对象，`replaceAll` 要能导入旧版本导出的文件。
- 数据会越来越多的功能（`rel`、`people`、`sent`、计划中的想法列表）以后要搬进 IndexedDB。IndexedDB 必须在扩展自己的环境里打开（后台 service worker），不能在内容脚本里打开：那样数据库属于 x.com，X 的代码能读到，也能清掉。

## 测试

```sh
npm test                                   # 单元测试（node --test）
CHROMIUM=/usr/bin/chromium npm run e2e     # 在真实 Chromium 里加载扩展，跑假时间线，不碰真实的 X
```

提交前两样都要过。改了 X 页面的选择器，要同步更新 `test/fixtures/` 里的假页面。

## 发版

- 版本号在 `manifest.json`。商店描述在 `_locales/en/messages.json` 和 `_locales/zh_CN/messages.json`，中英文都要有，各不超过 132 字符，来源是 `brand/brand.yaml` 的 `bios.chrome_web_store`。提交信息用 `vX.Y.Z: 改了什么` 的格式。
- 用户界面上的功能有变化时，同步更新 README 的功能列表（英文）和「中文说明」一节。
- 公开仓库是 `jackxlabs/xhandy`（remote `public`），日常开发推 `origin`（私有）。Jack 说可以发布时才推 `public`。
- 发布给用户：`npm run pack` 从 HEAD 打出 `dist/xhandy-<版本>.zip`（只含扩展需要的文件），然后在公开仓库建 Release 并附上这个 zip：`gh release create v<版本> dist/xhandy-<版本>.zip -R jackxlabs/xhandy --notes-file <说明>`。说明用 `scripts/release-notes.sh <版本> "<中文更新>" "<英文更新>"` 从 `docs/release-template.md` 生成：下载页（releases/latest）是分享出去的链接，每个版本的说明都要带完整的安装、更新和使用方法，不能只写改了什么。功能或快捷键变了，同步改模板。README 的安装说明指向 Releases，下载次数从 Release 附件统计。
- 本地以「加载已解压的扩展程序」安装。扩展 ID 由文件夹路径决定，搬目录会换 ID，原来的数据就读不到了。要搬的话先在设置页导出，搬完再导入。
