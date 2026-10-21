# Xhandy privacy policy

Last updated: 2026-10-21

Xhandy is a browser extension that shows hints while you use X (x.com). It is built so that your data never
leaves your browser.

## What Xhandy collects

Nothing is collected by the developer. Xhandy has no server, no analytics, no crash reporting and no ads,
and it makes no network requests of its own.

## What Xhandy stores in your browser

Everything below is kept in your browser's extension storage (`chrome.storage.local`) on your own device.
It is not synced to other devices and is never sent anywhere.

- **Settings** you choose on the Options page (feature switches, limits, thresholds, accounts to highlight).
- **Daily counts**: likes, replies, posts, follows, unfollows and time spent on X, per day.
- **Recent follow and unfollow times**: timestamps of up to 100 recent follows and 100 recent unfollows,
  dropped after 24 hours, used only to remind you when you follow or unfollow too fast within a short window.
- **Interaction counts per account**: how many times you liked or replied to an account, and when you last did;
  and how many times that account liked, replied to, quoted or mentioned you, and when it last did.
- **Counted interactions**: up to 20,000 short ids of the interactions above that were already counted, so
  seeing the same notification again does not count it twice.
- **Follow relationships**: for accounts that X has shown in your browser, their handle, display name, user ID,
  whether you follow them and whether they follow you.
- **Posts you replied to**: the ids of up to 5,000 posts you replied to, to mark them with `✓ replied`.
- **Your own account**: your handle, account id and follower count, to show how big an author is compared with you.
- **Your recent replies and posts**: the text of your last 300, used only to warn you before you send a reply
  that is very similar to one you sent before.

## Where the data comes from

- The X pages you open and your own actions on them (likes, replies, posts, follows).
- The data X's own website already sends to your browser while you use it. Xhandy reads copies of these
  responses (follow relationships, view counts, reply and follower counts, your notifications, and X's answers to your own follows, unfollows, posts and
  replies; a post or reply is recorded only once X confirms it was created).
  It never changes them, never sends extra requests to X and never sends anything to anyone else.

## Permissions

- `storage` and `unlimitedStorage`: to keep the data above in your browser. `unlimitedStorage` only lifts
  Chrome's 10 MB limit so a long follow list fits.
- Content scripts on `x.com` and `twitter.com` only. Xhandy does not run on any other site.

## Your control

- Export all data to a JSON file, import it, or delete all of it from the Options page.
- Removing the extension deletes all of its data from your browser.

## Changes

If a future version adds an optional feature that sends data somewhere (for example a sync you set up yourself),
it will be off by default, ask for permission when you turn it on, and be described here first.

## Contact

Questions or concerns: open an issue in the project's GitHub repository.
