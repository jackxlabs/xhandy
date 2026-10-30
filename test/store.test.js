const test = require("node:test");
const assert = require("node:assert");

// Minimal chrome.storage.local stand-in: records every set() so tests can see which keys were written.
function fakeChrome(initial = {}) {
  const data = structuredClone(initial);
  const writes = [];
  const listeners = [];
  const pick = (keys) => {
    const list = keys == null ? Object.keys(data) : [].concat(keys);
    return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, structuredClone(data[k])]));
  };
  const notify = (changes) => listeners.forEach((l) => l(changes, "local"));
  return {
    data,
    writes,
    storage: {
      local: {
        async get(keys) { return pick(keys); },
        async set(obj) {
          writes.push(Object.keys(obj));
          const changes = {};
          for (const [k, v] of Object.entries(obj)) {
            changes[k] = { oldValue: data[k], newValue: structuredClone(v) };
            data[k] = structuredClone(v);
          }
          notify(changes);
        },
        async remove(keys) {
          const changes = {};
          for (const k of [].concat(keys)) if (k in data) { changes[k] = { oldValue: data[k] }; delete data[k]; }
          notify(changes);
        },
      },
      onChanged: { addListener: (l) => listeners.push(l) },
    },
  };
}

// store.js is a browser script that attaches to globalThis.XH; load a fresh copy per test.
function loadStore(chrome) {
  globalThis.chrome = chrome;
  globalThis.XH = {};
  const path = require.resolve("../src/lib/store.js");
  delete require.cache[path];
  require(path);
  return globalThis.XH.store;
}

test("migrates the v1 single key into one key per part and removes it", async () => {
  const chrome = fakeChrome({ xh: { settings: { hud: false }, rel: { alice: { f: true, fb: true, t: 1 } }, days: { "2026-10-15": { likes: 3 } } } });
  const store = loadStore(chrome);
  const s = await store.get();
  assert.strictEqual(s.settings.hud, false);
  assert.strictEqual(s.settings.heatHot, 10000, "missing settings get defaults");
  assert.deepStrictEqual(s.rel.alice, { f: true, fb: true, t: 1, mAt: 1 });
  assert.strictEqual(s.days["2026-10-15"].likes, 3);
  assert.ok(!("xh" in chrome.data), "legacy key removed");
  assert.strictEqual(chrome.data["xh:v"], 5);
  assert.deepStrictEqual(chrome.data["xh:rel"], { alice: { f: true, fb: true, t: 1, mAt: 1 } });
  assert.deepStrictEqual(chrome.data["xh:keys"], {});
});

test("a fresh install starts from defaults", async () => {
  const store = loadStore(fakeChrome());
  const s = await store.get();
  assert.deepStrictEqual(s.rel, {});
  assert.deepStrictEqual(s.sent, []);
  assert.deepStrictEqual(s.keys, {});
  assert.deepStrictEqual(s.notes, {});
  assert.strictEqual(s.settings.followLimit, 20);
  assert.strictEqual(s.settings.lang, "auto");
  assert.strictEqual(s.settings.keyAccounts, true);
  assert.strictEqual(s.settings.quietDays, 14);
  assert.strictEqual(s.settings.topPosts, true);
  assert.strictEqual(s.settings.localNotes, true);
  assert.strictEqual(s.settings.hudRight, 16);
  assert.strictEqual(s.settings.hudBottom, 16);
});

test("update writes only the parts it declares", async () => {
  const chrome = fakeChrome({ "xh:v": 4, "xh:rel": { bob: { f: true, fb: false, t: 1 } } });
  const store = loadStore(chrome);
  await store.update(["days"], (s) => (store.today(s).seconds += 15));
  assert.deepStrictEqual(chrome.writes.at(-1), ["xh:days"]);
  assert.strictEqual(chrome.data["xh:days"][store.dayKey()].seconds, 15);
  assert.deepStrictEqual(chrome.data["xh:rel"], { bob: { f: true, fb: false, t: 1 } }, "rel untouched");
});

test("touching an undeclared part rejects and writes nothing", async () => {
  const chrome = fakeChrome({ "xh:v": 5 });
  const store = loadStore(chrome);
  await assert.rejects(store.update(["days"], (s) => (s.rel.x = {})), /"rel" not in/);
  assert.strictEqual(chrome.writes.length, 0);
  await store.update(["days"], (s) => store.today(s).likes++); // later updates still run
  assert.strictEqual(chrome.data["xh:days"][store.dayKey()].likes, 1);
});

test("sent is capped at the last 300 entries", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);
  await store.update(["sent"], (s) => { for (let i = 0; i < 305; i++) s.sent.push({ t: i, text: "x" + i }); });
  assert.strictEqual(chrome.data["xh:sent"].length, 300);
  assert.strictEqual(chrome.data["xh:sent"][0].t, 5);
});

test("onChange delivers the full state with the changed part merged in", async () => {
  const chrome = fakeChrome({ "xh:v": 4, "xh:settings": { hud: false } });
  const store = loadStore(chrome);
  const seen = [];
  store.onChange((s) => seen.push(s));
  await store.update(["relMeta"], (s) => (s.relMeta.last = 42));
  await new Promise((r) => setTimeout(r, 0));
  await store.update(["days"], (s) => store.today(s).likes++);
  await new Promise((r) => setTimeout(r, 0));
  const last = seen.at(-1);
  assert.strictEqual(last.relMeta.last, 42);
  assert.strictEqual(last.days[store.dayKey()].likes, 1);
  assert.strictEqual(last.settings.hud, false, "unchanged parts kept");
});

test("export format round-trips through replaceAll, and reset clears everything", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);
  await store.replaceAll({ keys: { alice: { h: "Alice", t: 100 } }, people: { alice: { likes: 2, replies: 0, last: 1 } } });
  const s = await store.get();
  assert.deepStrictEqual(s.keys, { alice: { h: "Alice", t: 100 } });
  assert.strictEqual(s.people.alice.likes, 2);
  await store.reset();
  assert.deepStrictEqual(Object.keys(chrome.data), []);
});

test("settings of the wrong type fall back to defaults", async () => {
  const chrome = fakeChrome({ "xh:v": 4, "xh:settings": { keyAccounts: "alice", quietDays: "12", topPosts: 123, staleHours: "12", hud: 0, heatHot: 5 } });
  const s = await loadStore(chrome).get();
  assert.strictEqual(s.settings.keyAccounts, true);
  assert.strictEqual(s.settings.quietDays, 14);
  assert.strictEqual(s.settings.topPosts, true);
  assert.strictEqual(s.settings.targets, undefined);
  assert.strictEqual(s.settings.staleHours, 48);
  assert.strictEqual(s.settings.hud, true);
  assert.strictEqual(s.settings.heatHot, 5, "valid values kept");
});

test("replaceAll drops what can't be right in an import file", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);
  await store.replaceAll({
    settings: { targets: ["alice", "/evil.com", 3], followLimit: null },
    rel: {
      "/evil.com": { f: true, fb: false, t: 1 },
      Bob: { f: true, fb: "yes", id: '1"]', n: 7, t: 2 },
      carol: "x",
    },
    people: { "a b": { likes: 1 }, dan: { likes: "2", replies: 1, last: 3 } },
    sent: [{ t: 1, text: "hi", kind: "reply", to: "//x" }, { t: 2 }, "junk"],
    days: { "2026-10-16": { likes: 2, seconds: "9" }, nope: { likes: 1 } },
    relMeta: { last: 5, scan: "x" },
  });
  const s = await store.get();
  assert.strictEqual(s.settings.targets, undefined);
  assert.strictEqual(s.keys.alice.h, "alice");
  assert.ok(typeof s.keys.alice.t === "number");
  assert.strictEqual(s.settings.followLimit, 20);
  assert.strictEqual(s.settings.lang, "auto");
  assert.deepStrictEqual(s.rel, { bob: { f: true, fb: false, id: null, n: null, t: 2 } });
  assert.deepStrictEqual(s.people, { dan: { likes: 0, replies: 1, last: 3 } });
  assert.deepStrictEqual(s.sent, [{ t: 1, text: "hi", kind: "reply", to: null }]);
  assert.deepStrictEqual(s.days, { "2026-10-16": { likes: 2, replies: 0, posts: 0, follows: 0, unfollows: 0, seconds: 0 } });
  assert.deepStrictEqual(s.relMeta, { last: 5, scan: 0, me: { handle: null, followers: 0, id: null, t: 0 } });
  assert.deepStrictEqual(s.replied, {});
  assert.deepStrictEqual(s.pace, { follows: [], unfollows: [] });
});

