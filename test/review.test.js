const test = require("node:test");
const assert = require("node:assert");
const review = require("../src/lib/review.js");

const HOUR = 3600 * 1000;
const DAY = 86400 * 1000;

test("median returns null for empty or non-numeric arrays", () => {
  assert.strictEqual(review.median([]), null);
  assert.strictEqual(review.median(null), null);
  assert.strictEqual(review.median(["a", null, undefined]), null);
  assert.strictEqual(review.median([NaN, Infinity, -Infinity]), null);
});

test("median computes correct median for odd and even length arrays", () => {
  assert.strictEqual(review.median([42]), 42);
  assert.strictEqual(review.median([10, 20]), 15);
  assert.strictEqual(review.median([7, 1, 9]), 7);
  assert.strictEqual(review.median([100, 400, 200, 300]), 250);
  assert.strictEqual(review.median([5, "bad", 15, NaN, 25]), 15);
});

test("groups: clear difference marks the highest group as best", () => {
  // Scenario: Clear difference
  // WHEN replies sent under 1 hour have a median of 800 views over 12 replies and replies sent after 6 to
  // 24 hours have a median of 150 over 9 replies
  // THEN both groups show their median and count, and "under 1 hour" is marked as the best
  const now = Date.now();
  const mine = {};

  // 12 replies under 1 hour (delay = 30 min, age = 2 days)
  for (let i = 0; i < 12; i++) {
    mine[`u1_${i}`] = {
      k: "r",
      t: now - 2 * DAY,
      pt: now - 2 * DAY - 30 * 60 * 1000,
      v: 800,
    };
  }

  // 9 replies after 6 to 24 hours (delay = 10 hours, age = 3 days)
  for (let i = 0; i < 9; i++) {
    mine[`d6_24_${i}`] = {
      k: "r",
      t: now - 3 * DAY,
      pt: now - 3 * DAY - 10 * HOUR,
      v: 150,
    };
  }

  const res = review.groups(mine, {}, now);
  const under1h = res.delay.find((g) => g.id === "under_1h");
  const d6_24 = res.delay.find((g) => g.id === "6_to_24h");
  const d1_6 = res.delay.find((g) => g.id === "1_to_6h");
  const over24 = res.delay.find((g) => g.id === "over_24h");

  assert.strictEqual(under1h.n, 12);
  assert.strictEqual(under1h.median, 800);
  assert.strictEqual(under1h.best, true);

  assert.strictEqual(d6_24.n, 9);
  assert.strictEqual(d6_24.median, 150);
  assert.strictEqual(d6_24.best, false);

  assert.strictEqual(d1_6.n, 0);
  assert.strictEqual(d1_6.median, null);
  assert.strictEqual(d1_6.best, false);

  assert.strictEqual(over24.n, 0);
  assert.strictEqual(over24.median, null);
  assert.strictEqual(over24.best, false);
});

test("groups: too few replies shows count, null median and best false", () => {
  // Scenario: Too few replies
  // WHEN a group has 3 replies
  // THEN it shows "3" and "not enough replies yet" and no median, and it cannot be marked as the best
  const now = Date.now();
  const mine = {
    r1: { k: "r", t: now - 2 * DAY, pt: now - 2 * DAY - 10 * 60 * 1000, v: 10000 },
    r2: { k: "r", t: now - 2 * DAY, pt: now - 2 * DAY - 20 * 60 * 1000, v: 12000 },
    r3: { k: "r", t: now - 2 * DAY, pt: now - 2 * DAY - 30 * 60 * 1000, v: 11000 },
  };

  const res = review.groups(mine, {}, now);
  const under1h = res.delay.find((g) => g.id === "under_1h");

  assert.strictEqual(under1h.n, 3);
  assert.strictEqual(under1h.median, null);
  assert.strictEqual(under1h.best, false);
});

test("groups: fresh replies (< 24h) and old replies (> 90d) are excluded", () => {
  // Scenario: Fresh replies wait
  // WHEN a reply is 5 hours old
  // THEN it is not counted in any group yet
  const now = Date.now();
  const mine = {
    fresh: { k: "r", t: now - 5 * HOUR, pt: now - 5 * HOUR - 10 * 60 * 1000, v: 9999 },
    ancient: { k: "r", t: now - 95 * DAY, pt: now - 95 * DAY - 10 * 60 * 1000, v: 8888 },
  };

  const res = review.groups(mine, {}, now);
  for (const dim of [res.delay, res.size, res.heat]) {
    for (const g of dim) {
      assert.strictEqual(g.n, 0);
      assert.strictEqual(g.median, null);
      assert.strictEqual(g.best, false);
    }
  }
});

