// Runs in the page's own JS world (MAIN) so it can see the responses X's web app already
// receives. It never sends requests of its own and never modifies responses: it clones a
// response, reads follow relationships out of it, and hands them to the content script.
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
          id: v.rest_id || null,
          following: !!r.following,
          followedBy: !!r.followed_by,
        });
      }
      for (const k in v) stack.push(v[k]);
    }
    return [...out.values()];
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { collectRelations };
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

  function emit(json) {
    try {
      const users = collectRelations(json);
      if (!users.length) return;
      // Strings cross the MAIN/isolated world boundary reliably; objects may not.
      const detail = JSON.stringify(users);
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
          if (res.ok && ct.includes("json")) res.clone().json().then(emit, () => {});
        }, () => {});
      }
    } catch (_) {}
    return p;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      if (url && API.test(String(url))) {
        this.addEventListener("load", function () {
          try {
            if (this.status < 200 || this.status >= 300) return;
            if (this.responseType === "json") return emit(this.response);
            if (this.responseType === "" || this.responseType === "text") emit(JSON.parse(this.responseText));
          } catch (_) {}
        });
      }
    } catch (_) {}
    return origOpen.apply(this, arguments);
  };
})();
