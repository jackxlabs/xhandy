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
  assert.strictEqual(chrome.data["xh:v"], 2);
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
  const chrome = fakeChrome({ "xh:v": 2, "xh:rel": { bob: { f: true, fb: false, t: 1 } } });
  const store = loadStore(chrome);
  await store.update(["days"], (s) => (store.today(s).seconds += 15));
  assert.deepStrictEqual(chrome.writes.at(-1), ["xh:days"]);
  assert.strictEqual(chrome.data["xh:days"][store.dayKey()].seconds, 15);
  assert.deepStrictEqual(chrome.data["xh:rel"], { bob: { f: true, fb: false, t: 1 } }, "rel untouched");
});

test("touching an undeclared part rejects and writes nothing", async () => {
  const chrome = fakeChrome({ "xh:v": 2 });
  const store = loadStore(chrome);
  await assert.rejects(store.update(["days"], (s) => (s.rel.x = {})), /"rel" not in/);
  assert.strictEqual(chrome.writes.length, 0);
  await store.update(["days"], (s) => store.today(s).likes++); // later updates still run
  assert.strictEqual(chrome.data["xh:days"][store.dayKey()].likes, 1);
});

test("sent is capped at the last 300 entries", async () => {
  const chrome = fakeChrome({ "xh:v": 2 });
  const store = loadStore(chrome);
  await store.update(["sent"], (s) => { for (let i = 0; i < 305; i++) s.sent.push({ t: i, text: "x" + i }); });
  assert.strictEqual(chrome.data["xh:sent"].length, 300);
  assert.strictEqual(chrome.data["xh:sent"][0].t, 5);
});

test("onChange delivers the full state with the changed part merged in", async () => {
  const chrome = fakeChrome({ "xh:v": 2, "xh:settings": { hud: false } });
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
  const chrome = fakeChrome({ "xh:v": 2 });
  const store = loadStore(chrome);
  await store.replaceAll({ settings: { targets: ["alice"] }, people: { alice: { likes: 2, replies: 0, last: 1 } } });
  const s = await store.get();
  assert.deepStrictEqual(s.settings.targets, ["alice"]);
  assert.strictEqual(s.people.alice.likes, 2);
  await store.reset();
  assert.deepStrictEqual(Object.keys(chrome.data), []);
});

test("settings of the wrong type fall back to defaults", async () => {
  const chrome = fakeChrome({ "xh:v": 2, "xh:settings": { targets: "alice", staleHours: "12", hud: 0, heatHot: 5 } });
  const s = await loadStore(chrome).get();
  assert.deepStrictEqual(s.settings.targets, []);
  assert.strictEqual(s.settings.staleHours, 48);
  assert.strictEqual(s.settings.hud, true);
  assert.strictEqual(s.settings.heatHot, 5, "valid values kept");
});

test("replaceAll drops what can't be right in an import file", async () => {
  const chrome = fakeChrome({ "xh:v": 2 });
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
  assert.deepStrictEqual(s.relMeta, { last: 5, scan: 0 });
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
    at: 7,
  });
  const empty = store.cleanRelations('{"x":1}');
  assert.deepStrictEqual(empty, { u: [], v: [], f: [], at: empty.at });
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
