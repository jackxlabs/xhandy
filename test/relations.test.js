const test = require("node:test");
const assert = require("node:assert");
const { collectRelations } = require("../src/page-hook.js");
const home = require("./fixtures/home-timeline.json");

test("collects every user with relationship info, however deeply nested", () => {
  const byHandle = Object.fromEntries(collectRelations(home).map((u) => [u.handle, u]));
  assert.deepStrictEqual(Object.keys(byHandle).sort(), [
    "ad_frank", "alert_gina", "alice", "bob", "quoted_dave", "video_erin",
  ]);
  assert.deepStrictEqual(byHandle.alice, { handle: "alice", id: "1", following: true, followedBy: true });
  assert.strictEqual(byHandle.bob.following, false);
  assert.strictEqual(byHandle.bob.followedBy, true);
  assert.strictEqual(byHandle.quoted_dave.following, true);
  assert.strictEqual(byHandle.quoted_dave.followedBy, false);
});

test("ignores objects without relationship_perspectives", () => {
  const r = collectRelations({ __typename: "User", core: { screen_name: "x" } });
  assert.deepStrictEqual(r, []);
});