test("handles that are Object.prototype names are not handles, so imports can't reach the prototype", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);
  for (const h of ["__proto__", "constructor", "Constructor", "prototype"]) assert.strictEqual(store.isHandle(h), false, h);
  assert.strictEqual(store.isHandle("construct"), true);
  await store.replaceAll(JSON.parse('{"people":{"__proto__":{"likes":5},"constructor":{"likes":1},"dan":{"likes":2}},' +
    '"keys":{"__proto__":{"h":"x","t":1}},"rel":{"constructor":{"f":true,"fb":false,"t":1}}}'));
  const s = await store.get();
  assert.deepStrictEqual(Object.keys(s.people), ["dan"]);
  assert.strictEqual(Object.getPrototypeOf(s.people), Object.prototype);
  assert.deepStrictEqual(s.keys, {});
  assert.deepStrictEqual(s.rel, {});
});

test("an import file can't exceed the limits that everyday writes keep", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);
  const sent = Array.from({ length: 350 }, (_, i) => ({ t: i, text: "post " + i, kind: "post" }));
  sent.push({ t: 999, text: "x".repeat(25001), kind: "post" });
  const rel = {};
  for (let i = 0; i < 30005; i++) rel["u" + i] = { f: true, fb: false, t: i };
  await store.replaceAll({ sent, rel });
  const s = await store.get();
  assert.strictEqual(s.sent.length, 300);
  assert.strictEqual(s.sent[299].text, "post 349");
  assert.strictEqual(Object.keys(s.rel).length, 30000);
  assert.strictEqual(s.rel.u0, undefined);
  assert.ok(s.rel.u30004);
});

test("cleanRelations keeps only well-formed users and view counts", () => {
  const store = loadStore(fakeChrome());
  const r = store.cleanRelations(JSON.stringify({
    u: [
      { handle: "alice", name: "Alice", id: "1", following: true, followedBy: true },
      { handle: "/evil.com", following: true },
      { handle: "bob", id: '2"], a', following: "true" },
      { handle: { toLowerCase: 1 } },
    ],
    v: [{ id: "10", views: 5 }, { id: "x", views: 1 }, { id: "11", views: "9" }, { id: "12", views: -1 }],
    at: 7,
  }));
  assert.deepStrictEqual(r, {
    u: [
      { handle: "alice", name: "Alice", id: "1", following: true, followedBy: true },
      { handle: "bob", name: null, id: null },
    ],
    v: [{ id: "10", views: 5 }],
    f: [],
    c: [],
    n: [],
    at: 7,
  });
  const empty = store.cleanRelations('{"x":1}');
  assert.deepStrictEqual(empty, { u: [], v: [], f: [], c: [], n: [], at: empty.at });
  const f = store.cleanRelations(JSON.stringify({ f: [
    { handle: "carol", name: "Carol", id: "3", on: true },
    { handle: "zed", on: false },
    { handle: "/evil.com", on: true },
    { handle: "dan", on: "true" },
  ] })).f;
  assert.deepStrictEqual(f, [
    { handle: "carol", name: "Carol", id: "3", on: true },
    { handle: "zed", name: null, id: null, on: false },
  ]);
  assert.strictEqual(store.cleanRelations("not json"), null);
  assert.strictEqual(store.cleanRelations("[1]"), null);
});

test("cleanRelations validates confirmation entries in c", () => {
  const store = loadStore(fakeChrome());
  const maxText = "a".repeat(25000);
  const tooLong = "a".repeat(25001);
  const r = store.cleanRelations(JSON.stringify({
    c: [
      { seen: true, extraField: "strip" },
      { ok: false, junk: 123 },
      { shape: "unknown", foo: "bar" },
      { ok: true, kind: "reply", text: "nice idea", to: "alice", unknownProp: 42 },
      { ok: true, kind: "post", text: maxText, to: null },
      { ok: true, kind: "reply", text: "got id", to: "bob", inReplyTo: "1001" },
      { ok: true, kind: "reply", text: "bad id", to: "bob", inReplyTo: "not-an-id" }, // malformed inReplyTo dropped
      { ok: true, kind: "post", text: tooLong, to: null }, // over 25,000 chars dropped
      { ok: true, kind: "post", text: 123, to: null }, // non-string text dropped
      { ok: true, kind: "reply", text: "hi", to: "/invalid handle" }, // invalid handle dropped
      { ok: true, kind: "reply", text: "hi", to: "has space" }, // invalid handle dropped
      { ok: true, kind: "invalid_kind", text: "hi", to: null }, // invalid kind dropped
      { junkEntry: true }, // unknown entry dropped
      null, // non-object dropped
      "a string", // non-object dropped
    ],
    at: 10,
  }));
  assert.deepStrictEqual(r.c, [
    { seen: true },
    { ok: false },
    { shape: "unknown" },
    { ok: true, kind: "reply", text: "nice idea", to: "alice", inReplyTo: null },
    { ok: true, kind: "post", text: maxText, to: null, inReplyTo: null },
    { ok: true, kind: "reply", text: "got id", to: "bob", inReplyTo: "1001" },
  ]);
});

test("cleanRelations validates new post fields and user followers", () => {
  const store = loadStore(fakeChrome());

  // 1. Valid fields
  const valid = store.cleanRelations(
    JSON.stringify({
      u: [
        { handle: "alice", name: "Alice", id: "1", following: true, followedBy: true, followers: 46000 },
        { handle: "bob", followers: 0 },
      ],
      v: [
        { id: "100", views: 15000, replies: 23, author: "alice", authorFollowers: 46000, inReplyTo: "90" },
        { id: "101", views: 0, replies: 0, author: "bob", authorFollowers: 0 },
        { id: "102", replies: 5, author: "carol" },
        { id: "103" },
      ],
      at: 100,
    })
  );

  assert.deepStrictEqual(valid.u, [
    { handle: "alice", name: "Alice", id: "1", following: true, followedBy: true, followers: 46000 },
    { handle: "bob", name: null, id: null, followers: 0 },
  ]);

  assert.deepStrictEqual(valid.v, [
    { id: "100", views: 15000, replies: 23, author: "alice", authorFollowers: 46000, inReplyTo: "90" },
    { id: "101", views: 0, replies: 0, author: "bob", authorFollowers: 0 },
    { id: "102", replies: 5, author: "carol" },
    { id: "103" },
  ]);

  // 2. Malformed fields are rejected/dropped
  const malformed = store.cleanRelations(
    JSON.stringify({
      u: [
        { handle: "bad_f1", followers: -1 },
        { handle: "bad_f2", followers: 10.5 },
        { handle: "bad_f3", followers: "500" },
        { handle: "good_user", followers: 100 },
      ],
      v: [
        { id: "201", replies: -1 },
        { id: "202", replies: "10" },
        { id: "203", replies: 2.5 },
        { id: "204", author: "/invalid handle" },
        { id: "205", author: "author_handle_too_long_for_x" },
        { id: "206", author: 123 },
        { id: "207", authorFollowers: -10 },
        { id: "208", authorFollowers: "46000" },
        { id: "209", authorFollowers: 1.2 },
        { id: "210", inReplyTo: "not an id" },
        { id: "211", inReplyTo: 12345 },
        { id: "invalid_id", replies: 5 },
        { id: "212", views: 100, unknownExtra: "stripMe" },
      ],
      at: 200,
    })
  );

  assert.deepStrictEqual(malformed.u, [
    { handle: "good_user", name: null, id: null, followers: 100 },
  ]);

  assert.deepStrictEqual(malformed.v, [
    { id: "212", views: 100 },
  ]);
});

