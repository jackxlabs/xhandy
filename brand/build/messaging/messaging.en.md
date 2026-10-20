# Xhandy Messaging (draft)

> Generated from brand.yaml by messaging.py. Do not edit by hand. brand.yaml v9 (2026-10-20)

## Pitch

### 10s · 31 words

Xhandy is a browser extension that shows post heat, follow status and your interaction history next to every post on X, so you can see which ones are worth a reply.

### 30s · 71 words

Xhandy is a free, open-source browser extension for people who engage on X by hand. Next to every post it shows how old the post is and how fast it is getting views, whether you and the author follow each other, and how often you have interacted. It warns you before you send a near-duplicate reply. It never clicks or sends anything for you, and all data stays in your browser.

### 2min · 267 words

If you grow on X by replying and engaging by hand, the hard part is choosing where to spend your replies. You can't tell at a glance which posts are taking off, and checking whether someone follows you back, or how often you've talked, means opening profiles or hovering over avatars.

Xhandy is a browser extension for Chrome, Edge and Brave that puts those answers next to every post. A small label shows the post's age and views per hour, like "2h · 15K/h": orange from 1,000 views an hour, red from 10,000, grey after 48 hours. Next to it you see whether you follow each other (⇄ mutual, → you follow, ← follows you), how many times you've interacted with the author and when you last did.

While you type, Xhandy warns you if a reply is very similar to one you sent recently, since repeated replies are what spam filters look for. A small bar shows today's likes, replies, posts and time on X. Alt+U opens a read-only list of accounts that don't follow you back, and Shift+F moves focus to an author's Follow button so you can press Enter yourself.

Xhandy never clicks, types, sends, likes or follows for you. It asks for two permissions, storage and unlimitedStorage, makes no network requests, runs no analytics and keeps all data in your browser, where you can export or delete it at any time.

It is free and open source. Version 0.4.7 is on GitHub Releases at github.com/jackxlabs/xhandy. Next on the roadmap: an interaction queue, a local idea list and export, then a store listing.

## Message house

**Roof**: See which posts are worth a reply as you scroll X, while every action stays yours

### At a glance

Heat, relationship and interaction history share one label, right next to the post

- Proof: **See which posts are taking off**: Orange from 1,000 views an hour, red with 🔥 from 10,000; posts older than 48 hours go grey
- Proof: **Remembers where you stand with every author**: Shows follow status (⇄ mutual / → you follow / ← follows you / not following), how often you have interacted and when you last did
- Proof: **All of it in one extension**: Post age and heat, follow status, interaction history, duplicate-reply warnings, daily stats, the follow assistant and the "not following you back" panel

### Never acts for you

No clicks, no sends, no follows; the follow assistant only moves focus to X's own button and you press the key

- Proof: **Never acts for you**: It never clicks, types, sends, likes or follows. The follow assistant only moves focus to X's own Follow button; you press Enter. End-to-end tests ("extension never clicks anything by itself", "never fakes mouse or pointer events") enforce it

### Your data stays with you

No network and no analytics; data lives in your browser, and the code is public for anyone to check

- Proof: **No network, your data stays in your browser**: Only two permissions, storage and unlimitedStorage; no network requests, analytics or remote code; export, import or delete everything
- Proof: **Free and open source**: Public repository jackxlabs/xhandy; download from GitHub Releases

## FAQ

### Users

**Can Xhandy get my account limited?** (draft)

- Short: Xhandy never clicks, sends or follows for you, and it reminds you when follows or unfollows pass a daily soft limit. No tool can promise an account won't be limited.
- Long: Xhandy only reads the page and your own actions. It never clicks, types, sends, likes or follows, and never fakes mouse events; end-to-end tests check this. By default it reminds you after 20 follows or 20 unfollows a day (a reminder only, nothing is blocked), because following fast is what gets accounts limited, and it warns you when a reply is very similar to a recent one. Whether an account gets limited is X's call; Xhandy helps you avoid the most common causes.
- source: `readme` · 2026-10-20

**Does Xhandy collect my data?** (draft)

- Short: No. It makes no network requests, runs no analytics and loads no remote code; your data stays in your browser.
- Long: Xhandy has two permissions, storage and unlimitedStorage, and runs only on x.com and twitter.com. What it keeps in your browser: your settings, daily counts, per-author like and reply counts, follow relationships, and the text of your last 300 replies and posts (for the duplicate-reply warning). You can export, import or delete everything from the Options page. The full privacy policy is PRIVACY.md in the repository.
- source: `readme` · 2026-10-20

**Which browsers does it support, and how do I install it?** (draft)

- Short: Chrome, Edge and Brave. Download the zip from GitHub Releases, unzip it, turn on Developer mode in chrome://extensions and choose Load unpacked.
- Long: Download xhandy-<version>.zip from Releases at github.com/jackxlabs/xhandy and unzip it somewhere it can stay. Open chrome://extensions, turn on Developer mode, click Load unpacked and choose the xhandy folder. To update, unzip the new release over the same folder and click reload. Keep the folder where it is: the extension ID, and with it your data, is tied to the folder's path.
- source: `readme` · 2026-10-20

**Is it free?** (draft)

- Short: Yes. The code is open source under the MIT licence.
- Long: Xhandy is free. The source is at github.com/jackxlabs/xhandy under the MIT licence.
- source: `readme` · 2026-10-20

**Why is the "not following you back" list incomplete?** (draft)

