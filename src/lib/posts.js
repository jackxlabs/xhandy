// Finding posts on X's page. X's old layout marks every post as article[data-testid="tweet"]; some accounts get
// a layout without that mark. What every post has in both is its permalink with a time, a[href*="/status/"] time,
// so when the old mark is missing, posts are found from those links.
(function () {
  const XH = (globalThis.XH = globalThis.XH || {});

  const LEGACY = 'article[data-testid="tweet"]';
  const TIME = 'a[href*="/status/"] time';
  // Containers that mark a post in layouts we can guess at: the old mark on another tag, a bare article, ARIA's article.
  const TAGGED = 'article, [role="article"], [data-testid="tweet"]';
  // Cells of X's lists that are not posts ("liked your post" notifications).
  const NOT_POST = '[data-testid="notification"]';
  // X's virtual list cell: one post (or ad, or "show more") per cell.
  const CELL = '[data-testid="cellInnerDiv"]';
  // Walking up from a post's time link never goes past these: above them is the whole column or page.
  const BOUNDARY = 'body, main, [role="main"], section, [role="region"], [data-testid="primaryColumn"]';

  // The non-link box a time link sits in (a quoted post's box is a div[role="link"]), or null.
  function boxOf(time) {
    const a = time.closest("a");
    const up = a && a.parentElement;
    return up ? up.closest('[role="link"]:not(a)') : null;
  }

  // A time link of a quoted post: inside a link box, and the nearest other post link around that box is one that is
  // not boxed itself, or whose box holds this one (the post doing the quoting). A box around a whole post, as a
  // clickable post would have, is not a quote: the nearest other links then belong to neighbouring posts.
  function isQuoted(time, links) {
    const box = boxOf(time);
    if (!box) return false;
    for (let c = box.parentElement; c; c = c.parentElement) {
      const others = links.filter((x) => x !== time && c.contains(x) && !box.contains(x));
      if (!others.length) continue;
      return others.some((x) => {
        const b = boxOf(x);
        return !b || b.contains(box);
      });
    }
    return false;
  }

  // Time links of posts on the page, without quoted posts' and notification cells'.
  function ownLinks(doc) {
    const all = [...doc.querySelectorAll(TIME)].filter((t) => !t.closest(NOT_POST));
    return all.filter((t) => !isQuoted(t, all));
  }

  // The tagged container for a time link, or null. A tagged container inside another (a quoted post marked as an
  // article) belongs to the outer one, as long as the outer one holds no other post next to it.
  function taggedOf(time) {
    let hit = time.closest(TAGGED);
    if (!hit) return null;
    for (let up = hit.parentElement && hit.parentElement.closest(TAGGED); up; up = up.parentElement && up.parentElement.closest(TAGGED)) {
      const direct = [...up.querySelectorAll(TAGGED)].filter((x) => x.parentElement.closest(TAGGED) === up);
      if (direct.length !== 1) break;
      hit = up;
    }
    return hit;
  }

  // Without any mark: the largest ancestor of the time link that holds no other post's link, stopping at the list
  // cell X puts each post in, and below the page column.
  // shortcut: a page showing a single post (and nothing marked) gets the whole list area as that post, so a tint
  // covers that area until a second post loads; fine while X keeps one post per page there.
  function climb(time, counts) {
    let cur = time.closest("a");
    for (;;) {
      const p = cur.parentElement;
      if (!p || p.matches(BOUNDARY) || p.matches(CELL) || (counts.get(p) || 0) > 1) return cur;
      cur = p;
    }
  }

  // Every post container on the page, in page order, no container inside another.
  function find(doc = document) {
    if (doc.querySelector(LEGACY)) return [...doc.querySelectorAll(LEGACY)]; // old layout: exactly as before
    const links = ownLinks(doc);
    const counts = new Map();
    for (const t of links) {
      for (let a = t.parentElement; a; a = a.parentElement) counts.set(a, (counts.get(a) || 0) + 1);
    }
    const found = new Set();
    for (const t of links) found.add(taggedOf(t) || climb(t, counts));
    const list = [...found];
    return list.filter((p) => !list.some((q) => q !== p && q.contains(p)));
  }

  // The post an element is in (a focused post, a clicked button), or null.
  function of(el) {
    if (!el || el.nodeType !== 1) return null;
    const doc = el.ownerDocument;
    if (doc.querySelector(LEGACY)) return el.closest(LEGACY);
    return find(doc).find((p) => p.contains(el)) || null;
  }

  // The post's own time link: the first one that is not a quoted post's.
  function ownTime(post) {
    if (post.matches(LEGACY)) return post.querySelector(TIME);
    const all = [...post.querySelectorAll(TIME)];
    return all.find((t) => !isQuoted(t, all)) || all[0] || null;
  }

  // Structure-only description of the first two post links, for a user to send when Xhandy can't find posts:
  // tag names, data-testid and role of each link's ancestors, and the set of tag:testid in the area around it.
  // No text, names, handles or URLs: digits become #, and a testid that carries a handle keeps only its prefix.
  function testid(el) {
    const v = el.getAttribute("data-testid");
    if (!v) return "";
    if (/^UserAvatar-Container-/.test(v)) return "UserAvatar-Container-*";
    return v.replace(/\d+/g, "#").replace(/[^A-Za-z#_-]/g, "?").slice(0, 40);
  }
  function role(el) {
    return (el.getAttribute("role") || "").replace(/[^a-z]/g, "").slice(0, 20);
  }
  function label(el) {
    const id = testid(el);
    const r = role(el);
    return el.tagName.toLowerCase() + (id ? "[" + id + "]" : "") + (r ? "{" + r + "}" : "");
  }
  function probe(doc = document) {
    let starts = [...doc.querySelectorAll(TIME)];
    let kind = "status-time";
    if (!starts.length) {
      starts = [...doc.querySelectorAll("time")];
      kind = "time";
    }
    if (!starts.length) {
      starts = [...doc.querySelectorAll('a[href*="/status/"]')];
      kind = "status-link";
    }
    const lines = [
      "Xhandy " + ((globalThis.chrome && chrome.runtime && chrome.runtime.getManifest && chrome.runtime.getManifest().version) || "?"),
      "page: " + (/\/status\/\d/.test(location.pathname) ? "status" : location.pathname === "/home" ? "home" : "other"),
      "counts: status-time " + doc.querySelectorAll(TIME).length + ", time " + doc.querySelectorAll("time").length +
        ", status-link " + doc.querySelectorAll('a[href*="/status/"]').length + ", article " + doc.querySelectorAll("article").length +
        ", tweet " + doc.querySelectorAll('[data-testid="tweet"]').length + ", cell " + doc.querySelectorAll(CELL).length,
      "start: " + kind,
    ];
    const kindSel = kind === "status-time" ? TIME : kind === "time" ? "time" : 'a[href*="/status/"]';
    starts.slice(0, 2).forEach((start, i) => {
      const chain = [];
      let area = start;
      for (let a = start.parentElement, n = 0; a && n < 14; a = a.parentElement, n++) {
        chain.push(label(a));
        // The largest ancestor holding just this one starting element stands in for the post.
        if (a.querySelectorAll(kindSel).length === 1) area = a;
      }
      const inside = new Set();
      for (const el of area.querySelectorAll("[data-testid], [role]")) inside.add(label(el));
      lines.push("#" + (i + 1) + " up: " + chain.join(" < "));
      lines.push("#" + (i + 1) + " in: " + [...inside].sort().join(" "));
    });
    return lines.join("\n");
  }

  XH.posts = { LEGACY, TIME, find, of, ownTime, probe };
})();