test("cleanRelations validates inbound candidates n", () => {
  const store = loadStore(fakeChrome());

  // 1. Valid candidates
  const valid = store.cleanRelations(
    JSON.stringify({
      n: [
        {
          kind: "like",
          from: { handle: "liker_bob", id: "102", name: "Bob Liker" },
          key: "L:102:501",
          at: 1760000001000,
        },
        {
          kind: "reply",
          from: { handle: "replier_frank", id: "106", name: "Frank Replier" },
          key: "P:601",
          at: 1760000002000,
        },
        {
          kind: "quote",
          from: { handle: "quoter_carol", id: null, name: null },
          key: "P:602",
          at: 1760000003000,
        },
        {
          kind: "mention",
          from: { handle: "mentioner_dan", id: "108" },
          key: "P:603",
          at: 1760000004000,
        },
      ],
      at: 100,
    })
  );

  assert.deepStrictEqual(valid.n, [
    {
      kind: "like",
      from: { handle: "liker_bob", id: "102", name: "Bob Liker" },
      key: "L:102:501",
      at: 1760000001000,
    },
    {
      kind: "reply",
      from: { handle: "replier_frank", id: "106", name: "Frank Replier" },
      key: "P:601",
      at: 1760000002000,
    },
    {
      kind: "quote",
      from: { handle: "quoter_carol", id: null, name: null },
      key: "P:602",
      at: 1760000003000,
    },
    {
      kind: "mention",
      from: { handle: "mentioner_dan", id: "108", name: null },
      key: "P:603",
      at: 1760000004000,
    },
  ]);

  // 2. Malformed candidates are dropped or sanitized
  const malformed = store.cleanRelations(
    JSON.stringify({
      n: [
        null, // non-object dropped
        "string entry", // non-object dropped
        { kind: "unknown_kind", from: { handle: "alice" }, key: "P:100" }, // invalid kind dropped
        { kind: "like" }, // missing from dropped
        { kind: "like", from: "not an object", key: "L:1:2" }, // from not object dropped
        { kind: "like", from: { handle: "invalid/handle" }, key: "L:1:2" }, // invalid handle dropped
        { kind: "like", from: { handle: "handle_is_too_long_for_x" }, key: "L:1:2" }, // handle too long dropped
        { kind: "like", from: { handle: "bob" }, key: "bad_key" }, // key without L:/P: prefix dropped
        { kind: "like", from: { handle: "bob" }, key: "X:100" }, // wrong prefix dropped
        { kind: "like", from: { handle: "bob" }, key: "P:" }, // empty id dropped
        { kind: "like", from: { handle: "bob" }, key: "P:abc" }, // non-numeric id dropped
        { kind: "like", from: { handle: "bob" }, key: "P:123456789012345678901" }, // >20 digits dropped
        {
          kind: "reply",
          from: {
            handle: "good_user",
            id: "not_a_valid_id", // invalid id sanitized to null
            name: "A".repeat(150), // long name truncated to 100
          },
          key: "P:999",
          at: "not a number", // fallback to Date.now
        },
      ],
      at: 200,
    })
  );

  assert.strictEqual(malformed.n.length, 1);
  assert.strictEqual(malformed.n[0].kind, "reply");
  assert.strictEqual(malformed.n[0].from.handle, "good_user");
  assert.strictEqual(malformed.n[0].from.id, null);
  assert.strictEqual(malformed.n[0].from.name, "A".repeat(100));
  assert.strictEqual(malformed.n[0].key, "P:999");
  assert.ok(typeof malformed.n[0].at === "number");
});

test("untriple collapses three identical copies and keeps non-triples", () => {
  const store = loadStore(fakeChrome());
  assert.strictEqual(store.untriple("hello\nhello\nhello"), "hello", "simple triple collapses");
  assert.strictEqual(store.untriple("a\na\na"), "a", "single character triple collapses");
  assert.strictEqual(store.untriple("multi\nline\nmulti\nline\nmulti\nline"), "multi\nline", "multi-line triple collapses");
  assert.strictEqual(store.untriple("你好\n你好\n你好"), "你好", "Chinese triple collapses");
  assert.strictEqual(store.untriple("hello\nhello"), "hello\nhello", "two copies stay");
  assert.strictEqual(store.untriple("好\n好"), "好\n好", "two Chinese characters stay");
  assert.strictEqual(store.untriple("hello\nworld\nhello"), "hello\nworld\nhello", "differing copies stay");
  assert.strictEqual(store.untriple("a\nb\nc"), "a\nb\nc", "three different lines stay");
  assert.strictEqual(store.untriple(""), "", "empty text stays");
  assert.strictEqual(store.untriple("\n\n"), "\n\n", "empty a does not collapse");
  assert.strictEqual(store.untriple("just a line"), "just a line", "single line stays");
  assert.strictEqual(store.untriple(null), null, "non-string passes through");
});

test("migrates v2 store with tripled entries to v3 with one copy each", async () => {
  const chrome = fakeChrome({
    "xh:v": 2,
    "xh:sent": [
      { t: 100, text: "Great idea!\nGreat idea!\nGreat idea!", kind: "reply", to: "alice" },
      { t: 200, text: "two copies\ntwo copies", kind: "reply", to: "bob" },
      { t: 300, text: "a\nb\nc", kind: "post", to: null },
      { t: 400, text: "Short\nShort\nShort", kind: "post", to: null },
    ],
  });
  const store = loadStore(chrome);
  const s = await store.get();
  assert.strictEqual(chrome.data["xh:v"], 5);
  assert.strictEqual(s.sent.length, 4, "entry count is unchanged");
  assert.deepStrictEqual(s.sent[0], { t: 100, text: "Great idea!", kind: "reply", to: "alice" });
  assert.deepStrictEqual(s.sent[1], { t: 200, text: "two copies\ntwo copies", kind: "reply", to: "bob" });
  assert.deepStrictEqual(s.sent[2], { t: 300, text: "a\nb\nc", kind: "post", to: null });
  assert.deepStrictEqual(s.sent[3], { t: 400, text: "Short", kind: "post", to: null });
  assert.deepStrictEqual(chrome.data["xh:sent"], s.sent);
});

test("a v1 store migrates through all steps (v1 -> v2 -> v3 -> v4 -> v5)", async () => {
  const chrome = fakeChrome({
    xh: {
      settings: { hud: false },
      sent: [
        { t: 1, text: "tripled\ntripled\ntripled", kind: "reply", to: "alice" },
        { t: 2, text: "two\ntwo", kind: "post", to: null },
      ],
      rel: { alice: { f: true, fb: true, t: 1 } },
      days: { "2026-10-15": { likes: 3 } },
    },
  });
  const store = loadStore(chrome);
  const s = await store.get();
  assert.ok(!("xh" in chrome.data), "legacy key removed");
  assert.strictEqual(chrome.data["xh:v"], 5);
  assert.deepStrictEqual(s.sent, [
    { t: 1, text: "tripled", kind: "reply", to: "alice" },
    { t: 2, text: "two\ntwo", kind: "post", to: null },
  ]);
  assert.deepStrictEqual(chrome.data["xh:sent"], s.sent);
  assert.deepStrictEqual(s.rel.alice, { f: true, fb: true, t: 1, mAt: 1 });
  assert.strictEqual(s.settings.hud, false);
  assert.strictEqual(s.days["2026-10-15"].likes, 3);
  assert.deepStrictEqual(s.keys, {});
});

test("replaceAll cleans tripled entries when importing an old export file", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);
  await store.replaceAll({
    sent: [
      { t: 1, text: "replying\nreplying\nreplying", kind: "reply", to: "alice" },
      { t: 2, text: "stay\nstay", kind: "reply", to: "bob" },
      { t: 3, text: "three\ndifferent\nlines", kind: "post" },
      { t: 4, text: "", kind: "post" },
    ],
  });
  const s = await store.get();
  assert.deepStrictEqual(s.sent, [
    { t: 1, text: "replying", kind: "reply", to: "alice" },
    { t: 2, text: "stay\nstay", kind: "reply", to: "bob" },
    { t: 3, text: "three\ndifferent\nlines", kind: "post", to: null },
    { t: 4, text: "", kind: "post", to: null },
  ]);
});