test("groups: no clear difference marks no group as best", () => {
  // Scenario: No clear difference
  // WHEN the medians of a dimension are 200 and 250
  // THEN no group is marked as the best
  const now = Date.now();
  const mine = {};

  for (let i = 0; i < 5; i++) {
    mine[`u1_${i}`] = { k: "r", t: now - 2 * DAY, pt: now - 2 * DAY - 10 * 60 * 1000, v: 250 };
    mine[`d1_6_${i}`] = { k: "r", t: now - 2 * DAY, pt: now - 2 * DAY - 2 * HOUR, v: 200 };
  }

  const res = review.groups(mine, {}, now);
  const under1h = res.delay.find((g) => g.id === "under_1h");
  const d1_6 = res.delay.find((g) => g.id === "1_to_6h");

  assert.strictEqual(under1h.median, 250);
  assert.strictEqual(d1_6.median, 200);
  assert.strictEqual(under1h.best, false);
  assert.strictEqual(d1_6.best, false);
});

test("groups: negative delay and missing context are ignored", () => {
  const now = Date.now();
  const mine = {
    // pt in future compared to t: negative delay ignored
    neg: { k: "r", t: now - 2 * DAY, pt: now - 2 * DAY + 10 * HOUR, v: 500 },
    // no pt: ignored in delay dimension
    noPt: { k: "r", t: now - 2 * DAY, v: 600 },
    // non-reply (post): ignored
    post: { k: "p", t: now - 2 * DAY, v: 700 },
    // missing v: ignored
    noV: { k: "r", t: now - 2 * DAY, pt: now - 2 * DAY - 10 * 60 * 1000 },
  };

  const res = review.groups(mine, {}, now);
  for (const g of res.delay) {
    assert.strictEqual(g.n, 0);
  }
});

test("groups: size and heat dimensions categorize properly", () => {
  const now = Date.now();
  const mine = {};

  // Size buckets: <2x (under_2x), 2-10x (2_to_10x), >10x (over_10x)
  // Heat buckets: <1000 (below_warm), 1000-10000 (warm), >=10000 (hot)
  for (let i = 0; i < 5; i++) {
    mine[`small_${i}`] = {
      k: "r",
      t: now - 2 * DAY,
      pf: 1000,
      mf: 1000, // ratio 1 -> under_2x
      ph: 500, // below_warm
      v: 100,
    };
    mine[`medium_${i}`] = {
      k: "r",
      t: now - 2 * DAY,
      pf: 5000,
      mf: 1000, // ratio 5 -> 2_to_10x
      ph: 2000, // warm
      v: 300,
    };
    mine[`large_${i}`] = {
      k: "r",
      t: now - 2 * DAY,
      pf: 20000,
      mf: 1000, // ratio 20 -> over_10x
      ph: 15000, // hot
      v: 900,
    };
  }

  const res = review.groups(mine, { heatWarm: 1000, heatHot: 10000 }, now);

  const u2x = res.size.find((g) => g.id === "under_2x");
  const m2_10x = res.size.find((g) => g.id === "2_to_10x");
  const o10x = res.size.find((g) => g.id === "over_10x");

  assert.strictEqual(u2x.n, 5);
  assert.strictEqual(u2x.median, 100);
  assert.strictEqual(m2_10x.n, 5);
  assert.strictEqual(m2_10x.median, 300);
  assert.strictEqual(o10x.n, 5);
  assert.strictEqual(o10x.median, 900);
  assert.strictEqual(o10x.best, true); // 900 >= 1.5 * 100

  const cool = res.heat.find((g) => g.id === "below_warm");
  const warm = res.heat.find((g) => g.id === "warm");
  const hot = res.heat.find((g) => g.id === "hot");

  assert.strictEqual(cool.n, 5);
  assert.strictEqual(cool.median, 100);
  assert.strictEqual(warm.n, 5);
  assert.strictEqual(warm.median, 300);
  assert.strictEqual(hot.n, 5);
  assert.strictEqual(hot.median, 900);
  assert.strictEqual(hot.best, true);
});

