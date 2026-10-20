# Email signature: install

Files: `signature.<lang>.html` (one per language) and the PNG logos next to them. Built with brand-kit `signature.py`.

## Before you paste (both languages)
1. Upload the logo PNGs (`logo-badge.png`) to a public HTTPS location you control (website, CDN, GitHub Pages).
   Then rebuild with `--asset-base https://<that-folder>/`. Email clients do not send local images, and Gmail drops
   base64 images, so the signature must point at hosted files. This build uses relative paths (preview only).
2. Open `signature.<lang>.html` in Chrome or Safari, select all (Cmd/Ctrl+A), copy.

## Gmail (web)
Settings (gear) > See all settings > General > Signature > Create new > paste > Save changes at the bottom.
Gmail limits signatures to 10,000 characters; this one is well under.

## Outlook
- New Outlook / Outlook on the web: Settings > Accounts > Signatures > New signature > paste > Save.
  Choose it as the default for new messages and replies.
- Classic Outlook for Windows: File > Options > Mail > Signatures > New > paste. (Or save the HTML file as
  `%APPDATA%\Microsoft\Signatures\<name>.htm`.) Classic Outlook ignores rounded corners and some CSS; the table layout holds.

## Apple Mail
Mail > Settings > Signatures > select the account > + > paste. Untick "Always match my default message font"
so the signature keeps its own sizes. Images show once they load from the hosted URL.

## 中文简要说明
1. 先把 logo PNG 上传到公开的 HTTPS 地址，用 `--asset-base` 重新生成；本地路径和 base64 图片在邮件里都不可靠。
2. 用浏览器打开 `signature.zh.html`，全选复制，分别粘贴到：Gmail「设置 > 查看所有设置 > 常规 > 签名」；
   新版 Outlook「设置 > 帐户 > 签名」；Apple Mail「设置 > 签名 > +」（取消勾选「总是匹配我的默认邮件字体」）。

## Dark mode
Clients darken signatures in different ways (Apple Mail and Outlook invert colours, Gmail apps partly invert, some
keep colours). The default logo sits on an opaque white plate (`logo-badge.png`) so it stays readable everywhere;
`--logo tile` uses the gradient app tile instead. Check `preview.<lang>.dark.png`, which imitates an inverting client.
Text uses the brand text colour; links use a brand step that passes 4.5:1 on white and stays legible on dark.
Brand fonts are not loaded in email: the signature asks for Inter and falls back to Helvetica / Arial / PingFang / YaHei.