test("replied part caps at 5,000 entries dropping the oldest timestamps", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  // 1. In cleanState / replaceAll:
  const overflow = {};
  for (let i = 1; i <= 5005; i++) {
    overflow[String(i)] = i * 10; // id: "1" has t: 10 (oldest), id: "5005" has t: 50050 (newest)
  }
  await store.replaceAll({ replied: overflow });
  const s1 = await store.get();
  assert.strictEqual(Object.keys(s1.replied).length, 5000);
  assert.strictEqual(s1.replied["1"], undefined, "oldest id 1 dropped");
  assert.strictEqual(s1.replied["5"], undefined, "oldest id 5 dropped");
  assert.strictEqual(s1.replied["6"], 60, "id 6 kept");
  assert.strictEqual(s1.replied["5005"], 50050, "newest id 5005 kept");

  // 2. In store.update:
  await store.update(["replied"], (s) => {
    s.replied["99999"] = 999990;
  });
  const s2 = await store.get();
  assert.strictEqual(Object.keys(s2.replied).length, 5000);
  assert.strictEqual(s2.replied["6"], undefined, "oldest id 6 dropped after update overflow");
  assert.strictEqual(s2.replied["99999"], 999990, "new entry kept");
});

test("cleanState drops malformed replied ids and old exports import with empty set", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  // 1. Old export without replied field
  await store.replaceAll({
    settings: {},
    sent: [],
  });
  const s1 = await store.get();
  assert.deepStrictEqual(s1.replied, {}, "old export gets empty replied default");

  // 2. Malformed ids dropped
  await store.replaceAll({
    replied: {
      "12345": 100,
      "67890": 200,
      "not-an-id": 300,
      "/evil.com": 400,
      "123_456": 500,
      "": 600,
      "99999999999999999999": 700, // 20 digits valid ID
      "999999999999999999999": 800, // 21 digits (>20) dropped
    },
  });
  const s2 = await store.get();
  assert.deepStrictEqual(s2.replied, {
    "12345": 100,
    "67890": 200,
    "99999999999999999999": 700,
  });
});

test("relMeta.me defaults safely and cleanState validates its fields", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  // 1. Fresh state has defaults
  const fresh = await store.get();
  assert.deepStrictEqual(fresh.relMeta.me, { handle: null, followers: 0, id: null, t: 0 });

  // 2. Valid me data preserved
  await store.replaceAll({
    relMeta: {
      last: 10,
      scan: 5,
      me: { handle: "alice_dev", followers: 46000, id: "1001", t: 123456 },
    },
  });
  const s1 = await store.get();
  assert.deepStrictEqual(s1.relMeta.me, {
    handle: "alice_dev",
    followers: 46000,
    id: "1001",
    t: 123456,
  });

  // 3. Malformed me fields fall back to safe defaults
  await store.replaceAll({
    relMeta: {
      me: {
        handle: "bad handle with spaces",
        followers: -50,
        id: "not_an_id",
        t: "bad_time",
      },
    },
  });
  const s2 = await store.get();
  assert.deepStrictEqual(s2.relMeta.me, {
    handle: null,
    followers: 0,
    id: null,
    t: 0,
  });

  // 4. Missing me in relMeta gets default me
  await store.replaceAll({
    relMeta: { last: 20 },
  });
  const s3 = await store.get();
  assert.strictEqual(s3.relMeta.last, 20);
  assert.deepStrictEqual(s3.relMeta.me, { handle: null, followers: 0, id: null, t: 0 });
});

test("reset and replaceAll include replied part", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  await store.update(["replied"], (s) => {
    s.replied["111"] = 1000;
  });
  assert.deepStrictEqual(chrome.data["xh:replied"], { "111": 1000 });

  // reset clears replied
  await store.reset();
  assert.strictEqual(chrome.data["xh:replied"], undefined);
  const fresh = await store.get();
  assert.deepStrictEqual(fresh.replied, {});

  // replaceAll writes replied
  await store.replaceAll({ replied: { "222": 2000 } });
  assert.deepStrictEqual(chrome.data["xh:replied"], { "222": 2000 });
});

test("settings showReplies and showReplied default to true and can be saved", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  const fresh = await store.get();
  assert.strictEqual(fresh.settings.showReplies, true);
  assert.strictEqual(fresh.settings.showReplied, true);

  await store.update(["settings"], (s) => {
    s.settings.showReplies = false;
    s.settings.showReplied = false;
  });
  const updated = await store.get();
  assert.strictEqual(updated.settings.showReplies, false);
  assert.strictEqual(updated.settings.showReplied, false);

  // cleanSettings keeps boolean type, malformed values fall back to defaults
  await store.replaceAll({
    settings: {
      showReplies: "invalid",
      showReplied: null,
    },
  });
  const cleaned = await store.get();
  assert.strictEqual(cleaned.settings.showReplies, true);
  assert.strictEqual(cleaned.settings.showReplied, true);
});

test("capInSeen keeps at most 20,000 entries, dropping the oldest", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  // 1. Through cleanState / replaceAll:
  const overflow = {};
  for (let i = 1; i <= 20005; i++) overflow[`P:${i}`] = i * 10;
  await store.replaceAll({ inSeen: overflow });

  const s1 = await store.get();
  assert.strictEqual(Object.keys(s1.inSeen).length, 20000);
  assert.strictEqual(s1.inSeen["P:1"], undefined, "oldest key P:1 dropped");
  assert.strictEqual(s1.inSeen["P:5"], undefined, "oldest key P:5 dropped");
  assert.strictEqual(s1.inSeen["P:6"], 60, "key P:6 kept");
  assert.strictEqual(s1.inSeen["P:20005"], 200050, "newest key kept");

  // 2. In store.update:
  await store.update(["inSeen"], (s) => {
    s.inSeen["L:99:88"] = 999990;
  });
  const s2 = await store.get();
  assert.strictEqual(Object.keys(s2.inSeen).length, 20000);
  assert.strictEqual(s2.inSeen["P:6"], undefined, "oldest key P:6 dropped after update overflow");
  assert.strictEqual(s2.inSeen["L:99:88"], 999990, "new entry kept");
});

test("cleanState handles people[h].in, drops malformed, and imports old exports", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  // 1. Old export without inSeen and without in field
  await store.replaceAll({
    settings: {},
    people: {
      alice: { likes: 3, replies: 1, last: 100 },
    },
  });
  const s1 = await store.get();
  assert.deepStrictEqual(s1.inSeen, {}, "old export gets empty inSeen default");
  assert.strictEqual("in" in s1.people.alice, false, "old export has absent in field, not zeros");
  assert.strictEqual(s1.people.alice.likes, 3);

  // 2. Valid people[h].in preserved
  await store.replaceAll({
    people: {
      bob: {
        likes: 1,
        replies: 2,
        last: 50,
        in: { likes: 4, replies: 1, quotes: 2, mentions: 3, last: 150 },
      },
    },
    inSeen: {
      "P:101": 500,
      "L:201:301": 600,
    },
  });
  const s2 = await store.get();
  assert.deepStrictEqual(s2.people.bob.in, {
    likes: 4,
    replies: 1,
    quotes: 2,
    mentions: 3,
    last: 150,
  });
  assert.deepStrictEqual(s2.inSeen, {
    "P:101": 500,
    "L:201:301": 600,
  });

  // 3. Malformed people[h].in and malformed inSeen dropped
  await store.replaceAll({
    people: {
      carol: {
        likes: 0,
        replies: 0,
        last: 0,
        in: "not an object", // non-object dropped
      },
      dan: {
        likes: 0,
        replies: 0,
        last: 0,
        in: [1, 2, 3], // array dropped
      },
      eve: {
        likes: 0,
        replies: 0,
        last: 0,
        in: { likes: "bad", replies: null, quotes: undefined, mentions: -1, last: "time" },
      },
    },
    inSeen: {
      "not_a_key": 100,
      "P:": 200,
      "P:abc": 300,
      "L:1": 400,
      "X:1:2": 500,
      "P:123456789012345678901": 600, // 21 digits dropped
      "P:12345678901234567890": 700, // 20 digits kept
    },
  });
  const s3 = await store.get();
  assert.strictEqual("in" in s3.people.carol, false);
  assert.strictEqual("in" in s3.people.dan, false);
  assert.deepStrictEqual(s3.people.eve.in, {
    likes: 0,
    replies: 0,
    quotes: 0,
    mentions: -1,
    last: 0,
  });
  assert.deepStrictEqual(s3.inSeen, {
    "P:12345678901234567890": 700,
  });
});

