# Xhandy brand voice and rules

> Generated from brand.yaml v11 (2026-10-20). Edit brand.yaml, then run compile.py.

## Identity
- **Short**: Quiet hints while you use X
- **Medium**: Xhandy puts post heat, your relationship with the author and your interaction history next to every post, so you can see which ones are worth a reply.
- **Long**: Xhandy is a browser extension for people who engage on X by hand. Next to every post it shows how old the post is and how fast it is getting views, whether you and the author follow each other, and how often you have interacted. It warns you before you send a near-duplicate reply. It never clicks or sends anything for you, keeps all data in your browser, and is free and open source.
- **Category**: A browser extension for X: hints for people who engage by hand; Scrolling by hand and remembering who is who; opening profiles or hovering over avatars to check follow status; or other X browser extensions
- **Positioning**: For people who grow on X by replying and engaging by hand, in Chinese or English: Xhandy shows post heat, your relationship with the author and your interaction history right next to every post, so you can see which ones are worth a reply. Other extensions each cover one of these; Xhandy covers them all, and never acts for you.

### Audience: Simplified-Chinese creators with X Premium who grow by engaging by hand and care about views and payouts (core audience, equal to English-speaking users)
- problem: They can't tell which posts are worth replying to, and checking who follows them back or how often they've talked means opening profiles or hovering over avatars

### Audience: English-speaking X users who grow by engaging by hand (core audience, equal to Chinese users)
- problem: The same: no quick way to see which posts deserve a reply, and follow status and past interactions are hidden behind clicks

**Not for**
- People who want growth on autopilot: auto-follow, auto-reply, engagement bots

**Refuses to be**
- A tool that acts for you: it never clicks, types, sends, likes, follows or unfollows, and does nothing in bulk
- A data collector: no analytics, no remote code; offline by default, and network features such as sync stay off until you turn them on
- A speed tool that makes accounts look like bots: soft daily limits on follows and unfollows, and warnings on repeated replies

**Naming**
- Always "Xhandy": capital X, the rest lower case. Never XHandy, X-handy or X Handy
- Chinese copy uses the Latin name Xhandy too; there is no Chinese name
- The repository and local folder are called x-helper; that name is for development only

**Personality**
- Plain: is Labels you read at a glance, like "2h · 15K/h"; is not a flashy analytics dashboard
- Savvy: is Knows how X works: posts over 48 hours old go grey, repeated replies look like spam; is not preachy
- Handy: is Stays out of the way: keyboard shortcuts, overlays that never block a click; is not feature bloat

**Products**
- Xhandy (Live, v0.4.7, download from GitHub Releases): A Chromium extension (Chrome, Edge, Brave) that adds post age and views per hour, follow status, interaction history, duplicate-reply warnings and daily stats to X, plus a follow assistant and a "not following you back" panel
- v0.5 (planned): Roadmap: interaction queue, local idea list, draft prefill for quote posts, export and a generic webhook
- v0.6 (planned): Roadmap: optional Notion sync, store listing
- later (planned): Direction: optional sync across devices (online, off until you turn it on)

## Proof points (the only facts to cite)
- Never acts for you — It never clicks, types, sends, likes or follows. The follow assistant only moves focus to X's own Follow button; you press Enter. End-to-end tests ("extension never clicks anything by itself", "never fakes mouse or pointer events") enforce it `readme`
- Offline by default, your data stays in your browser — Only two permissions, storage and unlimitedStorage; no network requests, analytics or remote code; export, import or delete everything. Network features to come, such as sync, stay off until you turn them on, and only then ask for network access `readme`
- See which posts are taking off — Orange from 1,000 views an hour, red with 🔥 from 10,000; posts older than 48 hours go grey `readme`
- Remembers where you stand with every author — Shows follow status (⇄ mutual / → you follow / ← follows you / not following), how often you have interacted and when you last did `readme`
- All of it in one extension — Post age and heat, follow status, interaction history, duplicate-reply warnings, daily stats, the follow assistant and the "not following you back" panel `readme`
- Free and open source — Public repository jackxlabs/xhandy; download from GitHub Releases `readme`
- Chinese and English interface — Chinese when the browser language is Chinese, English otherwise `readme`

