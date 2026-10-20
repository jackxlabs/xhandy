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
  assert.deepStrictEqual(s.rel.alice, { f: true, fb: true, t: 1 });
  assert.strictEqual(s.days["2026-10-15"].likes, 3);
  assert.ok(!("xh" in chrome.data), "legacy key removed");
  assert.strictEqual(chrome.data["xh:v"], 3);
  assert.deepStrictEqual(chrome.data["xh:rel"], { alice: { f: true, fb: true, t: 1 } });
});

test("a fresh install starts from defaults", async () => {
  const store = loadStore(fakeChrome());
  const s = await store.get();
  assert.deepStrictEqual(s.rel, {});
  assert.deepStrictEqual(s.sent, []);
  assert.strictEqual(s.settings.followLimit, 20);
});

test("update writes only the parts it declares", async () => {
  const chrome = fakeChrome({ "xh:v": 3, "xh:rel": { bob: { f: true, fb: false, t: 1 } } });
  const store = loadStore(chrome);
  await store.update(["days"], (s) => (store.today(s).seconds += 15));
  assert.deepStrictEqual(chrome.writes.at(-1), ["xh:days"]);
  assert.strictEqual(chrome.data["xh:days"][store.dayKey()].seconds, 15);
  assert.deepStrictEqual(chrome.data["xh:rel"], { bob: { f: true, fb: false, t: 1 } }, "rel untouched");
});

test("touching an undeclared part rejects and writes nothing", async () => {
  const chrome = fakeChrome({ "xh:v": 3 });
  const store = loadStore(chrome);
  await assert.rejects(store.update(["days"], (s) => (s.rel.x = {})), /"rel" not in/);
  assert.strictEqual(chrome.writes.length, 0);
  await store.update(["days"], (s) => store.today(s).likes++); // later updates still run
  assert.strictEqual(chrome.data["xh:days"][store.dayKey()].likes, 1);
});

test("sent is capped at the last 300 entries", async () => {
  const chrome = fakeChrome({ "xh:v": 3 });
  const store = loadStore(chrome);
  await store.update(["sent"], (s) => { for (let i = 0; i < 305; i++) s.sent.push({ t: i, text: "x" + i }); });
  assert.strictEqual(chrome.data["xh:sent"].length, 300);
  assert.strictEqual(chrome.data["xh:sent"][0].t, 5);
});

test("onChange delivers the full state with the changed part merged in", async () => {
  const chrome = fakeChrome({ "xh:v": 3, "xh:settings": { hud: false } });
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
  const chrome = fakeChrome({ "xh:v": 3 });
  const store = loadStore(chrome);
  await store.replaceAll({ settings: { targets: ["alice"] }, people: { alice: { likes: 2, replies: 0, last: 1 } } });
  const s = await store.get();
  assert.deepStrictEqual(s.settings.targets, ["alice"]);
  assert.strictEqual(s.people.alice.likes, 2);
  await store.reset();
  assert.deepStrictEqual(Object.keys(chrome.data), []);
});

test("settings of the wrong type fall back to defaults", async () => {
  const chrome = fakeChrome({ "xh:v": 3, "xh:settings": { targets: "alice", staleHours: "12", hud: 0, heatHot: 5 } });
  const s = await loadStore(chrome).get();
  assert.deepStrictEqual(s.settings.targets, []);
  assert.strictEqual(s.settings.staleHours, 48);
  assert.strictEqual(s.settings.hud, true);
  assert.strictEqual(s.settings.heatHot, 5, "valid values kept");
});