test("reset and replaceAll include inSeen part", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  await store.update(["inSeen"], (s) => {
    s.inSeen["P:111"] = 1000;
  });
  assert.deepStrictEqual(chrome.data["xh:inSeen"], { "P:111": 1000 });

  // reset clears inSeen
  await store.reset();
  assert.strictEqual(chrome.data["xh:inSeen"], undefined);
  const fresh = await store.get();
  assert.deepStrictEqual(fresh.inSeen, {});

  // replaceAll writes inSeen
  await store.replaceAll({ inSeen: { "L:2:3": 2000 } });
  assert.deepStrictEqual(chrome.data["xh:inSeen"], { "L:2:3": 2000 });
});

test("setting showInbound defaults to true and can be saved", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  const fresh = await store.get();
  assert.strictEqual(fresh.settings.showInbound, true);

  await store.update(["settings"], (s) => {
    s.settings.showInbound = false;
  });
  const updated = await store.get();
  assert.strictEqual(updated.settings.showInbound, false);

  await store.replaceAll({
    settings: { showInbound: true },
  });
  const cleaned = await store.get();
  assert.strictEqual(cleaned.settings.showInbound, true);
});

test("old v3 settings without new feature switches and pace limits load with defaults and migrate targets", async () => {
  const chrome = fakeChrome({
    "xh:v": 3,
    "xh:settings": {
      targets: ["bob"],
      hud: false,
      followLimit: 25,
      // showAge, showSeen, dupWarn, followWarn, followPace, unfollowPace, paceMinutes, keyAccounts, quietDays omitted
    },
  });
  const store = loadStore(chrome);
  const s = await store.get();

  // Preserves existing settings and migrates targets to keys
  assert.strictEqual(s.settings.targets, undefined);
  assert.strictEqual(s.keys.bob.h, "bob");
  assert.ok(typeof s.keys.bob.t === "number");
  assert.strictEqual(s.settings.hud, false);
  assert.strictEqual(s.settings.followLimit, 25);

  // Missing keys get defaults
  assert.strictEqual(s.settings.showAge, true);
  assert.strictEqual(s.settings.showSeen, true);
  assert.strictEqual(s.settings.dupWarn, true);
  assert.strictEqual(s.settings.followWarn, true);
  assert.strictEqual(s.settings.followPace, 10);
  assert.strictEqual(s.settings.unfollowPace, 10);
  assert.strictEqual(s.settings.paceMinutes, 60);
  assert.strictEqual(s.settings.keyAccounts, true);
  assert.strictEqual(s.settings.quietDays, 14);

  // Can be updated and saved
  await store.update(["settings"], (st) => {
    st.settings.showAge = false;
    st.settings.showSeen = false;
    st.settings.dupWarn = false;
    st.settings.followWarn = false;
    st.settings.followPace = 15;
    st.settings.unfollowPace = 20;
    st.settings.paceMinutes = 30;
    st.settings.keyAccounts = false;
    st.settings.quietDays = 7;
  });
  const updated = await store.get();
  assert.strictEqual(updated.settings.showAge, false);
  assert.strictEqual(updated.settings.showSeen, false);
  assert.strictEqual(updated.settings.dupWarn, false);
  assert.strictEqual(updated.settings.followWarn, false);
  assert.strictEqual(updated.settings.followPace, 15);
  assert.strictEqual(updated.settings.unfollowPace, 20);
  assert.strictEqual(updated.settings.paceMinutes, 30);
  assert.strictEqual(updated.settings.keyAccounts, false);
  assert.strictEqual(updated.settings.quietDays, 7);

  // cleanSettings / replaceAll validates types and falls back to defaults for bad values
  await store.replaceAll({
    settings: {
      showAge: "no",
      showSeen: 123,
      dupWarn: null,
      followWarn: {},
      followPace: "fast",
      unfollowPace: NaN,
      paceMinutes: -Infinity,
      keyAccounts: "invalid",
      quietDays: null,
    },
  });
  const cleaned = await store.get();
  assert.strictEqual(cleaned.settings.showAge, true);
  assert.strictEqual(cleaned.settings.showSeen, true);
  assert.strictEqual(cleaned.settings.dupWarn, true);
  assert.strictEqual(cleaned.settings.followWarn, true);
  assert.strictEqual(cleaned.settings.followPace, 10);
  assert.strictEqual(cleaned.settings.unfollowPace, 10);
  assert.strictEqual(cleaned.settings.paceMinutes, 60);
  assert.strictEqual(cleaned.settings.keyAccounts, true);
  assert.strictEqual(cleaned.settings.quietDays, 14);
});

test("cleanState validates pace part, drops malformed data, and caps at newest 100", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  // 1. Old export without pace field imports with empty lists
  await store.replaceAll({
    settings: {},
    sent: [],
  });
  const s1 = await store.get();
  assert.deepStrictEqual(s1.pace, { follows: [], unfollows: [] });

  // 2. Non-object pace or non-array fields fall back to empty lists
  await store.replaceAll({ pace: "not an object" });
  assert.deepStrictEqual((await store.get()).pace, { follows: [], unfollows: [] });

  await store.replaceAll({ pace: { follows: "not an array", unfollows: 123 } });
  assert.deepStrictEqual((await store.get()).pace, { follows: [], unfollows: [] });

  // 3. Drops negative numbers, non-numbers, NaN, Infinity, and sorts/preserves valid numbers
  await store.replaceAll({
    pace: {
      follows: [200, -1, "bad", null, NaN, Infinity, -Infinity, {}, 100, 300],
      unfollows: [-50, 500, undefined, 400],
      extraJunk: true,
    },
  });
  const s2 = await store.get();
  assert.deepStrictEqual(s2.pace, {
    follows: [100, 200, 300],
    unfollows: [400, 500],
  });

  // 4. Caps at newest 100 entries when > 100 items are provided
  const overflow = [];
  for (let i = 1; i <= 110; i++) overflow.push(i * 10); // 10, 20, ..., 1100
  await store.replaceAll({
    pace: {
      follows: overflow,
      unfollows: [],
    },
  });
  const s3 = await store.get();
  assert.strictEqual(s3.pace.follows.length, 100);
  assert.strictEqual(s3.pace.follows[0], 110, "oldest 10 dropped");
  assert.strictEqual(s3.pace.follows[99], 1100, "newest kept");
});

test("prunePace drops times older than 24h, keeps newest 100, and filters invalid elements", () => {
  const store = loadStore(fakeChrome());
  const now = 100_000_000;
  const H24 = 24 * 60 * 60 * 1000; // 86,400,000

  // 1. Drops times older than 24 hours, keeps times within 24 hours
  const input = [
    now - H24 - 1000, // older than 24h -> drop
    now - H24,        // exactly 24h -> keep
    now - 3600_000,   // 1h ago -> keep
    now - 60_000,     // 1m ago -> keep
    now,              // current -> keep
  ];
  const pruned = store.prunePace(input, now);
  assert.deepStrictEqual(pruned, [
    now - H24,
    now - 3600_000,
    now - 60_000,
    now,
  ]);

  // Input array is not mutated
  assert.strictEqual(input.length, 5);

  // 2. Drops non-numbers, negative numbers, NaN, and Infinity
  const messy = [now - 1000, -5, "string", null, NaN, Infinity, now - 500];
  assert.deepStrictEqual(store.prunePace(messy, now), [now - 1000, now - 500]);

  // 3. Keeps at most newest 100
  const many = [];
  for (let i = 1; i <= 105; i++) {
    many.push(now - 1000 + i);
  }
  const capped = store.prunePace(many, now);
  assert.strictEqual(capped.length, 100);
  assert.strictEqual(capped[0], now - 1000 + 6, "oldest 5 dropped");
  assert.strictEqual(capped[99], now - 1000 + 105, "newest kept");

  // 4. Non-array returns empty array
  assert.deepStrictEqual(store.prunePace(null, now), []);
  assert.deepStrictEqual(store.prunePace("not an array", now), []);

  // 5. Default now parameter uses Date.now()
  const realNow = Date.now();
  const recent = [realNow - 1000];
  const old = [realNow - H24 - 10000];
  assert.deepStrictEqual(store.prunePace(recent), recent);
  assert.deepStrictEqual(store.prunePace(old), []);
});

