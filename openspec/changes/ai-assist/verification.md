# Verification receipt — AI assistance 0.8.0

- 改了什么：新增默认关闭的自带密钥 AI 草稿与改写、服务商与语言/语气设置、后台请求、独立密钥键；用户点候选才填入，发送仍手动。版本 0.8.0，无提交、推送、打包或发布。
- 完成条件：
  1. 提示词、七种服务商请求适配、三候选解析、地址验证、样例匹配 → `npm test` → 通过（Node 26 汇总 11 个文件通过，0 失败）。
  2. 后台权限/来源验证、HTTP 错误与密钥不回显、单请求限制、超时/取消、导出/导入/清空密钥 → 同上；逐文件 `node test/<name>.test.js` → 合计 154 用例通过，0 失败（新增 13 个）。日志 `/tmp/a1-unit-individual-final.log`。
  3. OpenSpec → `openspec validate ai-assist --strict` → 通过。
  4. JS 语法、差异空白 → `node --check`（新增 JS、e2e 脚本）和 `git diff --check` → 通过。
  5. AI e2e 已写入 `test/ai-e2e.mjs`，由原 `test/e2e.mjs` 调用，使用真实本地 HTTP 假服务商；覆盖授权、连接测试、候选未选不填、原生输入、Alt+G、Esc、过期候选保护、四种改写、重复提醒、HTTP 错误与禁用。原有 “extension never clicks anything by itself” 和鼠标事件检查保留未改。
- 没验证的：
  - `CHROMIUM=/usr/bin/chromium npm run e2e` 已尝试，Chromium 在启动时因沙箱 `setsockopt: Operation not permitted` / SIGTRAP 退出，0 个 e2e 步骤实际运行。日志 `/tmp/a1-e2e-final.log`。请在本机重跑完整命令，尤其确认 headless Chromium 的 optional host permission 授权行为。
  - 真实 X 的 React 编辑器对 insertText、撤销、模态回复/详情页/发帖框兼容性，以及三种主题的真实视觉检查，需人工验收。
  - 七家真实服务商连通性、账号模型可用性/额度未测；没有使用真实密钥发请求。
  - 独立审查未完成，见下。
- 高风险路径：`manifest.json`（可选域名权限与 worker）；`src/background.js`（密钥读取、网络、来源与输入检查）；`src/options/ai-options.js`（授权和密钥保存）；`src/lib/store.js`（导入关闭 AI、清空删除独立密钥）。无旧数据转换，版本 5 保持兼容，新设置由默认值补齐。
- 捷径：`src/lib/ai.js` 的 `count` 为 X 字数近似值（汉字 2），不做完整 URL/组合 emoji 归一；UI 明示“约”。若要求精确发布限制，接 twitter-text。
- 独立审查：已运行 `XDG_CACHE_HOME=/tmp/a1-review-cache ~/hq/skills/cross-review/scripts/review.sh --deep --intent ...`（Gemini 4 Neon xhigh）。agy 无法创建本地 socket：`listen tcp 127.0.0.1:0: socket: operation not permitted`，脚本返回 `AGY_NO_OUTPUT`。没有审查报告，没有可核实的必须修条目，不能视为通过。日志 `/tmp/a1-review-cache/hq-review/x-helper/20261124-071025-16/agy.err`；请在本机重跑跨厂商审查。
- 额外诊断：为获得明细曾尝试 `node --test --test-isolation=none --test-reporter=tap test/*.test.js`，153/154 通过；一个旧 relations 用例因不同测试文件共用 `globalThis.XH` 而失败。没有改测试来隐藏结果；恢复项目默认的进程隔离后 `npm test` 全通过，再逐文件独立运行确认 154/154。

## Files

- 新增：`src/lib/ai.js`、`src/lib/ai-composer.js`、`src/background.js`、`src/options/ai-options.js`。
- 接入：`src/content.js`、`src/content.css`、`src/lib/store.js`、`src/options/options.html`、`src/options/options.js`、`src/locales/en.js`、`src/locales/zh.js`、`manifest.json`、`package.json`。
- 测试：新增 `test/ai.test.js`、`test/ai-background.test.js`、`test/ai-e2e.mjs`；修改 `test/store.test.js`、`test/e2e.mjs`、`test/fixtures/timeline.html`。
- 说明：`CLAUDE.md`、`README.md`、`PRIVACY.md`、`docs/release-template.md`、`openspec/config.yaml`、`openspec/changes/ai-assist/`。

## API reference checks

Provider protocol shapes were checked against the official [Gemini generateContent reference](https://ai.google.dev/api/generate-content) and [Anthropic Messages reference](https://platform.claude.com/docs/en/api/messages/create). Anthropic's browser header follows its [authentication documentation](https://platform.claude.com/docs/en/manage-claude/authentication). Live provider requests remain unverified.