test("topReplies returns top 10 replies within 30 days sorted by views then likes", () => {
  // Scenario: Top replies
  // WHEN the user has 14 recorded replies from the last 30 days with known views
  // THEN the 10 with the most views are listed, most-viewed first, each linking to the reply
  const now = Date.now();
  const mine = {};

  for (let i = 1; i <= 14; i++) {
    mine[`reply_${i}`] = {
      k: "r",
      t: now - i * DAY,
      v: i * 100,
      l: i,
      to: "alice",
      x: `reply ${i}`,
    };
  }

  // Old reply > 30 days
  mine.old = { k: "r", t: now - 35 * DAY, v: 99999, to: "bob" };
  // Post (not reply)
  mine.post = { k: "p", t: now - 2 * DAY, v: 88888 };
  // Reply without views
  mine.noV = { k: "r", t: now - 2 * DAY, to: "carol" };

  const top = review.topReplies(mine, now, 10);
  assert.strictEqual(top.length, 10);
  assert.strictEqual(top[0].id, "reply_14");
  assert.strictEqual(top[0].v, 1400);
  assert.strictEqual(top[9].id, "reply_5");
  assert.strictEqual(top[9].v, 500);

  // Equal views: tie-broken by likes
  const ties = {
    a: { k: "r", t: now - DAY, v: 500, l: 1 },
    b: { k: "r", t: now - DAY, v: 500, l: 10 },
  };
  const topTies = review.topReplies(ties, now, 2);
  assert.strictEqual(topTies[0].id, "b");
  assert.strictEqual(topTies[1].id, "a");
});

test("week returns reply count and median views for replies in last 7 days", () => {
  const now = Date.now();
  const mine = {
    r1: { k: "r", t: now - 1 * DAY, v: 100 },
    r2: { k: "r", t: now - 2 * DAY, v: 200 },
    r3: { k: "r", t: now - 3 * DAY }, // no v
    r4: { k: "r", t: now - 6 * DAY, v: 300 },
    rOld: { k: "r", t: now - 8 * DAY, v: 1000 },
    pRecent: { k: "p", t: now - 2 * DAY, v: 500 },
  };

  const w = review.week(mine, now);
  assert.strictEqual(w.n, 4); // r1, r2, r3, r4
  assert.strictEqual(w.median, 200); // median of [100, 200, 300]
});

test("growth: 7-day change with a week of snapshots", () => {
  // Scenario: A week of snapshots
  // WHEN the snapshot 7 days ago is 1,150 and today's is 1,210
  // THEN the view shows +60 for 7 days
  const now = new Date("2026-11-12T12:00:00Z");
  const days = {
    "2026-11-05": { followers: 1150, replies: 2 },
    "2026-11-12": { followers: 1210, replies: 5 },
  };

  const g = review.growth(days, now);
  assert.strictEqual(g.series.length, 30);
  assert.strictEqual(g.d7, 60);
  assert.strictEqual(g.d30, 60);
});

test("growth: only one snapshot leaves d7 and d30 as null", () => {
  // Scenario: Only one snapshot
  // WHEN only today has a snapshot
  // THEN the view says growth appears after a few days of use, and shows no change figure
  const now = new Date("2026-11-12T12:00:00Z");
  const days = {
    "2026-11-12": { followers: 1210, replies: 5 },
  };

  const g = review.growth(days, now);
  assert.strictEqual(g.d7, null);
  assert.strictEqual(g.d30, null);
  assert.strictEqual(g.series.find((s) => s.day === "2026-11-12").followers, 1210);
  assert.strictEqual(g.series.find((s) => s.day === "2026-11-11").followers, null);
});

test("growth: missing days produce gaps in followers while counting replies", () => {
  // Scenario: Missing days
  // WHEN three days in the last 30 have no snapshot
  // THEN the line has gaps on those days and the replies bars are still drawn
  const now = new Date("2026-11-12T12:00:00Z");
  const days = {
    "2026-11-04": { followers: 1000, replies: 1 },
    "2026-11-05": { replies: 3 }, // no snapshot
    "2026-11-06": { replies: 2 }, // no snapshot
    "2026-11-07": { replies: 4 }, // no snapshot
    "2026-11-12": { followers: 1200, replies: 2 },
  };

  const g = review.growth(days, now);
  assert.strictEqual(g.series.find((s) => s.day === "2026-11-05").followers, null);
  assert.strictEqual(g.series.find((s) => s.day === "2026-11-05").replies, 3);
  assert.strictEqual(g.series.find((s) => s.day === "2026-11-06").followers, null);
  assert.strictEqual(g.series.find((s) => s.day === "2026-11-06").replies, 2);
  assert.strictEqual(g.series.find((s) => s.day === "2026-11-07").followers, null);
  assert.strictEqual(g.series.find((s) => s.day === "2026-11-07").replies, 4);

  // d7: snapshot 7 days ago (2026-11-05) has none, closest within 7 days is 2026-11-12 itself, so only 1 snapshot in d7 window -> null
  assert.strictEqual(g.d7, null);
  // d30: includes 2026-11-04 (1000) and 2026-11-12 (1200) -> 200
  assert.strictEqual(g.d30, 200);
});