test("reset and replaceAll include pace part", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  await store.update(["pace"], (s) => {
    s.pace.follows.push(1000);
    s.pace.unfollows.push(2000);
  });
  assert.deepStrictEqual(chrome.data["xh:pace"], { follows: [1000], unfollows: [2000] });

  // reset clears pace
  await store.reset();
  assert.strictEqual(chrome.data["xh:pace"], undefined);
  const fresh = await store.get();
  assert.deepStrictEqual(fresh.pace, { follows: [], unfollows: [] });

  // replaceAll writes pace
  await store.replaceAll({ pace: { follows: [3000], unfollows: [4000] } });
  assert.deepStrictEqual(chrome.data["xh:pace"], { follows: [3000], unfollows: [4000] });
});

test("VERSION 4 migrate moves settings.targets into keys and deletes settings.targets", async () => {
  const chrome = fakeChrome({
    "xh:v": 3,
    "xh:settings": { targets: ["Alice", "Bob"], hud: true },
  });
  const store = loadStore(chrome);
  const before = Date.now();
  const s = await store.get();
  const after = Date.now();

  assert.strictEqual(chrome.data["xh:v"], 5);
  assert.strictEqual(s.settings.targets, undefined);
  assert.strictEqual(chrome.data["xh:settings"].targets, undefined);
  assert.deepStrictEqual(s.keys, {
    alice: { h: "Alice", t: s.keys.alice.t },
    bob: { h: "Bob", t: s.keys.bob.t },
  });
  assert.ok(s.keys.alice.t >= before && s.keys.alice.t <= after);
  assert.ok(s.keys.bob.t >= before && s.keys.bob.t <= after);
  assert.deepStrictEqual(chrome.data["xh:keys"], s.keys);
});

test("cleanState converts settings.targets from old exports into keys", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);
  const before = Date.now();
  await store.replaceAll({
    settings: { targets: ["Carol", "Dan", "/invalid", 123] },
  });
  const after = Date.now();
  const s = await store.get();

  assert.strictEqual(s.settings.targets, undefined);
  assert.strictEqual(Object.keys(s.keys).length, 2);
  assert.deepStrictEqual(s.keys.carol, { h: "Carol", t: s.keys.carol.t });
  assert.deepStrictEqual(s.keys.dan, { h: "Dan", t: s.keys.dan.t });
  assert.ok(s.keys.carol.t >= before && s.keys.carol.t <= after);
  assert.ok(s.keys.dan.t >= before && s.keys.dan.t <= after);
});

test("cleanState validates keys, dropping invalid handles and invalid timestamps", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);
  await store.replaceAll({
    keys: {
      Alice: { h: "Alice", t: 100 },
      bob: { h: "/bad_handle", t: 200 }, // invalid display handle falls back to key
      carol: { h: "Carol", t: -1 }, // negative t dropped
      dan: { h: "Dan", t: "not_a_num" }, // non-number t dropped
      eve: { h: "Eve", t: NaN }, // NaN t dropped
      frank: { h: "Frank", t: Infinity }, // Infinity t dropped
      "/evil.com": { h: "evil", t: 300 }, // invalid handle key dropped
      "a b": { h: "ab", t: 400 }, // handle with space dropped
      grace: "not_an_obj", // non-object dropped
      heidi: null, // null dropped
      judy: { h: "Judy", t: 0 }, // 0 is valid non-negative timestamp
    },
  });
  const s = await store.get();
  assert.deepStrictEqual(s.keys, {
    alice: { h: "Alice", t: 100 },
    bob: { h: "bob", t: 200 },
    judy: { h: "Judy", t: 0 },
  });
});

test("keys are capped at 1,000 dropping the oldest by timestamp", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  // 1. In cleanState / replaceAll:
  const overflow = {};
  for (let i = 1; i <= 1005; i++) {
    overflow[`u_${i}`] = { h: `U_${i}`, t: i * 10 }; // u_1 has t: 10 (oldest), u_1005 has t: 10050 (newest)
  }
  await store.replaceAll({ keys: overflow });
  const s1 = await store.get();
  assert.strictEqual(Object.keys(s1.keys).length, 1000);
  assert.strictEqual(s1.keys["u_1"], undefined, "oldest u_1 dropped");
  assert.strictEqual(s1.keys["u_5"], undefined, "oldest u_5 dropped");
  assert.deepStrictEqual(s1.keys["u_6"], { h: "U_6", t: 60 });
  assert.deepStrictEqual(s1.keys["u_1005"], { h: "U_1005", t: 10050 });

  // 2. In store.update:
  await store.update(["keys"], (s) => {
    s.keys["newest"] = { h: "Newest", t: 999990 };
  });
  const s2 = await store.get();
  assert.strictEqual(Object.keys(s2.keys).length, 1000);
  assert.strictEqual(s2.keys["u_6"], undefined, "oldest u_6 dropped after update overflow");
  assert.deepStrictEqual(s2.keys["newest"], { h: "Newest", t: 999990 });
});

test("reset and replaceAll include keys part", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  await store.update(["keys"], (s) => {
    s.keys["alice"] = { h: "Alice", t: 1000 };
  });
  assert.deepStrictEqual(chrome.data["xh:keys"], { alice: { h: "Alice", t: 1000 } });

  // reset clears keys
  await store.reset();
  assert.strictEqual(chrome.data["xh:keys"], undefined);
  const fresh = await store.get();
  assert.deepStrictEqual(fresh.keys, {});

  // replaceAll writes keys
  await store.replaceAll({ keys: { bob: { h: "Bob", t: 2000 } } });
  assert.deepStrictEqual(chrome.data["xh:keys"], { bob: { h: "Bob", t: 2000 } });
});

test("cleanNote validates handle keys, status values, tags, text, and timestamps; drops empty notes", () => {
  const store = loadStore(fakeChrome());
  const { cleanNote } = store;

  // Invalid handle or reserved proto
  assert.strictEqual(cleanNote("invalid handle!", { text: "hi" }), null);
  assert.strictEqual(cleanNote("__proto__", { text: "hi" }), null);
  assert.strictEqual(cleanNote("alice", null), null);

  // Status filtering: valid vs invalid
  assert.strictEqual(cleanNote("alice", { s: "reach" }).s, "reach");
  assert.strictEqual(cleanNote("alice", { s: "unknown_status", text: "ok" }).s, undefined);

  // Tags: trim, length 1-20, case-folded deduplication, cap at 5
  const cleanedTags = cleanNote("alice", {
    tags: ["  tag1  ", "#tag1", "TAG1", "", "#", "a".repeat(21), "设".repeat(20), "tag2", "tag3", "tag4", "tag5"],
  });
  assert.deepStrictEqual(cleanedTags.tags, ["tag1", "设".repeat(20), "tag2", "tag3", "tag4"]);

  // Text: slice at MAX_NOTE_TEXT (500)
  const longText = "x".repeat(600);
  const cleanedText = cleanNote("alice", { text: longText });
  assert.strictEqual(cleanedText.text.length, 500);
  // Counted in characters, so an emoji is never cut in half
  const emoji = cleanNote("alice", { text: "  " + "😀".repeat(600) + "  " }).text;
  assert.strictEqual(Array.from(emoji).length, 500);
  assert.strictEqual(emoji, "😀".repeat(500));

  // Timestamps: non-negative integers
  const withTimes = cleanNote("alice", { text: "hi", t: 1000, u: 2000 });
  assert.strictEqual(withTimes.t, 1000);
  assert.strictEqual(withTimes.u, 2000);
  const backwards = cleanNote("alice", { text: "hi", t: 3000, u: 1000 });
  assert.strictEqual(backwards.u, 3000, "u is never before t");

  // Id preservation when valid
  assert.strictEqual(cleanNote("alice", { text: "hi", id: "12345678" }).id, "12345678");
  assert.strictEqual(cleanNote("alice", { text: "hi", id: "not_a_valid_id" }).id, undefined);

  // Empty note (no status, no tags, no text) drops completely
  assert.strictEqual(cleanNote("alice", { s: "invalid", tags: [], text: "" }), null);
  assert.strictEqual(cleanNote("alice", {}), null);
});