## Voice
Xhandy talks like a friend sitting next to you: says little, and every line is useful

| axis | 1-5 | note |
|---|---|---|
| formal casual | 3 | Clear like good docs; neither stiff nor jokey |
| serious playful | 2 | Mostly serious, with the occasional light line |
| plain technical | 2 | Plain words; technical terms swapped for what users would say |
| reserved bold | 2 | Understated; no inflated claims, limits stated openly |

**Plain**
- Do: Lead with the result and a real number
- Don't: Stacked adjectives, vague "boost" or "optimise"
- Before: Xhandy's smart engine analyses post performance to supercharge your growth!
- After: Posts getting over 10,000 views an hour turn red, so you can see what's taking off.

**Savvy**
- Do: Give the X-specific reason in half a sentence
- Don't: Lecturing, or long lists of warnings
- Before: For your account's safety, please be careful not to follow too many people too frequently.
- After: Xhandy reminds you after 20 follows a day: following fast can get an account limited.

**Handy**
- Do: Say which key to press and where to look
- Don't: Long feature tours
- Before: Take advantage of our thoughtfully designed keyboard shortcuts to dramatically boost your productivity.
- After: Select a post and press Shift+F: focus jumps to the author's Follow button.

### Use / not
| Use | Not | Why |
|---|---|---|
| post | tweet | X's own term since 2023; the README and UI use post |
| X | Twitter | The platform's current name |
| mutual, follows you back | follow-back, F4F | UI wording; F4F reads as follow-for-follow schemes |
| reminder, warning | block, prevent, stop | Soft limits only remind; the wrong word suggests Xhandy stops you |
| views | impressions, reach | The label shows X's own view count |

### Never say
- ban-proof, guaranteed safe, 100% safe: Too absolute and not something Xhandy can promise; say it never acts for you and has soft limits
- AI-powered, smart engine, intelligent: Xhandy has no AI; every label comes from rules and X's own data
- growth hack, game-changer, supercharge, 10x, unlock: Empty hype that clashes with being plain
- never goes online, 100% offline: Sync and other network features are coming; say "offline by default"

Jargon: Technical terms (Manifest V3, service worker, data-testid) belong in developer docs; for users say "browser extension" or "X changed its page"

### Style
- numbers: Real numbers and thresholds (1,000/h, 20 a day, 48 hours), never "tons" or "lots"; thousands separators in prose, 15K style in labels
- spacing and case: Sentence case for headings, buttons and titles; product and feature names as written in the UI
- punctuation: No exclamation marks; UI names in quotes or bold, not both; Oxford comma optional, keep each document consistent
- emoji: No emoji in product copy; the UI only uses 🔥 for hot posts and ⇄ → ← for follow status
- emphasis: Bold only for warnings and key steps, e.g. "keep the folder where it is"
- person: Address the reader as "you"; Xhandy refers to itself by name, not "we"; contractions are fine
- limits: State limits plainly, e.g. "this list is partial", "X may have changed its data, so don't trust this list"
- spelling: US or UK spelling, one per document (the README leans UK: 'colours', 'greyed out'; keep UK unless Jack prefers US); keyboard keys as Shift+F, Alt+U

### Patterns that read as AI (rewrite them)
- "It's not just X, it's Y" and other contrastive framing e.g. "Xhandy isn't just a tool, it's your engagement partner" → Say what it does
- Hype verbs and filler adjectives e.g. "unlock, elevate, seamless, effortless, delve, game-changer" → Use the plain verb and a number
- Scene-setting openers and rhetorical questions e.g. "In today's fast-paced world of social media... Ever wondered why?" → Start with the fact
- Triplets and em-dash chains e.g. "Faster, smarter, safer — all in one place — for everyone" → Keep one claim, add a number
- Inspirational closers e.g. "Make every interaction count." → End on the last useful fact

