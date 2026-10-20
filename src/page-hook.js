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
        out.set(v.core.screen_name.toLowerCase(), {
          handle: v.core.screen_name,
          name: v.core.name || null,
          id: v.rest_id || null,
          following: !!r.following,
          followedBy: !!r.followed_by,
        });
      }
      for (const k in v) stack.push(v[k]);
    }
    return [...out.values()];
  }

  // Walk any JSON value and collect view counts of posts: [{ id, views }].
  function collectViews(root) {
    const out = new Map();
    const stack = [root];
    while (stack.length) {
      const v = stack.pop();
      if (!v || typeof v !== "object") continue;
      if (Array.isArray(v)) {
        for (const x of v) stack.push(x);
        continue;
      }
      if (v.__typename === "Tweet" && v.rest_id && v.views && v.views.count != null) {
        const n = Number(v.views.count);
        if (Number.isFinite(n)) out.set(v.rest_id, { id: v.rest_id, views: n });
      }
      for (const k in v) stack.push(v[k]);
    }
    return [...out.values()];
  }

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
    const isReply = Boolean(res.legacy?.in_reply_to_status_id_str);
    const kind = isReply ? "reply" : "post";
    const to = isReply && typeof res.legacy?.in_reply_to_screen_name === "string" ? res.legacy.in_reply_to_screen_name : null;
    return { ok: true, kind, text, to };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { collectRelations, collectViews, collectFriendship, collectCreated };
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

  window.addEventListener("xh-ready", () => {
    ready = true;
    buffer.splice(0).forEach(send);
  });

  function dispatch(payload) {
    const detail = JSON.stringify(payload);
    if (ready) send(detail);
    else if (buffer.length < 50) buffer.push(detail);
  }

  function emitSeen() {
    try {
      dispatch({ u: [], v: [], f: [], c: [{ seen: true }], at: Date.now() });
    } catch (_) {}
  }

  function emit(json, url, ok = true) {
    try {
      const u = ok ? collectRelations(json) : [];
      const v = ok ? collectViews(json) : [];
      const f = ok ? collectFriendship(url, json) : [];
      const created = collectCreated(url, json, ok);
      const c = created ? [created] : [];
      if (!u.length && !v.length && !f.length && !c.length) return;
      // Strings cross the MAIN/isolated world boundary reliably; objects may not.
      dispatch({ u, v, f, c, at: Date.now() });
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
