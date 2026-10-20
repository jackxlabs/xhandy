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