test("saveNote saves valid note, updates existing note without cap refusal, and drops empty note", () => {
  const store = loadStore(fakeChrome());
  const { saveNote } = store;
  const notes = {};

  // 1. Save fresh note
  const res1 = saveNote(notes, "Alice", { s: "reach", tags: ["vip"], text: "Met at meetup" }, 1000);
  assert.strictEqual(res1.ok, true);
  assert.strictEqual(notes.alice.h, "Alice");
  assert.strictEqual(notes.alice.s, "reach");
  assert.deepStrictEqual(notes.alice.tags, ["vip"]);
  assert.strictEqual(notes.alice.text, "Met at meetup");
  assert.strictEqual(notes.alice.t, 1000);
  assert.strictEqual(notes.alice.u, 1000);

  // 2. Update existing note keeps created time t, updates u
  const res2 = saveNote(notes, "alice", { s: "touch", text: "Followed up" }, 2000);
  assert.strictEqual(res2.ok, true);
  assert.strictEqual(notes.alice.s, "touch");
  assert.strictEqual(notes.alice.text, "Followed up");
  assert.strictEqual(notes.alice.t, 1000, "original t preserved");
  assert.strictEqual(notes.alice.u, 2000, "u updated to now");

  // 3. Empty note deletes existing
  const res3 = saveNote(notes, "alice", { text: "" });
  assert.strictEqual(res3.ok, true);
  assert.strictEqual(res3.deleted, true);
  assert.strictEqual(notes.alice, undefined, "alice deleted");

  // Deleting non-existent empty note returns ok and deleted
  const res4 = saveNote(notes, "bob", null);
  assert.strictEqual(res4.ok, true);
  assert.strictEqual(res4.deleted, true);

  // Invalid handle
  assert.deepStrictEqual(saveNote(notes, "not a handle", { text: "x" }), { ok: false, reason: "handle" });
});

test("saveNote cap refuses new notes when 5,000 notes reached without dropping existing notes", () => {
  const store = loadStore(fakeChrome());
  const { saveNote } = store;
  const notes = {};

  // Fill up to 5000 notes
  for (let i = 0; i < 5000; i++) {
    notes[`user_${i}`] = { h: `User_${i}`, text: `Note ${i}`, t: 100, u: 100 };
  }
  assert.strictEqual(Object.keys(notes).length, 5000);

  // Attempt to add 5001st note is refused
  const refused = saveNote(notes, "new_user", { text: "Too many" }, 200);
  assert.strictEqual(refused.ok, false);
  assert.strictEqual(refused.reason, "full");
  assert.strictEqual(Object.keys(notes).length, 5000, "cap maintained, no notes added");
  assert.strictEqual(notes["new_user"], undefined);
  assert.strictEqual(notes["user_0"].text, "Note 0", "existing notes never dropped to make room");

  // Updating an existing note among the 5000 is still allowed
  const updated = saveNote(notes, "user_0", { text: "Updated note 0" }, 300);
  assert.strictEqual(updated.ok, true);
  assert.strictEqual(notes["user_0"].text, "Updated note 0");
});

test("cleanState caps notes at 5,000 keeping the newest edited by u", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  const overflow = {};
  for (let i = 1; i <= 5005; i++) {
    overflow[`u_${i}`] = { h: `U_${i}`, text: `Note ${i}`, t: i * 10, u: i * 10 };
  }

  await store.replaceAll({ notes: overflow });
  const s = await store.get();
  assert.strictEqual(Object.keys(s.notes).length, 5000);
  assert.strictEqual(s.notes["u_1"], undefined, "oldest u_1 dropped");
  assert.strictEqual(s.notes["u_5"], undefined, "oldest u_5 dropped");
  assert.deepStrictEqual(s.notes["u_6"].h, "U_6");
  assert.deepStrictEqual(s.notes["u_5005"].h, "U_5005");
});

test("renameNote moves note to new handle when id matches, updates h, and handles missing id", () => {
  const store = loadStore(fakeChrome());
  const { renameNote } = store;
  const notes = {
    carol_old: { h: "carol_old", id: "987654321", s: "work", text: "Partner", t: 100, u: 100 },
  };

  // Missing id or invalid input changes nothing
  assert.strictEqual(renameNote(notes, "999999999", "carol_new"), false);
  assert.strictEqual(renameNote(notes, "not-an-id", "carol_new"), false);
  assert.ok(notes.carol_old, "note untouched when id not found");

  // Matching id moves note to new handle and updates h
  assert.strictEqual(renameNote(notes, "987654321", "Carol_New"), true);
  assert.strictEqual(notes.carol_new.h, "Carol_New");
  assert.strictEqual(notes.carol_old, undefined, "old handle removed");
  assert.strictEqual(notes.carol_new.s, "work");
  assert.strictEqual(notes.carol_new.text, "Partner");

  // Already under that handle: nothing to do
  assert.strictEqual(renameNote(notes, "987654321", "CAROL_NEW"), false);

  // Both keys hold a note: the one edited last wins
  const both = {
    dan: { h: "dan", id: "111", text: "older", t: 1, u: 10 },
    dan2: { h: "dan2", text: "newer", t: 1, u: 20 },
  };
  assert.strictEqual(renameNote(both, "111", "dan2"), true);
  assert.strictEqual(both.dan, undefined);
  assert.strictEqual(both.dan2.text, "newer");
  const both2 = {
    eve: { h: "eve", id: "222", text: "newer", t: 1, u: 30 },
    eve2: { h: "eve2", text: "older", t: 1, u: 20 },
  };
  renameNote(both2, "222", "eve2");
  assert.strictEqual(both2.eve2.text, "newer");
  assert.strictEqual(both2.eve2.h, "eve2");
});

test("export and import round trip preserves notes, and reset clears notes", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  await store.update(["notes"], (s) => {
    s.notes["alice"] = { h: "Alice", id: "12345", s: "reach", tags: ["design"], text: "Nice work", t: 10, u: 20 };
  });
  assert.deepStrictEqual(chrome.data["xh:notes"], {
    alice: { h: "Alice", id: "12345", s: "reach", tags: ["design"], text: "Nice work", t: 10, u: 20 },
  });

  // reset clears notes
  await store.reset();
  assert.strictEqual(chrome.data["xh:notes"], undefined);
  const fresh = await store.get();
  assert.deepStrictEqual(fresh.notes, {});

  // replaceAll restores notes
  await store.replaceAll({
    notes: {
      bob: { h: "Bob", s: "touch", text: "Followup", t: 30, u: 40 },
    },
  });
  assert.deepStrictEqual(chrome.data["xh:notes"], {
    bob: { h: "Bob", s: "touch", text: "Followup", t: 30, u: 40 },
  });
});

test("cleanState and replaceAll handle old exports without notes gracefully", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);

  await store.replaceAll({
    settings: { hud: false },
    people: { alice: { likes: 1, replies: 0, last: 1 } },
  });
  const s = await store.get();
  assert.strictEqual(s.settings.hud, false);
  assert.deepStrictEqual(s.notes, {}, "defaults to empty notes object without throwing");
});

test("cleanRelations keeps relationship flags three-state: true, false, or left out", () => {
  const store = loadStore(fakeChrome());
  const r = store.cleanRelations(JSON.stringify({ u: [
    { handle: "mutual", following: true, followedBy: true },
    { handle: "lost", following: true, followedBy: false },
    { handle: "partial", following: true },
    { handle: "unknown" },
    { handle: "junk", following: "true", followedBy: 1 },
  ] }));
  const byHandle = Object.fromEntries(r.u.map((u) => [u.handle, u]));
  assert.strictEqual(byHandle.mutual.followedBy, true);
  assert.strictEqual(byHandle.lost.followedBy, false);
  assert.strictEqual(byHandle.partial.following, true);
  assert.ok(!("followedBy" in byHandle.partial));
  for (const h of ["unknown", "junk"]) {
    assert.ok(!("following" in byHandle[h]), h);
    assert.ok(!("followedBy" in byHandle[h]), h);
  }
});

