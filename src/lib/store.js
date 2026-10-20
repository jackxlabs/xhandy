// All state lives in chrome.storage.local. Nothing leaves the browser.
// Each top-level part (settings, rel, ...) is its own key ("xh:rel"), so a write touches only the parts
// it changes: the 15-second time tick rewrites a few bytes of "xh:days", not 30,000 relationships.
(function () {
  const XH = (globalThis.XH = globalThis.XH || {});
  const PREFIX = "xh:";
  const VERSION_KEY = "xh:v";
  const VERSION = 3;
  const LEGACY_KEY = "xh"; // v1 kept everything under this one key

  const DEFAULTS = {
    settings: {
      targets: [], // handles to highlight, without "@"
      staleHours: 48,
      showHeat: true, // colour the age chip by views per hour
      heatWarm: 1000, // views/hour from which a post counts as warm
      heatHot: 10000, // ... and hot
      dupThreshold: 0.6,
      dupWindow: 50, // compare against the last N sent texts
      repeatShort: 3, // warn when the same short text was sent this many times
      hud: true,
      dailyReplyGoal: 0, // 0 = no goal
      showRel: true, // follow relationship in post badges
      followLimit: 20, // soft daily follow limit: warn above this, never block
      unfollowLimit: 20, // same for unfollows made by hand on X
      relStaleDays: 30,
      showReplies: true, // show reply count and author follower count in post badges
      showReplied: true, // mark posts the user already replied to
      showInbound: true, // show interactions from others in post badges
    },
    people: {}, // handle -> { likes, replies, last, in?: { likes, replies, quotes, mentions, last } }
    sent: [], // { t, text, kind: "reply" | "post", to }
    days: {}, // "YYYY-MM-DD" -> { likes, replies, posts, seconds }
    rel: {}, // handle (lowercase) -> { f: I follow them, fb: they follow me, id, n: display name, t: seen at }
    relMeta: {
      last: 0,
      scan: 0,
      me: { handle: null, followers: 0, id: null, t: 0 }, // handle, followers, id, t of the signed-in account
    },
    replied: {}, // postId -> timestamp
    inSeen: {}, // key -> timestamp
  };
  const PARTS = Object.keys(DEFAULTS);
  const MAX_REL = 30000;
  const MAX_SENT = 300;
  const MAX_REPLIED = 5000;
  const MAX_IN_SEEN = 20000;

  const keyOf = (part) => PREFIX + part;
  const partOf = (key) => (key.startsWith(PREFIX) && PARTS.includes(key.slice(PREFIX.length)) ? key.slice(PREFIX.length) : null);

  function dayKey(d = new Date()) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // ---------- validation ----------
  // Data reaches storage from three places the extension doesn't control: window events from the
  // page (any script on x.com can send them), import files, and older versions' data. Anything that
  // ends up in a link, a selector or a comparison is checked here first.

  const HANDLE = /^[A-Za-z0-9_]{1,15}$/;
  const ID = /^\d{1,20}$/;
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const INBOUND_KEY = /^(L:\d{1,20}:\d{1,20}|P:\d{1,20})$/; // L:<liker>:<post>, P:<post>
  const isHandle = (h) => typeof h === "string" && HANDLE.test(h);
  const isId = (id) => typeof id === "string" && ID.test(id);
  const isNonNegInt = (n) => typeof n === "number" && Number.isInteger(n) && n >= 0;
  const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  const num = (n, def = 0) => (typeof n === "number" && Number.isFinite(n) ? n : def);
  const str = (s, max) => (typeof s === "string" ? s.slice(0, max) : null);

  // Collapses "a\na\na" (from the nested composer bug) to "a". a must be non-empty.
  function untriple(text) {
    if (typeof text !== "string") return text;
    const rem = text.length - 2;
    if (rem < 3 || rem % 3 !== 0) return text;
    const len = rem / 3;
    const a = text.slice(0, len);
    return text === a + "\n" + a + "\n" + a ? a : text;
  }

  // The signed-in account in relMeta.me.
  function cleanMe(m) {
    if (!isObj(m)) return { ...DEFAULTS.relMeta.me };
    return {
      handle: isHandle(m.handle) ? m.handle : null,
      followers: isNonNegInt(m.followers) ? m.followers : 0,
      id: isId(m.id) ? m.id : null,
      t: num(m.t, 0),
    };
  }

  // Keep the newest MAX_REPLIED replied-to post ids.
  function capReplied(r) {
    const ids = Object.keys(r);
    if (ids.length <= MAX_REPLIED) return;
    ids.sort((a, b) => r[a] - r[b]).slice(0, ids.length - MAX_REPLIED).forEach((id) => delete r[id]);
  }

  // Keep the newest MAX_IN_SEEN counted inbound interaction keys.
  function capInSeen(seen) {
    const keys = Object.keys(seen);
    if (keys.length <= MAX_IN_SEEN) return;
    keys.sort((a, b) => seen[a] - seen[b]).slice(0, keys.length - MAX_IN_SEEN).forEach((k) => delete seen[k]);
  }

  function cleanInbound(v) {
    if (!isObj(v)) return null;
    return {
      likes: num(v.likes),
      replies: num(v.replies),
      quotes: num(v.quotes),
      mentions: num(v.mentions),
      last: num(v.last),
    };
  }

  // Each setting keeps the type of its default; a wrong type falls back to the default.
  function cleanSettings(v) {
    const def = DEFAULTS.settings;
    const out = { ...def };
    if (!isObj(v)) return out;
    for (const k of Object.keys(def)) {
      if (k === "targets") {
        if (Array.isArray(v.targets)) out.targets = v.targets.filter(isHandle);
      } else if (typeof def[k] === "number") {
        out[k] = num(v[k], def[k]);
      } else if (typeof v[k] === typeof def[k]) {
        out[k] = v[k];
      }
    }
    return out;
  }

  function cleanRelEntry(r) {
    if (!isObj(r)) return null;
    return { f: r.f === true, fb: r.fb === true, id: isId(r.id) ? r.id : null, n: str(r.n, 100), t: num(r.t) };
  }

  // A whole state object from an import file: drop what can't be right, keep the rest.
  function cleanState(data) {
    const s = isObj(data) ? data : {};
    const out = {
      settings: cleanSettings(s.settings),
      people: {},
      sent: [],
      days: {},
      rel: {},
      relMeta: { ...DEFAULTS.relMeta, me: { ...DEFAULTS.relMeta.me } },
      replied: {},
      inSeen: {},
    };
    for (const [h, p] of Object.entries(isObj(s.people) ? s.people : {})) {
      if (isHandle(h) && isObj(p)) {
        const entry = { likes: num(p.likes), replies: num(p.replies), last: num(p.last) };
        if (p.in != null) {
          const inbound = cleanInbound(p.in);
          if (inbound) entry.in = inbound;
        }
        out.people[h.toLowerCase()] = entry;
      }
    }
    for (const x of Array.isArray(s.sent) ? s.sent : []) {
      if (!isObj(x) || typeof x.text !== "string") continue;
      out.sent.push({ t: num(x.t), text: untriple(x.text), kind: x.kind === "reply" ? "reply" : "post", to: isHandle(x.to) ? x.to : null });
    }
    for (const [k, d] of Object.entries(isObj(s.days) ? s.days : {})) {
      if (!DAY.test(k) || !isObj(d)) continue;
      const day = {};
      for (const f of ["likes", "replies", "posts", "follows", "unfollows", "seconds"]) day[f] = num(d[f]);
      out.days[k] = day;
    }
    for (const [h, r] of Object.entries(isObj(s.rel) ? s.rel : {})) {
      const e = isHandle(h) && cleanRelEntry(r);
      if (e) out.rel[h.toLowerCase()] = e;
    }
    if (isObj(s.relMeta)) {
      out.relMeta = {
        last: num(s.relMeta.last),
        scan: num(s.relMeta.scan),
        me: cleanMe(s.relMeta.me),
      };
    }
    for (const [id, t] of Object.entries(isObj(s.replied) ? s.replied : {})) {
      if (isId(id)) out.replied[id] = num(t);
    }
    capReplied(out.replied);
    for (const [k, t] of Object.entries(isObj(s.inSeen) ? s.inSeen : {})) {
      if (typeof k === "string" && INBOUND_KEY.test(k)) out.inSeen[k] = num(t);
    }
    capInSeen(out.inSeen);
    return out;
  }

  // The "xh-relations" event from page-hook.js. Returns { u, v, f, c, at } with only well-formed entries,
  // or null. A script on x.com can still send believable data; it just can't send links or selectors.
  function cleanRelations(detail) {
    let p;
    try {
      p = JSON.parse(detail);
    } catch (_) {
      return null;
    }
    if (!isObj(p)) return null;
    const u = [];
    for (const x of Array.isArray(p.u) ? p.u : []) {
      if (!isObj(x) || !isHandle(x.handle)) continue;
      if (x.followers != null && !isNonNegInt(x.followers)) continue;
      const uEntry = {
        handle: x.handle,
        name: str(x.name, 100),
        id: isId(x.id) ? x.id : null,
        following: x.following === true,
        followedBy: x.followedBy === true,
      };
      if (isNonNegInt(x.followers)) uEntry.followers = x.followers;
      u.push(uEntry);
    }
    const v = [];
    for (const x of Array.isArray(p.v) ? p.v : []) {
      if (!isObj(x) || !isId(x.id)) continue;
      if (x.views != null && !isNonNegInt(x.views)) continue;
      if (x.replies != null && !isNonNegInt(x.replies)) continue;
      if (x.author != null && !isHandle(x.author)) continue;
      if (x.authorFollowers != null && !isNonNegInt(x.authorFollowers)) continue;
      if (x.inReplyTo != null && !isId(x.inReplyTo)) continue;

      const post = { id: x.id };
      if (isNonNegInt(x.views)) post.views = x.views;
      if (isNonNegInt(x.replies)) post.replies = x.replies;
      if (isHandle(x.author)) post.author = x.author;
      if (isNonNegInt(x.authorFollowers)) post.authorFollowers = x.authorFollowers;
      if (isId(x.inReplyTo)) post.inReplyTo = x.inReplyTo;
      v.push(post);
    }
    const f = (Array.isArray(p.f) ? p.f : [])
      .filter((x) => isObj(x) && isHandle(x.handle) && typeof x.on === "boolean")
      .map((x) => ({ handle: x.handle, name: str(x.name, 100), id: isId(x.id) ? x.id : null, on: x.on }));
    const c = [];
    for (const x of Array.isArray(p.c) ? p.c : []) {
      if (!isObj(x)) continue;
      if (x.seen === true) {
        c.push({ seen: true });
      } else if (x.ok === false) {
        c.push({ ok: false });
      } else if (x.shape === "unknown") {
        c.push({ shape: "unknown" });
      } else if (
        x.ok === true &&
        (x.kind === "reply" || x.kind === "post") &&
        typeof x.text === "string" &&
        x.text.length <= 25000 &&
        (x.to == null || isHandle(x.to)) &&
        (x.inReplyTo == null || isId(x.inReplyTo))
      ) {
        c.push({
          ok: true,
          kind: x.kind,
          text: x.text,
          to: isHandle(x.to) ? x.to : null,
          inReplyTo: isId(x.inReplyTo) ? x.inReplyTo : null,
        });
      }
    }
    const n = [];
    const INBOUND_KINDS = ["like", "reply", "quote", "mention"];
    for (const x of Array.isArray(p.n) ? p.n : []) {
      if (!isObj(x) || !INBOUND_KINDS.includes(x.kind)) continue;
      if (!isObj(x.from) || !isHandle(x.from.handle)) continue;
      if (typeof x.key !== "string" || !INBOUND_KEY.test(x.key)) continue;
      n.push({
        kind: x.kind,
        from: {
          handle: x.from.handle,
          id: isId(x.from.id) ? x.from.id : null,
          name: str(x.from.name, 100),
        },
        key: x.key,
        at: num(x.at, Date.now()),
      });
    }
    return { u, v, f, c, n, at: num(p.at, Date.now()) };
  }

  function partWithDefaults(part, v) {
    const def = DEFAULTS[part];
    if (Array.isArray(def)) return Array.isArray(v) ? v : [];
    if (part === "settings") return cleanSettings(v);
    if (part === "relMeta") {
      const r = isObj(v) ? v : {};
      return {
        ...def,
        ...r,
        me: cleanMe(r.me),
      };
    }
    return v || {};
  }

  function withDefaults(s) {
    s = s || {};
    const out = {};
    for (const part of PARTS) out[part] = partWithDefaults(part, s[part]);
    return out;
  }

  // Runs once per page, before any read or write.
  // v1 -> v2: split the single "xh" object into one key per part.
  // v2 -> v3: collapse tripled sent history entries.
  let migrated = null;
  function migrate() {
    return (migrated =
      migrated ||
      (async () => {
        const r = await chrome.storage.local.get([VERSION_KEY, LEGACY_KEY]);
        let v = r[VERSION_KEY] || 0;
        if (v >= VERSION) return;
        if (r[LEGACY_KEY]) {
          const old = withDefaults(r[LEGACY_KEY]);
          const out = { [VERSION_KEY]: 2 };
          for (const part of PARTS) out[keyOf(part)] = old[part];
          await chrome.storage.local.set(out);
          await chrome.storage.local.remove(LEGACY_KEY);
          v = 2;
        }
        if (v < 3) {
          const sr = await chrome.storage.local.get(keyOf("sent"));
          const out = { [VERSION_KEY]: 3 };
          if (Array.isArray(sr[keyOf("sent")])) {
            out[keyOf("sent")] = sr[keyOf("sent")].map((x) =>
              isObj(x) && typeof x.text === "string" ? { ...x, text: untriple(x.text) } : x
            );
          }
          await chrome.storage.local.set(out);
        }
      })());
  }

  async function read(parts) {
    await migrate();
    const r = await chrome.storage.local.get(parts.map(keyOf));
    const s = {};
    for (const part of parts) s[part] = partWithDefaults(part, r[keyOf(part)]);
    return s;
  }

  async function get() {
    return withDefaults(await read(PARTS));
  }

  // update(parts, fn): reads only `parts`, lets fn change them, writes only them back.
  // Touching a part that was not listed throws, so a missing name shows up in tests instead of losing data.
  // update(fn) without parts still works and rewrites everything; use it only where every part may change.
  // Writes are serialized within this page so quick clicks don't overwrite each other.
  let chain = Promise.resolve();
  function update(parts, fn) {
    if (typeof parts === "function") [parts, fn] = [PARTS, parts];
    const unknown = parts.filter((p) => !PARTS.includes(p));
    if (unknown.length) throw new Error(`store.update: unknown part ${unknown.join(", ")}`);
    const next = chain.then(async () => {
      const s = await read(parts);
      const guarded = new Proxy(s, {
        get(target, k) {
          if (PARTS.includes(k) && !parts.includes(k)) throw new Error(`store.update: "${k}" not in [${parts}]`);
          return target[k];
        },
      });
      fn(guarded);
      if (s.sent && s.sent.length > MAX_SENT) s.sent = s.sent.slice(-MAX_SENT);
      if (s.rel) {
        const handles = Object.keys(s.rel);
        if (handles.length > MAX_REL) {
          handles
            .sort((a, b) => s.rel[a].t - s.rel[b].t)
            .slice(0, handles.length - MAX_REL)
            .forEach((h) => delete s.rel[h]);
        }
      }
      if (s.replied) capReplied(s.replied);
      if (s.inSeen) capInSeen(s.inSeen);
      const out = {};
      for (const part of parts) out[keyOf(part)] = s[part];
      await chrome.storage.local.set(out);
      return s;
    });
    chain = next.catch(() => {}); // one failed update must not block the ones after it
    return next;
  }

  function today(s) {
    const k = dayKey();
    return (s.days[k] = s.days[k] || { likes: 0, replies: 0, posts: 0, follows: 0, unfollows: 0, seconds: 0 });
  }

  function person(s, handle) {
    const h = handle.toLowerCase();
    return (s.people[h] = s.people[h] || { likes: 0, replies: 0, last: 0 });
  }

  // cb gets the full state after any part changes, in this page or another one.
  function onChange(cb) {
    let state = null;
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area !== "local") return;
      const changed = Object.keys(changes).map(partOf).filter(Boolean);
      if (!changed.length) return;
      if (!state) state = await get();
      else for (const part of changed) state[part] = partWithDefaults(part, changes[keyOf(part)].newValue);
      cb(withDefaults(state));
    });
  }

  async function replaceAll(data) {
    await migrate();
    const s = cleanState(data);
    const out = { [VERSION_KEY]: VERSION };
    for (const part of PARTS) out[keyOf(part)] = s[part];
    await chrome.storage.local.set(out);
  }

  async function reset() {
    await chrome.storage.local.remove([...PARTS.map(keyOf), VERSION_KEY, LEGACY_KEY]);
  }

  XH.store = { PARTS, DEFAULTS, MAX_REPLIED, MAX_IN_SEEN, dayKey, get, update, today, person, onChange, replaceAll, reset, isHandle, isId, isNonNegInt, cleanRelations, untriple };
})();
