# Xhandy privacy policy

Last updated: 2026-11-24

Xhandy is a browser extension that shows hints while you use X (x.com). It works offline by default; optional AI assistance sends selected text directly to your chosen provider.

## What Xhandy collects

Nothing is collected by the developer. Xhandy has no server, no analytics, no crash reporting and no ads,
and it makes no network requests by default. The optional AI feature is described below.

## What Xhandy stores in your browser

Everything below is kept in your browser's extension storage (`chrome.storage.local`) on your own device.
It is not synced to other devices. Only the AI inputs described below leave the browser when you enable AI and request a draft.

- **Settings** you choose on the Options page (feature switches, limits, thresholds, accounts to highlight, and the stats bar position).
- **Daily counts**: likes, replies, posts, follows, unfollows, time spent on X, and a daily snapshot of your follower count (when X provides it), per day.
- **Recent follow and unfollow times**: timestamps of up to 100 recent follows and 100 recent unfollows,
  dropped after 24 hours, used only to remind you when you follow or unfollow too fast within a short window.
- **Interaction counts per account**: how many times you liked or replied to an account, and when you last did;
  and how many times that account liked, replied to, quoted or mentioned you, and when it last did.
- **Counted interactions**: up to 20,000 short ids of the interactions above that were already counted, so
  seeing the same notification again does not count it twice.
- **Follow relationships**: for accounts that X has shown in your browser, their handle, display name, user ID,
  whether you follow them and whether they follow you; for mutuals, when Xhandy last saw you follow each other,
  when it noticed they stopped following you back, and when you dismissed that notice; and follower (`fo`) and following (`fg`) counts when X provides them.
- **Panel state across reloads** (`sessionStorage`): whether the side panel is open, which view it is on (not following back or key accounts), its search text and scroll position (`xh:panel`). It is kept per tab, so the panel is still open after you click an account in it, and is removed when you close the panel or the tab.
- **Posts you replied to**: the ids of up to 5,000 posts you replied to, to mark them with `✓ replied`.
- **Your own account**: your handle, account id and follower count, to show how big an author is compared with you.
- **Key accounts**: up to 1,000 accounts you starred, with the handle and the timestamp when each was added, used to highlight their posts and list them in the quiet accounts panel and settings page.
- **Notes**: up to 5,000 private notes you wrote about accounts, including each account's status preset, tags, note text, X user ID (when known), and timestamps when created and last edited. Kept only in this browser, never sent anywhere, and can be edited, deleted or cleared from the Options page.
- **Your recent replies and posts**: the text of your last 300, used to warn you before you send a reply
  that is very similar to one you sent before.
- **Your own posts and replies performance**: up to 2,000 records of posts and replies written by your signed-in account, holding the post id, whether it is a reply or original post, creation timestamp, the account replied to, the first 80 characters of your text, the latest view, like and reply counts X showed with the time they were received, and reply context available when sent or seen (parent creation time, parent author followers, your followers, and parent views per hour). The oldest records by creation time are dropped first. Kept in `xh:mine` and used for the Review view.

## Where the data comes from

- The X pages you open and your own actions on them (likes, replies, posts, follows, the accounts you star, and the notes you write).
- The data X's own website already sends to your browser while you use it. Xhandy reads copies of these
  responses (follow relationships, view counts, reply and follower counts, your notifications, and X's answers to your own follows, unfollows, posts and
  replies; a post or reply is recorded only once X confirms it was created).
  It never changes them or sends extra requests to X. Optional AI uses selected text as described below.

## Optional AI assistance

AI is off by default. You choose a provider, model, output language and tone, add your own API key (not required for local Ollama), and explicitly grant access to that provider origin in Options. Only then, when you request a draft or rewrite, the background worker sends the original post text and author display name/handle, your composer text, and optional style examples directly from your browser to the selected provider. No request passes through Xhandy servers. The provider processes these inputs under its own privacy policy; choosing a local Ollama service keeps processing local.

Style examples are up to five of your highest-viewed replies from the last 30 days, only when full sent text can be matched unambiguously to the stored performance record. You can disable examples. Connection testing uses only a small synthetic prompt, not your post history. Generated candidates are not persisted by Xhandy. Only clicking a candidate inserts text; sending on X is always manual.

AI preferences are stored in `xh:settings`. Your key is stored only on this device as `xh:aiKey`, bound to its API base URL. It is not encrypted by Xhandy, included in exports, or overwritten by imports. Import always disables AI. Clearing all data removes the key too. Switching service providers requires configuring and applying their credentials.

## Permissions

- `storage` and `unlimitedStorage`: to keep the data above in your browser. `unlimitedStorage` only lifts
  Chrome's 10 MB limit so a long follow list fits.
- Optional HTTPS host access (or loopback HTTP for local providers): requested only for the provider origin you select when enabling AI. Requests are sent only by the extension service worker, without cookies or following redirects. You can disable AI in Options or revoke site access in Chrome.
- Content scripts on `x.com` and `twitter.com` only. Xhandy does not run on any other site.

## Your control

- Export data (excluding API keys) to JSON, import it without replacing keys or enabling AI, or delete all data including the key from Options.
- Removing the extension deletes all of its data from your browser.

## Changes

If a future version adds an optional feature that sends data somewhere (for example a sync you set up yourself),
it will be off by default, ask for permission when you turn it on, and be described here first.

## Contact

Questions or concerns: open an issue in the project's GitHub repository.
