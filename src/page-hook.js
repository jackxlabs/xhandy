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

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { collectRelations, collectViews, collectFriendship };
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

  function emit(json, url) {
    try {
      const u = collectRelations(json);
      const v = collectViews(json);
      const f = collectFriendship(url, json);
      if (!u.length && !v.length && !f.length) return;
      // Strings cross the MAIN/isolated world boundary reliably; objects may not.
      const detail = JSON.stringify({ u, v, f, at: Date.now() });
      if (ready) send(detail);
      else if (buffer.length < 50) buffer.push(detail);
    } catch (_) {
      // Never let x-helper break X.
    }
  }

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const p = origFetch.apply(this, arguments);
    try {
      const url = typeof input === "string" ? input : input && input.url;
      if (url && API.test(url)) {
        p.then((res) => {
          const ct = res.headers.get("content-type") || "";
          if (res.ok && ct.includes("json")) res.clone().json().then((json) => emit(json, url), () => {});
        }, () => {});
      }
    } catch (_) {}
    return p;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      const href = url && String(url);
      if (href && API.test(href)) {
        this.addEventListener("load", function () {
          try {
            if (this.status < 200 || this.status >= 300) return;
            if (this.responseType === "json") return emit(this.response, href);
            if (this.responseType === "" || this.responseType === "text") emit(JSON.parse(this.responseText), href);
          } catch (_) {}
        });
      }
    } catch (_) {}
    return origOpen.apply(this, arguments);
  };
})();
