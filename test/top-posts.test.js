const test = require("node:test");
const assert = require("node:assert");
const { topThreshold, topPostsUrl } = require("../src/lib/top-posts.js");

test("topThreshold maps follower counts to the right tier boundaries", () => {
  // < 1K tier -> 3
  assert.strictEqual(topThreshold(0), 3);
  assert.strictEqual(topThreshold(500), 3);
  assert.strictEqual(topThreshold(999), 3);

  // 1K - 10K tier -> 10
  assert.strictEqual(topThreshold(1000), 10);
  assert.strictEqual(topThreshold(5000), 10);
  assert.strictEqual(topThreshold(9999), 10);

  // 10K - 100K tier -> 50
  assert.strictEqual(topThreshold(10000), 50);
  assert.strictEqual(topThreshold(50000), 50);
  assert.strictEqual(topThreshold(99999), 50);

  // 100K - 1M tier -> 200
  assert.strictEqual(topThreshold(100000), 200);
  assert.strictEqual(topThreshold(500000), 200);
  assert.strictEqual(topThreshold(999999), 200);

  // >= 1M tier -> 1000
  assert.strictEqual(topThreshold(1000000), 1000);
  assert.strictEqual(topThreshold(25000000), 1000);
});

test("topThreshold falls back to default 10 for invalid, missing or negative inputs", () => {
  assert.strictEqual(topThreshold(undefined), 10);
  assert.strictEqual(topThreshold(null), 10);
  assert.strictEqual(topThreshold(NaN), 10);
  assert.strictEqual(topThreshold(-1), 10);
  assert.strictEqual(topThreshold(-500), 10);
  assert.strictEqual(topThreshold("1000"), 10);
  assert.strictEqual(topThreshold(Infinity), 10);
  assert.strictEqual(topThreshold(-Infinity), 10);
});

test("topPostsUrl constructs encoded search URL with correct query params", () => {
  const url1 = topPostsUrl("elonmusk", 150000000);
  assert.strictEqual(
    url1,
    "https://x.com/search?q=from%3Aelonmusk%20min_faves%3A1000%20-filter%3Areplies&src=typed_query&f=top"
  );

  // Strips leading @ and trims
  const url2 = topPostsUrl(" @jack_huang ", 500);
  assert.strictEqual(
    url2,
    "https://x.com/search?q=from%3Ajack_huang%20min_faves%3A3%20-filter%3Areplies&src=typed_query&f=top"
  );

  // Default threshold when followers are unknown
  const url3 = topPostsUrl("someone");
  assert.strictEqual(
    url3,
    "https://x.com/search?q=from%3Asomeone%20min_faves%3A10%20-filter%3Areplies&src=typed_query&f=top"
  );
});