- Short: It only uses data X has already loaded while you scrolled. Open your own Following page, scroll to the bottom once, then press Alt+U.
- Long: Xhandy makes no extra requests; follow data comes from what X already sends to your browser as you scroll. For the full list, open your own Following page and scroll to the bottom once, then press Alt+U. If none of the accounts you follow shows as following you back, the panel warns that X may have changed its data, so don't trust that list.
- source: `readme` · 2026-10-20

**Can it follow or reply automatically?** (draft)

- Short: No, and it won't. Xhandy only shows hints; you take every action yourself.
- Long: Never acting for the user is Xhandy's first rule: it never clicks, types, sends, likes, follows or unfollows, and does nothing in bulk. It is not built for people who want growth on autopilot.
- source: `dev-rules` · 2026-10-20

### Press

**Who makes Xhandy?** (draft)

- Short: Xhandy is an independent project maintained by Jack; feedback goes to @JackHuang47 on X.
- Long: [to fill: maker bio, Jack to confirm]
- source: `readme` · 2026-10-20

**Is Xhandy affiliated with X?** (draft)

- Short: Xhandy is an independent project. It is not affiliated with, endorsed by or sponsored by X Corp.
- Long: Xhandy is an independent project. It is not affiliated with, endorsed by or sponsored by X Corp. Its logo is deliberately built differently from X's.
- source: `readme` · 2026-10-20

**What is the current version, and where do I get it?** (draft)

- Short: Version 0.4.7, from GitHub Releases. A store listing is on the v0.6 roadmap.
- Long: The current version is 0.4.7, downloaded from Releases at github.com/jackxlabs/xhandy and loaded into Chrome, Edge or Brave by hand. Roadmap: v0.5 adds an interaction queue, a local idea list, draft prefill for quote posts, export and a generic webhook; v0.6 adds optional Notion sync and a store listing.
- source: `readme` · 2026-10-20

**How many people use it?** [to fill]

### Partners

**Does Xhandy have an API or integrations?** (draft)

- Short: Not yet: Xhandy makes no network requests. Export and a generic webhook are on the v0.5 roadmap, optional Notion sync on v0.6.
- Long: [to fill: terms and contact for integrations]
- source: `readme` · 2026-10-20

**Can I use the Xhandy name and logo?** (draft)

- Short: The MIT licence covers the code, not the name or logo. When writing about Xhandy, use the files in the brand kit unchanged.
- Long: [to fill: trademark use policy, Jack to confirm]
- source: `readme` · 2026-10-20

**Do you take sponsorships or paid partnerships?** [to fill]

## Platform bios

| Platform / field | Text | Count |
|---|---|---|
| X · name (draft) | Xhandy | 6/50 (third-party) |
| X · bio (draft) | Quiet hints while you use X: post heat, follow status and interaction history next to every post. Never acts for you. Your data stays in your browser. | 150/160 (third-party) |
| GitHub repository · description | Browser helpers for people who engage on X by hand. Never clicks, sends or follows for you; all data stays in your browser. | 123/350 (observed) |
| Chrome Web Store · short description | Hints for engaging on X by hand: post heat, follow status, interaction history and duplicate-reply warnings. Data stays local. | 126/132 (verified) |
| Chrome Web Store · Live today | Hints for engaging on X by hand: post heat, follow status, interaction history and duplicate-reply warnings. Data stays local. | 126/132 (`x-helper/manifest.json`, 2026-10-20) |
| GitHub organisation | [to fill] | |
| LinkedIn | [to fill] | |
| YouTube | [to fill] | |
| Instagram | [to fill] | |
| Xiaohongshu | [to fill] | |

## Press boilerplate (draft)

### 50 · 50 words

Xhandy is a free, open-source browser extension for people who engage on X by hand. Next to every post it shows post heat, follow status and interaction history, so you can see which posts are worth a reply. It never acts for you and keeps all data in your browser.

### 100 · 104 words

Xhandy is a browser extension for people who engage on X by hand. Next to every post it shows how old the post is and how fast it is getting views, whether you and the author follow each other, and how often you have interacted. It warns you before you send a near-duplicate reply. It never clicks or sends anything for you, keeps all data in your browser, and is free and open source. Xhandy runs on Chrome, Edge and Brave; version 0.4.7 is on GitHub Releases. Xhandy is an independent project. It is not affiliated with, endorsed by or sponsored by X Corp.

### 250 · 230 words

Xhandy is a browser extension for people who engage on X by hand, available for Chrome, Edge and Brave. For anyone growing an account through replies, the hard part is knowing which posts deserve one and where you stand with the author. Xhandy puts the answers next to every post: how old it is and how many views it is getting per hour (orange from 1,000 an hour, red from 10,000, grey after 48 hours), whether you and the author follow each other, and how often you have interacted and when you last did.

While you type, Xhandy warns you if a reply is very similar to one you sent recently. A small bar tracks today's likes, replies, posts and time on X. A read-only "not following you back" panel has no unfollow button, and soft daily limits remind you before you follow or unfollow too fast.

Xhandy never acts for you: it does not click, type, send, like or follow. It has two permissions, storage and unlimitedStorage, makes no network requests, runs no analytics and loads no remote code, so all data stays in your browser. The interface follows your browser language, in Chinese or English.

Xhandy is free and open source. Version 0.4.7 is available at github.com/jackxlabs/xhandy. Xhandy is an independent project. It is not affiliated with, endorsed by or sponsored by X Corp.

## Contacts

- Feedback: X @JackHuang47 · github.com/jackxlabs/xhandy/issues
- Press: [to fill]
