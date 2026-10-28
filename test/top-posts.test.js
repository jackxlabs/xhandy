const test = require("node:test");
const assert = require("node:assert");
const { topThreshold, topPostsUrl } = require("../src/lib/top-posts.js");

test("topThreshold maps follower counts to the right tier boundaries", () => {
  // < 1K tier -> 10
  assert.strictEqual(topThreshold(0), 10);
  assert.strictEqual(topThreshold(500), 10);
  assert.strictEqual(topThreshold(999), 10);

  // 1K - 10K tier -> 50
  assert.strictEqual(topThreshold(1000), 50);
  assert.strictEqual(topThreshold(5000), 50);
  assert.strictEqual(topThreshold(9999), 50);

  // 10K - 100K tier -> 200
  assert.strictEqual(topThreshold(10000), 200);
  assert.strictEqual(topThreshold(50000), 200);
  assert.strictEqual(topThreshold(99999), 200);

  // 100K - 1M tier -> 1000
  assert.strictEqual(topThreshold(100000), 1000);
  assert.strictEqual(topThreshold(500000), 1000);
  assert.strictEqual(topThreshold(999999), 1000);

  // >= 1M tier -> 5000
  assert.strictEqual(topThreshold(1000000), 5000);
  assert.strictEqual(topThreshold(25000000), 5000);
});

test("topThreshold falls back to default 100 for invalid, missing or negative inputs", () => {
  assert.strictEqual(topThreshold(undefined), 100);
  assert.strictEqual(topThreshold(null), 100);
  assert.strictEqual(topThreshold(NaN), 100);
  assert.strictEqual(topThreshold(-1), 100);
  assert.strictEqual(topThreshold(-500), 100);
  assert.strictEqual(topThreshold("1000"), 100);
  assert.strictEqual(topThreshold(Infinity), 100);
  assert.strictEqual(topThreshold(-Infinity), 100);
});

test("topPostsUrl constructs encoded search URL with correct query params", () => {
  const url1 = topPostsUrl("elonmusk", 150000000);
  assert.strictEqual(
    url1,
    "https://x.com/search?q=from%3Aelonmusk%20min_faves%3A5000%20-filter%3Areplies&src=typed_query&f=top"
  );

  // Strips leading @ and trims
  const url2 = topPostsUrl(" @jack_huang ", 500);
  assert.strictEqual(
    url2,
    "https://x.com/search?q=from%3Ajack_huang%20min_faves%3A10%20-filter%3Areplies&src=typed_query&f=top"
  );

  // Default threshold when followers are unknown
  const url3 = topPostsUrl("someone");
  assert.strictEqual(
    url3,
    "https://x.com/search?q=from%3Asomeone%20min_faves%3A100%20-filter%3Areplies&src=typed_query&f=top"
  );
});