test("rel entries keep valid unfollow timestamps and drop bad ones; old entries import unchanged", async () => {
  const chrome = fakeChrome({ "xh:v": 4 });
  const store = loadStore(chrome);
  await store.replaceAll({
    rel: {
      old: { f: true, fb: true, t: 1 },
      lost: { f: true, fb: false, t: 2, mAt: 10, lostAt: 20, ackAt: 30 },
      zero: { f: true, fb: false, t: 3, mAt: 0, lostAt: 0, ackAt: 0 },
      bad: { f: true, fb: false, t: 4, mAt: -1, lostAt: 1.5, ackAt: "30" },
    },
  });
  const s = await store.get();
  assert.deepStrictEqual(s.rel, {
    old: { f: true, fb: true, id: null, n: null, t: 1 },
    lost: { f: true, fb: false, id: null, n: null, t: 2, mAt: 10, lostAt: 20, ackAt: 30 },
    zero: { f: true, fb: false, id: null, n: null, t: 3, mAt: 0, lostAt: 0, ackAt: 0 },
    bad: { f: true, fb: false, id: null, n: null, t: 4 },
  });
});

test("VERSION 5 migrate gives mutuals stored before unfollow detection a baseline", async () => {
  const chrome = fakeChrome({ "xh:v": 4, "xh:rel": {
    mutual: { f: true, fb: true, id: null, n: null, t: 70 },
    following: { f: true, fb: false, id: null, n: null, t: 80 },
    follower: { f: false, fb: true, id: null, n: null, t: 90 },
  } });
  const store = loadStore(chrome);
  const s = await store.get();
  assert.strictEqual(chrome.data["xh:v"], 5);
  assert.deepStrictEqual(s.rel.mutual, { f: true, fb: true, id: null, n: null, t: 70, mAt: 70 });
  assert.ok(!("mAt" in s.rel.following));
  assert.ok(!("mAt" in s.rel.follower));
  // A former mutual seen again without following back is now caught.
  const seen = store.nextRel(s.rel.mutual, { following: true, followedBy: false }, 100);
  assert.strictEqual(seen.lostAt, 100);
});

test("VERSION 5 migrate leaves rel alone when there is no mutual to fix", async () => {
  const chrome = fakeChrome({ "xh:v": 4, "xh:rel": { bob: { f: true, fb: false, t: 1 } } });
  const store = loadStore(chrome);
  await store.get();
  assert.strictEqual(chrome.data["xh:v"], 5);
  assert.deepStrictEqual(chrome.writes, [["xh:v"]]);
});

test("old settings and old export without hudRight/hudBottom load with 16/16, and non-numbers fall back to 16", async () => {
  // Old settings in storage without hudRight/hudBottom
  const chrome1 = fakeChrome({ "xh:v": 4, "xh:settings": { hud: true } });
  const s1 = await loadStore(chrome1).get();
  assert.strictEqual(s1.settings.hudRight, 16);
  assert.strictEqual(s1.settings.hudBottom, 16);

  // Old export imported via replaceAll without hudRight/hudBottom
  const chrome2 = fakeChrome({ "xh:v": 4 });
  const store2 = loadStore(chrome2);
  await store2.replaceAll({
    settings: { hud: false, followLimit: 25 },
  });
  const s2 = await store2.get();
  assert.strictEqual(s2.settings.hud, false);
  assert.strictEqual(s2.settings.hudRight, 16);
  assert.strictEqual(s2.settings.hudBottom, 16);

  // Non-numbers fall back to 16
  const chrome3 = fakeChrome({
    "xh:v": 4,
    "xh:settings": { hudRight: "invalid", hudBottom: NaN },
  });
  const s3 = await loadStore(chrome3).get();
  assert.strictEqual(s3.settings.hudRight, 16);
  assert.strictEqual(s3.settings.hudBottom, 16);

  // Valid numbers are kept
  const chrome4 = fakeChrome({
    "xh:v": 4,
    "xh:settings": { hudRight: 32, hudBottom: 48 },
  });
  const s4 = await loadStore(chrome4).get();
  assert.strictEqual(s4.settings.hudRight, 32);
  assert.strictEqual(s4.settings.hudBottom, 48);
});

test("store.notFollowingBack filters followed accounts that do not follow back", () => {
  const store = loadStore(fakeChrome());
  const rel = {
    alice: { f: true, fb: false, n: "Alice", t: 100 },
    bob: { f: true, fb: true, n: "Bob", t: 200 }, // mutual - exclude
    charlie: { f: false, fb: true, n: "Charlie", t: 300 }, // follower only - exclude
    dave: { f: true, fb: false, n: "Dave", t: 400 },
    me: { f: true, fb: false, n: "Myself", t: 500 }, // own handle - exclude
    "/evil.com": { f: true, fb: false, n: "Bad", t: 600 }, // invalid handle - exclude
    "has space": { f: true, fb: false, n: "Bad2", t: 700 }, // invalid handle - exclude
  };

  const rows = store.notFollowingBack(rel, "me");
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0][0], "alice");
  assert.strictEqual(rows[1][0], "dave");

  // Own handle with leading @ and different case is also excluded
  const rows2 = store.notFollowingBack(rel, " @ME ");
  assert.strictEqual(rows2.length, 2);

  // Non-object rel returns empty array
  assert.deepStrictEqual(store.notFollowingBack(null, "me"), []);
});

test("store.quietKeys identifies quiet accounts, drops invalid handles, and counts never-interacted as quiet", () => {
  const store = loadStore(fakeChrome());
  const now = 1000000000000;
  const DAY_MS = 86400000;

  const keys = {
    alice: { h: "Alice", t: 100 }, // never interacted -> quiet
    bob: { h: "Bob", t: 200 }, // outbound 20 days ago -> quiet (> 14 days)
    charlie: { h: "Charlie", t: 300 }, // outbound 5 days ago -> active
    dave: { h: "Dave", t: 400 }, // outbound 20 days ago, inbound 2 days ago -> active
    "/bad": { h: "Bad", t: 500 }, // invalid handle -> dropped
  };

  const people = {
    bob: { likes: 1, replies: 1, last: now - 20 * DAY_MS },
    charlie: { likes: 5, replies: 0, last: now - 5 * DAY_MS },
    dave: {
      likes: 1,
      replies: 0,
      last: now - 20 * DAY_MS,
      in: { likes: 2, replies: 0, last: now - 2 * DAY_MS },
    },
  };

  const all = store.quietKeys(keys, people, 14, now);
  // /bad must be dropped -> 4 items
  assert.strictEqual(all.length, 4);

  const byHandle = Object.fromEntries(all.map((item) => [item.h, item]));
  assert.strictEqual(byHandle.alice.latest, 0);
  assert.strictEqual(byHandle.alice.isQuiet, true, "never interacted counts as quiet");

  assert.strictEqual(byHandle.bob.latest, now - 20 * DAY_MS);
  assert.strictEqual(byHandle.bob.isQuiet, true, "older than quietDays counts as quiet");

  assert.strictEqual(byHandle.charlie.latest, now - 5 * DAY_MS);
  assert.strictEqual(byHandle.charlie.isQuiet, false, "recent interaction is not quiet");

  assert.strictEqual(byHandle.dave.latest, now - 2 * DAY_MS);
  assert.strictEqual(byHandle.dave.isQuiet, false, "recent inbound interaction is not quiet");

  // Sorted quietest/oldest first: alice (0), then bob (20d ago), then charlie (5d ago), then dave (2d ago)
  assert.deepStrictEqual(
    all.map((x) => x.h),
    ["alice", "bob", "charlie", "dave"]
  );

  // Non-object keys returns empty array
  assert.deepStrictEqual(store.quietKeys(null, people, 14, now), []);
});
