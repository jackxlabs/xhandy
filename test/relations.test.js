const test = require("node:test");
const assert = require("node:assert");
const { collectRelations, collectViews } = require("../src/page-hook.js");
const home = require("./fixtures/home-timeline.json");

test("collects every user with relationship info, however deeply nested", () => {
  const byHandle = Object.fromEntries(collectRelations(home).map((u) => [u.handle, u]));
  assert.deepStrictEqual(Object.keys(byHandle).sort(), [
    "ad_frank", "alert_gina", "alice", "bob", "quoted_dave", "video_erin",
  ]);
  assert.deepStrictEqual(byHandle.alice, { handle: "alice", name: "Alice", id: "1", following: true, followedBy: true });
  assert.strictEqual(byHandle.bob.following, false);
  assert.strictEqual(byHandle.bob.followedBy, true);
  assert.strictEqual(byHandle.quoted_dave.following, true);
  assert.strictEqual(byHandle.quoted_dave.followedBy, false);
});

test("ignores objects without relationship_perspectives", () => {
  const r = collectRelations({ __typename: "User", core: { screen_name: "x" } });
  assert.deepStrictEqual(r, []);
});

test("collects view counts of every post, including quoted ones", () => {
  const byId = Object.fromEntries(collectViews(home).map((p) => [p.id, p.views]));
  assert.deepStrictEqual(byId, { 111: 30000, 222: 50000, 333: 800 });
});

test("ignores posts without a numeric view count", () => {
  assert.deepStrictEqual(collectViews({ __typename: "Tweet", rest_id: "1", views: { state: "Enabled" } }), []);
  assert.deepStrictEqual(collectViews({ __typename: "Tweet", rest_id: "1", views: { count: "n/a" } }), []);
});
