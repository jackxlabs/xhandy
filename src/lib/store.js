// All state lives in chrome.storage.local under one key. Nothing leaves the browser.
(function () {
  const XH = (globalThis.XH = globalThis.XH || {});
  const KEY = "xh";

  const DEFAULTS = {
    settings: {
      targets: [], // handles to highlight, without "@"
      staleHours: 48,
      dupThreshold: 0.6,
      dupWindow: 50, // compare against the last N sent texts
      repeatShort: 3, // warn when the same short text was sent this many times
      hud: true,
      dailyReplyGoal: 0, // 0 = no goal
      showRel: true, // follow relationship in post badges
      followLimit: 20, // soft daily follow limit: warn above this, never block
      relStaleDays: 30,
    },
    people: {}, // handle -> { likes, replies, last }
    sent: [], // { t, text, kind: "reply" | "post", to }
    days: {}, // "YYYY-MM-DD" -> { likes, replies, posts, seconds }
    rel: {}, // handle (lowercase) -> { f: I follow them, fb: they follow me, id, t: seen at }
    relMeta: { last: 0 }, // when relationships were last read from X's responses
  };
  const MAX_REL = 30000;
  const MAX_SENT = 300;

  function dayKey(d = new Date()) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function withDefaults(s) {
    s = s || {};
    return {
      settings: { ...DEFAULTS.settings, ...(s.settings || {}) },
      people: s.people || {},
      sent: s.sent || [],
      days: s.days || {},
      rel: s.rel || {},
      relMeta: { ...DEFAULTS.relMeta, ...(s.relMeta || {}) },
    };
  }

  async function get() {
    const r = await chrome.storage.local.get(KEY);
    return withDefaults(r[KEY]);
  }

  // Serialize read-modify-write within this page so quick clicks don't overwrite each other.
  let chain = Promise.resolve();
  function update(fn) {
    chain = chain.then(async () => {
      const s = await get();
      fn(s);
      if (s.sent.length > MAX_SENT) s.sent = s.sent.slice(-MAX_SENT);
      const handles = Object.keys(s.rel);
      if (handles.length > MAX_REL) {
        handles
          .sort((a, b) => s.rel[a].t - s.rel[b].t)
          .slice(0, handles.length - MAX_REL)
          .forEach((h) => delete s.rel[h]);
      }
      await chrome.storage.local.set({ [KEY]: s });
      return s;
    });
    return chain;
  }

  function today(s) {
    const k = dayKey();
    return (s.days[k] = s.days[k] || { likes: 0, replies: 0, posts: 0, follows: 0, seconds: 0 });
  }

  function person(s, handle) {
    const h = handle.toLowerCase();
    return (s.people[h] = s.people[h] || { likes: 0, replies: 0, last: 0 });
  }

  function onChange(cb) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[KEY]) cb(withDefaults(changes[KEY].newValue));
    });
  }

  async function replaceAll(data) {
    await chrome.storage.local.set({ [KEY]: withDefaults(data) });
  }

  async function reset() {
    await chrome.storage.local.remove(KEY);
  }

  XH.store = { KEY, DEFAULTS, dayKey, get, update, today, person, onChange, replaceAll, reset };
})();
