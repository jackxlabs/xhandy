const test = require("node:test");
const assert = require("node:assert");
const { collectRelations, collectViews, collectPosts, collectFriendship } = require("../src/page-hook.js");
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

test("collects posts and view counts of every post, including quoted ones", () => {
  const posts = collectPosts(home);
  const byId = Object.fromEntries(posts.map((p) => [p.id, p]));
  assert.strictEqual(byId["111"].views, 30000);
  assert.strictEqual(byId["111"].author, "alice");
  assert.strictEqual(byId["222"].views, 50000);
  assert.strictEqual(byId["222"].author, "bob");
  assert.strictEqual(byId["333"].views, 800);
  assert.strictEqual(byId["333"].author, "ad_frank");
  assert.strictEqual(byId["900"].author, "quoted_dave");
  assert.strictEqual(byId["900"].views, undefined);
});

test("omits views for posts without a numeric view count", () => {
  assert.deepStrictEqual(collectPosts({ __typename: "Tweet", rest_id: "1", views: { state: "Enabled" } }), [{ id: "1" }]);
  assert.deepStrictEqual(collectPosts({ __typename: "Tweet", rest_id: "1", views: { count: "n/a" } }), [{ id: "1" }]);
  assert.deepStrictEqual(collectPosts({ __typename: "Tweet", rest_id: "1" }), [{ id: "1" }]);
});

test("reads the user's own follow and unfollow from X's answer", () => {
  const user = { id_str: "3", screen_name: "carol", name: "Carol", following: true };
  assert.deepStrictEqual(collectFriendship("https://x.com/i/api/1.1/friendships/create.json", user), [
    { handle: "carol", name: "Carol", id: "3", on: true },
  ]);
  assert.strictEqual(collectFriendship("/i/api/1.1/friendships/destroy.json", user)[0].on, false);
  assert.deepStrictEqual(collectFriendship("/i/api/1.1/friendships/show.json", user), []);
  assert.deepStrictEqual(collectFriendship("/i/api/1.1/friendships/create.json", { errors: [{ code: 161 }] }), []);
});

