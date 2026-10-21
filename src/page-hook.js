// Runs in the page's own JS world (MAIN) so it can see the responses X's web app already
// receives. It never sends requests of its own and never modifies responses: it clones a
// response, reads follow relationships, post view counts and the user's own follows/unfollows
// out of it, and hands them to the content script.
(function () {
  // Walk any JSON value and collect User objects that carry relationship info.
  function collectRelations(root) {
    const out = new Map();
    const stack = [root];
    while (stack.length) {
      const v = stack.pop();
      if (!v || typeof v !== "object") continue;
      if (Array.isArray(v)) {
        for (const x of v) stack.push(x);
        continue;
      }
      if (v.__typename === "User" && v.relationship_perspectives && v.core && v.core.screen_name) {
        const r = v.relationship_perspectives;
        const entry = {
          handle: v.core.screen_name,
          name: v.core.name || null,
          id: v.rest_id || null,
          following: !!r.following,
          followedBy: !!r.followed_by,
        };
        if (v.relationship_counts && v.relationship_counts.followers != null) {
          const fc = Number(v.relationship_counts.followers);
          if (Number.isFinite(fc) && fc >= 0) entry.followers = fc;
        }
        const key = v.core.screen_name.toLowerCase();
        const existing = out.get(key);
        if (existing && entry.followers == null && existing.followers != null) {
          entry.followers = existing.followers;
        }
        out.set(key, entry);
      }
      for (const k in v) stack.push(v[k]);
    }
    return [...out.values()];
  }

  // Walk any JSON value and collect post stats: [{ id, views?, replies?, author?, authorFollowers?, inReplyTo? }].
  function collectPosts(root) {
    const out = new Map();
    const stack = [root];
    while (stack.length) {
      const v = stack.pop();
      if (!v || typeof v !== "object") continue;
      if (Array.isArray(v)) {
        for (const x of v) stack.push(x);
        continue;
      }
      if (v.__typename === "Tweet" && v.rest_id) {
        const post = { id: String(v.rest_id) };
        if (v.views && v.views.count != null) {
          const n = Number(v.views.count);
          if (Number.isFinite(n) && n >= 0) post.views = n;
        }
        if (v.legacy && v.legacy.reply_count != null) {
          const r = Number(v.legacy.reply_count);
          if (Number.isFinite(r) && r >= 0) post.replies = r;
        }
        const user = v.core && v.core.user_results && v.core.user_results.result;
        const author = user && ((user.core && user.core.screen_name) || (user.legacy && user.legacy.screen_name));
        if (typeof author === "string" && author) {
          post.author = author;
        }
        if (user && user.relationship_counts && user.relationship_counts.followers != null) {
          const f = Number(user.relationship_counts.followers);
          if (Number.isFinite(f) && f >= 0) post.authorFollowers = f;
        }
        if (v.legacy && typeof v.legacy.in_reply_to_status_id_str === "string" && v.legacy.in_reply_to_status_id_str) {
          post.inReplyTo = v.legacy.in_reply_to_status_id_str;
        }
        out.set(post.id, post);
      }
      for (const k in v) stack.push(v[k]);
    }
    return [...out.values()];
  }
  const collectViews = collectPosts;

  // The user's own follow or unfollow, from X's reply to it: POST .../friendships/create.json
  // (or destroy.json) answers with the account. Seeing the request rather than a button means
  // every way of following counts (Follow buttons, the post's ⋯ menu, ...), and failed ones don't.
  const FRIENDSHIP = /\/friendships\/(create|destroy)\.json(\?|$)/;
  function collectFriendship(url, json) {
    const m = FRIENDSHIP.exec(url);
    if (!m || !json || typeof json.screen_name !== "string") return [];
    return [{ handle: json.screen_name, name: json.name || null, id: json.id_str || null, on: m[1] === "create" }];
  }

  // The user's own post or reply, from X's GraphQL mutation: POST .../(CreateTweet|CreateNoteTweet)
  const POST_URL = /\/graphql\/[^/]+\/(CreateTweet|CreateNoteTweet)(\?|$)/;

  function decodeEntities(s) {
    return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  }

  function collectCreated(url, json, ok = true) {
    if (typeof url !== "string" || !POST_URL.test(url)) return null;
    if (!ok) return { ok: false };
    if (!json || typeof json !== "object") return { ok: false };

    let res = json.data?.create_tweet?.tweet_results?.result || json.data?.notetweet_create?.tweet_results?.result;
    if (res && res.tweet) res = res.tweet;

    if (!res) {
      return json.errors ? { ok: false } : { shape: "unknown" };
    }

    const noteText = res.note_tweet?.note_tweet_results?.result?.text;
    let rawText = "";
    if (typeof noteText === "string") {
      rawText = noteText;
    } else if (res.legacy && typeof res.legacy.full_text === "string") {
      const chars = Array.from(res.legacy.full_text);
      const range = res.legacy.display_text_range;
      if (Array.isArray(range) && range.length === 2 && Number.isInteger(range[0]) && Number.isInteger(range[1])) {
        rawText = chars.slice(range[0], range[1]).join("");
      } else {
        rawText = res.legacy.full_text;
      }
    } else {
      return { shape: "unknown" };
    }

    const text = decodeEntities(rawText);
    const inReplyTo = typeof res.legacy?.in_reply_to_status_id_str === "string" ? res.legacy.in_reply_to_status_id_str : null;
    const isReply = Boolean(inReplyTo);
    const kind = isReply ? "reply" : "post";
    const to = isReply && typeof res.legacy?.in_reply_to_screen_name === "string" ? res.legacy.in_reply_to_screen_name : null;
    return { ok: true, kind, text, to, inReplyTo };
  }

  // Walk any JSON value and collect inbound interactions (likes, replies, quotes, mentions):
  // [{ kind, from: { handle, id, name }, key, at }]
  // X sends notification times as epoch milliseconds in a string, or as an ISO date.
function parseTime(x) {
  if (x == null || x === "") return 0;
  const n = /^\d+$/.test(String(x)) ? Number(x) : Date.parse(x);
  return Number.isFinite(n) ? n : 0;
}

function collectInbound(json, me) {
    if (!json || typeof json !== "object") return [];
    if (!me || (!me.handle && !me.id)) return [];

    const myHandle = me.handle && typeof me.handle === "string" ? me.handle.toLowerCase() : null;
    const myId = me.id != null ? String(me.id) : null;

    function isTargetMe(targetHandle, targetId) {
      if (myId && targetId != null && String(targetId) === myId) return true;
      if (myHandle && targetHandle != null && String(targetHandle).toLowerCase() === myHandle) return true;
      return false;
    }

    function getUser(u) {
      if (!u || typeof u !== "object") return null;
      return u.user_results?.result || u.result || u;
    }

    function getUserHandle(user) {
      if (!user || typeof user !== "object") return null;
      return (user.core && user.core.screen_name) || (user.legacy && user.legacy.screen_name) || user.screen_name || null;
    }

    function getUserId(user) {
      if (!user || typeof user !== "object") return null;
      const id = user.rest_id || user.id_str || user.id;
      return id != null ? String(id) : null;
    }

    function getUserName(user) {
      if (!user || typeof user !== "object") return null;
      return (user.core && user.core.name) || (user.legacy && user.legacy.name) || user.name || null;
    }

    function isUserMe(user) {
      if (!user) return false;
      return isTargetMe(getUserHandle(user), getUserId(user));
    }

    const out = new Map();
    const stack = [json];
    while (stack.length) {
      const v = stack.pop();
      if (!v || typeof v !== "object") continue;
      if (Array.isArray(v)) {
        for (const x of v) stack.push(x);
        continue;
      }

      // 1. Likes from notifications
      if (v.notification_icon === "heart_icon") {
        const template = v.template;
        if (template && template.__typename === "TimelineNotificationAggregateUserActions") {
          const element = v.clientEventInfo && v.clientEventInfo.element;
          if (!element || element.includes("liked")) {
            const at = parseTime(v.timestamp_ms) || Date.now();
            const fromUsers = Array.isArray(template.from_users) ? template.from_users : [];
            const targetObjects = Array.isArray(template.target_objects) ? template.target_objects : [];

            for (const rawUser of fromUsers) {
              const user = getUser(rawUser);
              if (!user || isUserMe(user)) continue;
              const likerId = getUserId(user);
              const likerHandle = getUserHandle(user);
              const likerName = getUserName(user);
              if (!likerId || !likerHandle) continue;

              for (const rawTarget of targetObjects) {
                const tweet = rawTarget.tweet_results?.result?.tweet || rawTarget.tweet_results?.result || rawTarget.result || rawTarget;
                if (!tweet || typeof tweet !== "object") continue;
                const postId = tweet.rest_id || tweet.legacy?.id_str || tweet.id_str;
                if (!postId) continue;

                const tweetAuthor = tweet.core?.user_results?.result || tweet.author;
                if (tweetAuthor && !isUserMe(tweetAuthor)) continue;

                const key = `L:${likerId}:${postId}`;
                if (!out.has(key)) {
                  out.set(key, {
                    kind: "like",
                    from: {
                      handle: likerHandle,
                      id: likerId,
                      name: likerName,
                    },
                    key,
                    at,
                  });
                }
              }
            }
          }
        }
      }

      // 2. Posts: replies, quotes, mentions (priority reply > quote > mention)
      if (v.__typename === "Tweet" && (v.rest_id || v.id_str)) {
        const postId = String(v.rest_id || v.id_str);
        const author = v.core?.user_results?.result || v.author;
        const authorHandle = getUserHandle(author) || v.legacy?.screen_name;
        const authorId = getUserId(author) || v.legacy?.user_id_str;
        const authorName = getUserName(author);

        if (authorHandle && !isUserMe(author) && !isTargetMe(authorHandle, authorId)) {
          const legacy = v.legacy || {};
          const key = `P:${postId}`;

          // Reply
          const isReply = isTargetMe(legacy.in_reply_to_screen_name, legacy.in_reply_to_user_id_str);

          // Quote
          let isQuote = false;
          if (!isReply && v.quoted_status_result?.result) {
            const quoted = v.quoted_status_result.result.tweet || v.quoted_status_result.result;
            const quotedAuthor = quoted.core?.user_results?.result || quoted.author;
            const quotedHandle = getUserHandle(quotedAuthor) || quoted.legacy?.screen_name;
            const quotedId = getUserId(quotedAuthor) || quoted.legacy?.user_id_str;
            if (isTargetMe(quotedHandle, quotedId)) {
              isQuote = true;
            }
          }

          // Mention
          let isMention = false;
          if (!isReply && !isQuote && legacy.entities?.user_mentions) {
            const mentions = Array.isArray(legacy.entities.user_mentions) ? legacy.entities.user_mentions : [];
            const range = Array.isArray(legacy.display_text_range) ? legacy.display_text_range : null;
            const textStart = (range && typeof range[0] === "number") ? range[0] : 0;

            for (const m of mentions) {
              if (!m || typeof m !== "object") continue;
              if (isTargetMe(m.screen_name, m.id_str || m.id)) {
                if (Array.isArray(m.indices) && typeof m.indices[0] === "number" && m.indices[0] < textStart) {
                  continue; // auto-mention of a reply
                }
                isMention = true;
                break;
              }
            }
          }

          let kind = null;
          if (isReply) kind = "reply";
          else if (isQuote) kind = "quote";
          else if (isMention) kind = "mention";

          if (kind && !out.has(key)) {
            const at = (legacy.created_at && Date.parse(legacy.created_at)) || Date.now();
            out.set(key, {
              kind,
              from: {
                handle: authorHandle,
                id: authorId ? String(authorId) : null,
                name: authorName,
              },
              key,
              at,
            });
          }
        }
      }

      for (const k in v) stack.push(v[k]);
    }
    return [...out.values()];
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { collectRelations, collectViews, collectPosts, collectFriendship, collectCreated, collectInbound };
    return;
  }

  const API = /\/i\/api\/|\/graphql\//;
  const EVENT = "xh-relations";

  // The content script loads after the first timeline request, so keep payloads until it
  // says it is ready ("xh-ready"), then replay them.
  let ready = false;
  const buffer = [];

  function send(detail) {
    window.dispatchEvent(new CustomEvent(EVENT, { detail }));
  }

  let currentMe = { handle: null, id: null };

  function updateMeFromViewer(json) {
    try {
      const viewer = json?.data?.viewer_v2?.user_results?.result;
      if (viewer) {
        if (viewer.rest_id) currentMe.id = String(viewer.rest_id);
        const h = viewer.core?.screen_name || viewer.legacy?.screen_name;
        if (h) currentMe.handle = h;
      }
    } catch (_) {}
  }

  function getMe() {
    try {
      if (!currentMe.handle && typeof document !== "undefined") {
        const a = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
        const m = a && (a.getAttribute("href") || "").match(/^\/([A-Za-z0-9_]{1,15})$/);
        if (m) currentMe.handle = m[1];
      }
    } catch (_) {}
    return (currentMe.handle || currentMe.id) ? currentMe : null;
  }

  window.addEventListener("xh-ready", (e) => {
    ready = true;
    if (e && e.detail && typeof e.detail === "object") {
      if (e.detail.handle) currentMe.handle = e.detail.handle;
      if (e.detail.id) currentMe.id = e.detail.id;
    }
    buffer.splice(0).forEach(send);
  });

  function dispatch(payload) {
    const detail = JSON.stringify(payload);
    if (ready) send(detail);
    else if (buffer.length < 50) buffer.push(detail);
  }

  function emitSeen() {
    try {
      dispatch({ u: [], v: [], f: [], c: [{ seen: true }], n: [], at: Date.now() });
    } catch (_) {}
  }

  function emit(json, url, ok = true) {
    try {
      if (json) updateMeFromViewer(json);
      const me = getMe();
      const u = ok ? collectRelations(json) : [];
      const v = ok ? collectPosts(json) : [];
      const f = ok ? collectFriendship(url, json) : [];
      const created = collectCreated(url, json, ok);
      const c = created ? [created] : [];
      const n = (ok && me) ? collectInbound(json, me) : [];
      if (!u.length && !v.length && !f.length && !c.length && !n.length) return;
      // Strings cross the MAIN/isolated world boundary reliably; objects may not.
      dispatch({ u, v, f, c, n, at: Date.now() });
    } catch (_) {
      // Never let Xhandy break X.
    }
  }

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const p = origFetch.apply(this, arguments);
    try {
      const url = typeof input === "string" ? input : input && input.url;
      if (url && API.test(url)) {
        const isPost = POST_URL.test(url);
        if (isPost) emitSeen();
        // Every step is caught: a failure here must never surface as an error, on X or in chrome://extensions.
        p.then((res) => {
          const ct = res.headers.get("content-type") || "";
          if (res.ok && ct.includes("json")) {
            return res
              .clone()
              .json()
              .then((json) => emit(json, url, true))
              .catch(() => {
                if (isPost) emit(null, url, false);
              });
          }
          if (isPost) {
            if (ct.includes("json")) {
              return res
                .clone()
                .json()
                .then((json) => emit(json, url, false))
                .catch(() => emit(null, url, false));
            }
            emit(null, url, false);
          }
        }).catch(() => {
          if (isPost) emit(null, url, false);
        });
      }
    } catch (_) {}
    return p;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      const href = url && String(url);
      if (href && API.test(href)) {
        const isPost = POST_URL.test(href);
        if (isPost) emitSeen();
        this.addEventListener("load", function () {
          try {
            const ok = this.status >= 200 && this.status < 300;
            if (!ok && !isPost) return;
            let json = null;
            try {
              if (this.responseType === "json") json = this.response;
              else if (this.responseType === "" || this.responseType === "text") json = JSON.parse(this.responseText);
            } catch (_) {}
            emit(json, href, ok);
          } catch (_) {}
        });
        if (isPost) {
          this.addEventListener("error", function () {
            try { emit(null, href, false); } catch (_) {}
          });
          this.addEventListener("abort", function () {
            try { emit(null, href, false); } catch (_) {}
          });
        }
      }
    } catch (_) {}
    return origOpen.apply(this, arguments);
  };
})();
