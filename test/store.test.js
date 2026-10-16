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