### Channels
- **README**: format: Docs style: one line on what it is, then features with screenshots; Chinese and English sections; tone: Clear and specific
- **release notes**: format: Use docs/release-template.md; one or two sentences on changes users will notice; tone: Matter-of-fact
- **store listing**: format: One version per language (the extension's _locales); short one-liner first, then the features, ending with the X Corp non-affiliation line; length: Title up to 45 characters; short description up to 132
- **product UI**: format: One line, numbers first; on errors say the likely cause and the next step, never blame the user; tone: Remind, don't command
- **X posts**: format: When Jack mentions Xhandy on his own account, it is his experience in his voice (jack-personal-brand x-voice-guide); tone: Jack's voice

## Compliance (hard rules block publishing)
- [hard] State that Xhandy is independent of X Corp; never suggest it is an official X product or endorsed by X Required: "Xhandy is an independent project. It is not affiliated with, endorsed by or sponsored by X Corp.". Forbidden: "official X", "by X", "X-approved". Applies to: store listing, README, release notes, website. Why: Trademark and store review; the logo also avoids the construction of X's logo `readme` 2026-10-17
- [hard] Never describe Xhandy as automation or a bulk tool: no auto-follow, auto-reply, one-click bulk actions or growth hacks Forbidden: "auto-follow", "auto-reply", "bulk", "on autopilot". Applies to: all. Why: Product rule 1: it never acts for the user; such claims also invite X enforcement and store review problems `dev-rules` 2026-10-19
- [hard] Every network feature (sync, push and the like) is off by default and turned on by the user in settings; copy says "offline by default", never "never goes online". Once sync ships, "your data stays in your browser" becomes "your data stays in your browser by default" Forbidden: "never goes online", "100% offline". Applies to: all. Why: Product rule 2: network features are opt-in; sync across devices needs the network `jack-2026-10-20` 2026-10-20

## Competitors

**X Mutual Radar (Chinese store listing)** https://chromewebstore.google.com/detail/x-mutual-radar/gheaelnpnfiakildlchjkomnbfccddep
- they say: Marks mutual and one-way follows on x.com, with an optional following/followers ratio (from its store description, translated)
- our difference: Xhandy adds interaction count and last contact to the same label, next to post heat
- do not echo: mutual radar, radar

**X Viral Monitor (Chinese store listing)** https://chromewebstore.google.com/detail/x-viral-monitor/dkplofpecmjmbhgjgleeflcnfgfkdfpd
- they say: Views-per-hour badges, long-image reading, Markdown copy, repost maps and Grok reply help, all processed locally with zero data collection (from its store description, translated)
- our difference: Xhandy keeps heat, relationship and interaction history in one label, and has no AI reply help: you write every reply yourself
- do not echo: viral, zero data collection, viral monitor

**Mutual-check and follower-count add-ons (a Chinese X mutual checker, X Following Tracker, Follower Lens, x-follower-count)** https://github.com/yaohongan/x-follower-lens
- they say: Single-purpose tools: detect mutuals, export your following list, show follower counts next to names
- our difference: Xhandy's "not following you back" panel is read-only with no unfollow button, and follow status lives in the timeline label
- do not echo: mutual checker

**tendX / SuperX / BlackMagic** https://www.tendx.app/
- they say: English-language tools that log the likes, replies and DMs you send, or overlay interaction data on profiles; SuperX and BlackMagic are paid
- our difference: Xhandy is free, open source and offline by default, and puts interaction history straight on the timeline
- do not echo: interaction history, engagement CRM

**AutoFollowers** https://chromewebstore.google.com/detail/autofollowers/cioeeikbgpoepcgfmpfaajgkaommkbni
- they say: Bulk follow and unfollow for X, filtered by verification, follower range and mutual status
- our difference: The opposite of Xhandy, which never works in bulk and never acts for you
- do not echo: bulk follow, mass unfollow, bulk, one-click