test("replaceAll drops what can't be right in an import file", async () => {
  const chrome = fakeChrome({ "xh:v": 3 });
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
  assert.deepStrictEqual(s.settings.targets, ["alice"]);
  assert.strictEqual(s.settings.followLimit, 20);
  assert.deepStrictEqual(s.rel, { bob: { f: true, fb: false, id: null, n: null, t: 2 } });
  assert.deepStrictEqual(s.people, { dan: { likes: 0, replies: 1, last: 3 } });
  assert.deepStrictEqual(s.sent, [{ t: 1, text: "hi", kind: "reply", to: null }]);
  assert.deepStrictEqual(s.days, { "2026-10-16": { likes: 2, replies: 0, posts: 0, follows: 0, unfollows: 0, seconds: 0 } });
  assert.deepStrictEqual(s.relMeta, { last: 5, scan: 0, me: { handle: null, followers: 0, id: null, t: 0 } });
  assert.deepStrictEqual(s.replied, {});
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
      { handle: "bob", name: null, id: null, following: false, followedBy: false },
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
    { handle: "bob", name: null, id: null, following: false, followedBy: false, followers: 0 },
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
    { handle: "good_user", name: null, id: null, following: false, followedBy: false, followers: 100 },
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
  assert.strictEqual(chrome.data["xh:v"], 3);
  assert.strictEqual(s.sent.length, 4, "entry count is unchanged");
  assert.deepStrictEqual(s.sent[0], { t: 100, text: "Great idea!", kind: "reply", to: "alice" });
  assert.deepStrictEqual(s.sent[1], { t: 200, text: "two copies\ntwo copies", kind: "reply", to: "bob" });
  assert.deepStrictEqual(s.sent[2], { t: 300, text: "a\nb\nc", kind: "post", to: null });
  assert.deepStrictEqual(s.sent[3], { t: 400, text: "Short", kind: "post", to: null });
  assert.deepStrictEqual(chrome.data["xh:sent"], s.sent);
});

test("a v1 store migrates through both steps (v1 -> v2 -> v3)", async () => {
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
  assert.strictEqual(chrome.data["xh:v"], 3);
  assert.deepStrictEqual(s.sent, [
    { t: 1, text: "tripled", kind: "reply", to: "alice" },
    { t: 2, text: "two\ntwo", kind: "post", to: null },
  ]);
  assert.deepStrictEqual(chrome.data["xh:sent"], s.sent);
  assert.deepStrictEqual(s.rel.alice, { f: true, fb: true, t: 1 });
  assert.strictEqual(s.settings.hud, false);
  assert.strictEqual(s.days["2026-10-15"].likes, 3);
});

test("replaceAll cleans tripled entries when importing an old export file", async () => {
  const chrome = fakeChrome({ "xh:v": 3 });
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
  const chrome = fakeChrome({ "xh:v": 3 });
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
  const chrome = fakeChrome({ "xh:v": 3 });
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
  const chrome = fakeChrome({ "xh:v": 3 });
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
  const chrome = fakeChrome({ "xh:v": 3 });
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
  const chrome = fakeChrome({ "xh:v": 3 });
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

test("reply chip: short follower counts, ratio only when the author is at least 2x bigger", () => {
  function loadI18n(lang) {
    // Node has its own read-only navigator, so a plain assignment would be ignored.
    Object.defineProperty(globalThis, "navigator", { value: { language: lang }, configurable: true });
    globalThis.XH = {};
    const path = require.resolve("../src/lib/i18n.js");
    delete require.cache[path];
    require(path);
    return globalThis.XH;
  }
  for (const lang of ["en-US", "zh-CN"]) {
    const XH = loadI18n(lang);
    assert.strictEqual(XH.replyChip(23, 46000, 3800), "💬 23 · 46K · 12×", lang + " all data");
    assert.strictEqual(XH.replyChip(6, 3200, 4600), "💬 6 · 3.2K", lang + " smaller author: no ratio");
    assert.strictEqual(XH.replyChip(6, 9000, 4600), "💬 6 · 9K", lang + " under 2x: no ratio");
    assert.strictEqual(XH.replyChip(6, 9200, 4600), "💬 6 · 9.2K · 2×", lang + " exactly 2x");
    assert.strictEqual(XH.replyChip(23, 46000, 0), "💬 23 · 46K", lang + " own count unknown");
    assert.strictEqual(XH.replyChip(23, undefined, 3800), "💬 23", lang + " author count unknown");
    assert.strictEqual(XH.replyChip(0, 950, 100), "💬 0 · 950 · 10×", lang + " small numbers");
    assert.strictEqual(XH.replyChip(5, 1_200_000, 4600), "💬 5 · 1.2M · 261×", lang + " millions");
  }
  assert.strictEqual(loadI18n("en-US").t("replied"), "✓ replied");
  assert.strictEqual(loadI18n("zh-CN").t("replied"), "✓ 已回复");
});