test("collectPosts extracts reply count, author handle, followers, inReplyTo, and posts without views", () => {
  // Made-up fixture shaped like real X GraphQL responses (no real accounts)
  const fixture = {
    data: {
      threaded_conversation_with_injections_v2: {
        instructions: [
          {
            type: "TimelineAddEntries",
            entries: [
              {
                entryId: "tweet-1000",
                content: {
                  itemContent: {
                    tweet_results: {
                      result: {
                        __typename: "Tweet",
                        rest_id: "1000",
                        core: {
                          user_results: {
                            result: {
                              __typename: "User",
                              core: {
                                screen_name: "dev_alice",
                                name: "Alice Developer",
                              },
                              relationship_counts: {
                                followers: 46000,
                              },
                            },
                          },
                        },
                        legacy: {
                          full_text: "Original tweet text",
                          reply_count: 23,
                          in_reply_to_status_id_str: null,
                        },
                        views: {
                          count: "15000",
                        },
                      },
                    },
                  },
                },
              },
              {
                entryId: "tweet-1001",
                content: {
                  itemContent: {
                    tweet_results: {
                      result: {
                        __typename: "Tweet",
                        rest_id: "1001",
                        core: {
                          user_results: {
                            result: {
                              __typename: "User",
                              core: {
                                screen_name: "coder_bob",
                                name: "Bob Coder",
                              },
                              relationship_counts: {
                                followers: 3800,
                              },
                            },
                          },
                        },
                        legacy: {
                          full_text: "@dev_alice Great point!",
                          reply_count: 5,
                          in_reply_to_status_id_str: "1000",
                        },
                        views: {
                          count: "2500",
                        },
                      },
                    },
                  },
                },
              },
              {
                entryId: "tweet-1002",
                content: {
                  itemContent: {
                    tweet_results: {
                      result: {
                        __typename: "Tweet",
                        rest_id: "1002",
                        core: {
                          user_results: {
                            result: {
                              __typename: "User",
                              core: {
                                screen_name: "charlie_test",
                              },
                              relationship_counts: {
                                followers: 120,
                              },
                            },
                          },
                        },
                        legacy: {
                          full_text: "A post without views",
                          reply_count: 0,
                          in_reply_to_status_id_str: null,
                        },
                        views: {
                          state: "Enabled",
                        },
                      },
                    },
                  },
                },
              },
              {
                entryId: "tweet-1003",
                content: {
                  itemContent: {
                    tweet_results: {
                      result: {
                        __typename: "Tweet",
                        rest_id: "1003",
                        core: {
                          user_results: {
                            result: {
                              __typename: "User",
                              core: {
                                screen_name: "dan_no_followers",
                              },
                            },
                          },
                        },
                        legacy: {
                          full_text: "A post without relationship_counts",
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    },
  };

  const posts = collectPosts(fixture);
  const byId = Object.fromEntries(posts.map((p) => [p.id, p]));

  // Post 1000: root post, all data known, inReplyTo null -> omitted
  assert.deepStrictEqual(byId["1000"], {
    id: "1000",
    views: 15000,
    replies: 23,
    author: "dev_alice",
    authorFollowers: 46000,
  });

  // Post 1001: reply to 1000 -> has inReplyTo
  assert.deepStrictEqual(byId["1001"], {
    id: "1001",
    views: 2500,
    replies: 5,
    author: "coder_bob",
    authorFollowers: 3800,
    inReplyTo: "1000",
  });

  // Post 1002: post without views count
  assert.deepStrictEqual(byId["1002"], {
    id: "1002",
    replies: 0,
    author: "charlie_test",
    authorFollowers: 120,
  });

  // Post 1003: post without views, without replies, without author followers
  assert.deepStrictEqual(byId["1003"], {
    id: "1003",
    author: "dan_no_followers",
  });
});

test("collectRelations reads relationship_counts.followers when available", () => {
  const json = {
    users: [
      {
        __typename: "User",
        rest_id: "201",
        core: { screen_name: "dev_alice", name: "Alice Developer" },
        relationship_perspectives: { following: true, followed_by: false },
        relationship_counts: { followers: 46000 },
      },
      {
        __typename: "User",
        rest_id: "202",
        core: { screen_name: "coder_bob", name: "Bob Coder" },
        relationship_perspectives: { following: false, followed_by: true },
      },
    ],
  };
  const byHandle = Object.fromEntries(collectRelations(json).map((u) => [u.handle, u]));
  assert.deepStrictEqual(byHandle.dev_alice, {
    handle: "dev_alice",
    name: "Alice Developer",
    id: "201",
    following: true,
    followedBy: false,
    followers: 46000,
  });
  assert.deepStrictEqual(byHandle.coder_bob, {
    handle: "coder_bob",
    name: "Bob Coder",
    id: "202",
    following: false,
    followedBy: true,
  });
});

test("collectRelations passes relationship flags through only when X sends booleans", () => {
  const user = (h, rp) => ({ __typename: "User", rest_id: "1", core: { screen_name: h }, relationship_perspectives: rp });
  const byHandle = Object.fromEntries(collectRelations([
    user("both_true", { following: true, followed_by: true }),
    user("both_false", { following: false, followed_by: false }),
    user("omitted", { blocking: false }),
    user("not_bool", { following: 1, followed_by: "true" }),
  ]).map((u) => [u.handle, u]));
  assert.strictEqual(byHandle.both_true.following, true);
  assert.strictEqual(byHandle.both_true.followedBy, true);
  assert.strictEqual(byHandle.both_false.following, false);
  assert.strictEqual(byHandle.both_false.followedBy, false);
  for (const h of ["omitted", "not_bool"]) {
    assert.ok(!("following" in byHandle[h]), h);
    assert.ok(!("followedBy" in byHandle[h]), h);
  }
});

test("collectRelations keeps a flag from an earlier copy of the same user when a later copy omits it", () => {
  const r = collectRelations({ a: [
    { __typename: "User", core: { screen_name: "carol" }, relationship_perspectives: { following: true, followed_by: false } },
    { __typename: "User", core: { screen_name: "Carol" }, relationship_perspectives: { following: true } },
  ] });
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].following, true);
  assert.strictEqual(r[0].followedBy, false);
});

// store.js attaches to globalThis.XH and only touches chrome.storage when called.
globalThis.XH = globalThis.XH || {};
require("../src/lib/store.js");
const { nextRel } = globalThis.XH.store;

test("nextRel records when an account was last seen as a mutual", () => {
  const a = nextRel(undefined, { name: "Al", id: "1", following: true, followedBy: true }, 100);
  assert.deepStrictEqual(a, { f: true, fb: true, id: "1", n: "Al", t: 100, mAt: 100 });
  const b = nextRel(a, { name: "Al", id: "1", following: true, followedBy: true }, 200);
  assert.strictEqual(b.mAt, 200);
  assert.strictEqual(b.t, 200);
});

test("nextRel detects a mutual that stops following back, once", () => {
  const mutual = { f: true, fb: true, id: "1", n: "Al", t: 1, mAt: 1 };
  const lost = nextRel(mutual, { following: true, followedBy: false }, 50);
  assert.strictEqual(lost.fb, false);
  assert.strictEqual(lost.lostAt, 50);
  assert.strictEqual(lost.mAt, 1);
  const later = nextRel({ ...lost, ackAt: 60 }, { following: true, followedBy: false }, 90);
  assert.strictEqual(later.lostAt, 50, "first detection time is kept");
  assert.strictEqual(later.ackAt, 60, "a dismissed alert stays dismissed");
});

test("nextRel needs a mutual X showed (mAt), not just f and fb both true", () => {
  const r = nextRel({ f: true, fb: true, id: null, n: null, t: 1 }, { following: true, followedBy: false }, 5);
  assert.ok(!("lostAt" in r));
});

test("nextRel does not treat someone who followed you while you didn't follow them as a former mutual", () => {
  // They followed you, later left; you follow them now and see they don't follow back.
  const r = nextRel({ f: false, fb: true, id: null, n: null, t: 1 }, { following: true, followedBy: false }, 5);
  assert.ok(!("lostAt" in r));
});

test("nextRel starts fresh when a handle now belongs to a different account", () => {
  const oldMutual = { f: true, fb: true, id: "1", n: "Al", t: 1, mAt: 1 };
  const r = nextRel(oldMutual, { id: "2", name: "New", following: true, followedBy: false }, 5);
  assert.deepStrictEqual(r, { f: true, fb: false, id: "2", n: "New", t: 5 });
});

test("an unfollow the user made, then a follow again, never raises an unfollowed-you alert", () => {
  const { relAfterFriendship } = globalThis.XH.store;
  const mutual = { f: true, fb: true, id: "1", n: "Al", t: 1, mAt: 1 };
  const unfollowed = relAfterFriendship(mutual, { id: "1", name: "Al", on: false }, 10);
  assert.deepStrictEqual(unfollowed, { f: false, fb: true, id: "1", n: "Al", t: 10 });
  const refollowed = relAfterFriendship(unfollowed, { id: "1", name: null, on: true }, 20);
  const seen = nextRel(refollowed, { id: "1", following: true, followedBy: false }, 30);
  assert.ok(!("lostAt" in seen));
  // An alert that was never dismissed goes away too, instead of coming back after a follow.
  const lost = { f: true, fb: false, id: "1", n: "Al", t: 1, mAt: 1, lostAt: 2 };
  assert.ok(!("lostAt" in relAfterFriendship(lost, { id: "1", name: null, on: false }, 3)));
  assert.strictEqual(relAfterFriendship(lost, { id: "1", name: null, on: true }, 3).lostAt, 2, "following again keeps it");
});

test("nextRel ignores accounts that were never mutual", () => {
  const r = nextRel({ f: true, fb: false, id: null, n: null, t: 1 }, { following: true, followedBy: false }, 5);
  assert.deepStrictEqual(r, { f: true, fb: false, id: null, n: null, t: 5 });
  assert.ok(!("lostAt" in nextRel(undefined, { following: true, followedBy: false }, 5)));
});

test("nextRel ignores unfollows the user made first", () => {
  const mutual = { f: true, fb: true, id: null, n: null, t: 1, mAt: 1 };
  for (const followedBy of [true, false]) {
    const r = nextRel(mutual, { following: false, followedBy }, 5);
    assert.strictEqual(r.f, false);
    assert.strictEqual(r.fb, followedBy);
    assert.ok(!("lostAt" in r));
  }
});

test("nextRel keeps stored flags and starts nothing when X leaves a flag out", () => {
  const mutual = { f: true, fb: true, id: "1", n: "Al", t: 1, mAt: 1 };
  assert.deepStrictEqual(nextRel(mutual, { following: true }, 5), { ...mutual, t: 5 });
  assert.deepStrictEqual(nextRel(mutual, { followedBy: false }, 5), { ...mutual, fb: false, t: 5 });
  assert.deepStrictEqual(nextRel(mutual, {}, 5), { ...mutual, t: 5 });
  const lost = { f: true, fb: false, id: null, n: null, t: 1, mAt: 1, lostAt: 2, ackAt: 3 };
  assert.deepStrictEqual(nextRel(lost, { followedBy: true }, 5), { ...lost, fb: true, t: 5 });
  assert.ok(!("mAt" in nextRel(undefined, { followedBy: true }, 5)));
});

test("nextRel clears an unfollow and restarts the baseline when the mutual comes back", () => {
  const lost = { f: true, fb: false, id: null, n: null, t: 1, mAt: 1, lostAt: 2, ackAt: 3 };
  const r = nextRel(lost, { following: true, followedBy: true }, 9);
  assert.deepStrictEqual(r, { f: true, fb: true, id: null, n: null, t: 9, mAt: 9 });
});

test("nextRel keeps a known id and name when X sends none", () => {
  const r = nextRel({ f: true, fb: true, id: "1", n: "Al", t: 1 }, { id: null, name: null, following: true, followedBy: true }, 5);
  assert.strictEqual(r.id, "1");
  assert.strictEqual(r.n, "Al");
});
