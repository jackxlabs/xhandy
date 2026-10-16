// All state lives in chrome.storage.local. Nothing leaves the browser.
// Each top-level part (settings, rel, ...) is its own key ("xh:rel"), so a write touches only the parts
// it changes: the 15-second time tick rewrites a few bytes of "xh:days", not 30,000 relationships.
(function () {
  const XH = (globalThis.XH = globalThis.XH || {});
  const PREFIX = "xh:";
  const VERSION_KEY = "xh:v";
  const VERSION = 2;
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
    },
    people: {}, // handle -> { likes, replies, last }
    sent: [], // { t, text, kind: "reply" | "post", to }
    days: {}, // "YYYY-MM-DD" -> { likes, replies, posts, seconds }
    rel: {}, // handle (lowercase) -> { f: I follow them, fb: they follow me, id, n: display name, t: seen at }
    relMeta: { last: 0, scan: 0 }, // last: relationships last read; scan: last read on your own Following page
  };
  const PARTS = Object.keys(DEFAULTS);
  const MAX_REL = 30000;
  const MAX_SENT = 300;

  const keyOf = (part) => PREFIX + part;
  const partOf = (key) => (key.startsWith(PREFIX) && PARTS.includes(key.slice(PREFIX.length)) ? key.slice(PREFIX.length) : null);

  function dayKey(d = new Date()) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function partWithDefaults(part, v) {
    const def = DEFAULTS[part];
    if (Array.isArray(def)) return Array.isArray(v) ? v : [];
    if (part === "settings" || part === "relMeta") return { ...def, ...(v || {}) };
    return v || {};
  }

  function withDefaults(s) {
    s = s || {};
    const out = {};
    for (const part of PARTS) out[part] = partWithDefaults(part, s[part]);
    return out;
  }

  // v1 -> v2: split the single "xh" object into one key per part. Runs once per page, before any read or write.
  let migrated = null;
  function migrate() {
    return (migrated =
      migrated ||
      (async () => {
        const r = await chrome.storage.local.get([VERSION_KEY, LEGACY_KEY]);
        if (r[VERSION_KEY] >= VERSION) return;
        const out = { [VERSION_KEY]: VERSION };
        if (r[LEGACY_KEY]) {
          const old = withDefaults(r[LEGACY_KEY]);
          for (const part of PARTS) out[keyOf(part)] = old[part];
        }
        await chrome.storage.local.set(out);
        if (r[LEGACY_KEY]) await chrome.storage.local.remove(LEGACY_KEY);
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
    const s = withDefaults(data);
    const out = { [VERSION_KEY]: VERSION };
    for (const part of PARTS) out[keyOf(part)] = s[part];
    await chrome.storage.local.set(out);
  }

  async function reset() {
    await chrome.storage.local.remove([...PARTS.map(keyOf), VERSION_KEY, LEGACY_KEY]);
  }

  XH.store = { PARTS, DEFAULTS, dayKey, get, update, today, person, onChange, replaceAll, reset };
})();
