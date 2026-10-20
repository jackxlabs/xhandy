const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { collectInbound } = require("../src/page-hook.js");
const notificationsFixture = require("./fixtures/notifications.json");

const ME = { handle: "viewer_jack", id: "9999" };

test("collectInbound: unknown me returns nothing", () => {
  const dummy = { foo: "bar" };
  assert.deepStrictEqual(collectInbound(dummy, null), []);
  assert.deepStrictEqual(collectInbound(dummy, undefined), []);
  assert.deepStrictEqual(collectInbound(dummy, {}), []);
  assert.deepStrictEqual(collectInbound(dummy, { handle: null, id: null }), []);
  assert.deepStrictEqual(collectInbound(dummy, { handle: "", id: null }), []);
  assert.deepStrictEqual(collectInbound(null, ME), []);
  assert.deepStrictEqual(collectInbound("not an object", ME), []);
});

test("collectInbound: like pairs and keys", () => {
  const json = {
    notification_icon: "heart_icon",
    timestamp_ms: "1760000001000",
    clientEventInfo: { element: "users_liked_your_tweet" },
    template: {
      __typename: "TimelineNotificationAggregateUserActions",
      from_users: [
        {
          user_results: {
            result: {
              __typename: "User",
              rest_id: "102",
              core: { screen_name: "liker_bob", name: "Bob Liker" },
            },
          },
        },
        {
          user_results: {
            result: {
              __typename: "User",
              rest_id: "103",
              core: { screen_name: "liker_carol", name: "Carol Liker" },
            },
          },
        },
      ],
      target_objects: [
        {
          tweet_results: {
            result: {
              __typename: "Tweet",
              rest_id: "501",
              core: {
                user_results: {
                  result: {
                    __typename: "User",
                    rest_id: "9999",
                    core: { screen_name: "viewer_jack" },
                  },
                },
              },
            },
          },
        },
      ],
    },
  };

  const candidates = collectInbound(json, ME);
  assert.strictEqual(candidates.length, 2);
  assert.deepStrictEqual(candidates[0], {
    kind: "like",
    from: { handle: "liker_bob", id: "102", name: "Bob Liker" },
    key: "L:102:501",
    at: 1760000001000,
  });
  assert.deepStrictEqual(candidates[1], {
    kind: "like",
    from: { handle: "liker_carol", id: "103", name: "Carol Liker" },
    key: "L:103:501",
    at: 1760000001000,
  });

  // Self-like is ignored
  const selfLike = {
    notification_icon: "heart_icon",
    timestamp_ms: "1760000001000",
    template: {
      __typename: "TimelineNotificationAggregateUserActions",
      from_users: [
        {
          user_results: {
            result: { __typename: "User", rest_id: "9999", core: { screen_name: "viewer_jack" } },
          },
        },
      ],
      target_objects: [
        {
          tweet_results: {
            result: { __typename: "Tweet", rest_id: "501", core: { user_results: { result: { rest_id: "9999" } } } },
          },
        },
      ],
    },
  };
  assert.deepStrictEqual(collectInbound(selfLike, ME), []);

  // Post not authored by the viewer is ignored
  const otherPostLike = {
    notification_icon: "heart_icon",
    timestamp_ms: "1760000001000",
    template: {
      __typename: "TimelineNotificationAggregateUserActions",
      from_users: [
        {
          user_results: {
            result: { __typename: "User", rest_id: "102", core: { screen_name: "liker_bob" } },
          },
        },
      ],
      target_objects: [
        {
          tweet_results: {
            result: { __typename: "Tweet", rest_id: "501", core: { user_results: { result: { rest_id: "8888", core: { screen_name: "other_user" } } } } },
          },
        },
      ],
    },
  };
  assert.deepStrictEqual(collectInbound(otherPostLike, ME), []);
});

test("collectInbound: multi-post like lower bound", () => {
  const json = {
    notification_icon: "heart_icon",
    timestamp_ms: "1760000002000",
    clientEventInfo: { element: "user_liked_multiple_tweets" },
    template: {
      __typename: "TimelineNotificationAggregateUserActions",
      from_users: [
        {
          user_results: {
            result: {
              __typename: "User",
              rest_id: "103",
              core: { screen_name: "liker_carol", name: "Carol Multi" },
            },
          },
        },
      ],
      target_objects: [
        {
          tweet_results: {
            result: {
              __typename: "Tweet",
              rest_id: "502",
              core: { user_results: { result: { rest_id: "9999", core: { screen_name: "viewer_jack" } } } },
            },
          },
        },
        {
          tweet_results: {
            result: {
              __typename: "Tweet",
              rest_id: "503",
              core: { user_results: { result: { rest_id: "9999", core: { screen_name: "viewer_jack" } } } },
            },
          },
        },
      ],
    },
  };

  const candidates = collectInbound(json, ME);
  assert.strictEqual(candidates.length, 2);
  assert.deepStrictEqual(candidates.map((c) => c.key), ["L:103:502", "L:103:503"]);
  assert.strictEqual(candidates[0].from.handle, "liker_carol");
  assert.strictEqual(candidates[1].from.handle, "liker_carol");
});

test("collectInbound: follows and new post alerts ignored", () => {
  const json = {
    instructions: [
      {
        notification_icon: "person_icon",
        clientEventInfo: { element: "users_followed_you" },
        template: {
          __typename: "TimelineNotificationAggregateUserActions",
          from_users: [{ user_results: { result: { rest_id: "104", core: { screen_name: "follower_dan" } } } }],
        },
      },
      {
        notification_icon: "bell_icon",
        clientEventInfo: { element: "device_follow_tweet_notification_entry" },
        template: {
          __typename: "TimelineNotificationAggregateUserActions",
          from_users: [{ user_results: { result: { rest_id: "105", core: { screen_name: "poster_eve" } } } }],
        },
      },
    ],
  };
  assert.deepStrictEqual(collectInbound(json, ME), []);
});

test("collectInbound: replies / quotes / mentions classified once with priority", () => {
  // 1. Post with reply + quote + mention -> classified as reply
  const replyQuoteMention = {
    __typename: "Tweet",
    rest_id: "701",
    core: { user_results: { result: { rest_id: "201", core: { screen_name: "user_a", name: "User A" } } } },
    legacy: {
      created_at: "Tue Oct 20 12:00:00 +0000 2026",
      in_reply_to_status_id_str: "501",
      in_reply_to_user_id_str: "9999",
      in_reply_to_screen_name: "viewer_jack",
      full_text: "@viewer_jack also quoting and mentioning @viewer_jack",
      display_text_range: [13, 53],
      entities: {
        user_mentions: [{ screen_name: "viewer_jack", id_str: "9999", indices: [41, 53] }],
      },
    },
    quoted_status_result: {
      result: {
        __typename: "Tweet",
        rest_id: "502",
        core: { user_results: { result: { rest_id: "9999", core: { screen_name: "viewer_jack" } } } },
      },
    },
  };

  const r1 = collectInbound(replyQuoteMention, ME);
  assert.strictEqual(r1.length, 1);
  assert.strictEqual(r1[0].kind, "reply");
  assert.strictEqual(r1[0].key, "P:701");
  assert.strictEqual(r1[0].from.handle, "user_a");

  // 2. Post with quote + mention (not a reply) -> classified as quote
  const quoteMention = {
    __typename: "Tweet",
    rest_id: "702",
    core: { user_results: { result: { rest_id: "202", core: { screen_name: "user_b", name: "User B" } } } },
    legacy: {
      created_at: "Tue Oct 20 12:00:00 +0000 2026",
      full_text: "Check this out @viewer_jack",
      display_text_range: [0, 27],
      entities: {
        user_mentions: [{ screen_name: "viewer_jack", id_str: "9999", indices: [15, 27] }],
      },
    },
    quoted_status_result: {
      result: {
        __typename: "Tweet",
        rest_id: "503",
        core: { user_results: { result: { rest_id: "9999", core: { screen_name: "viewer_jack" } } } },
      },
    },
  };

  const r2 = collectInbound(quoteMention, ME);
  assert.strictEqual(r2.length, 1);
  assert.strictEqual(r2[0].kind, "quote");
  assert.strictEqual(r2[0].key, "P:702");
  assert.strictEqual(r2[0].from.handle, "user_b");

  // 3. Post with mention only (not reply, not quote) -> classified as mention
  const mentionOnly = {
    __typename: "Tweet",
    rest_id: "703",
    core: { user_results: { result: { rest_id: "203", core: { screen_name: "user_c", name: "User C" } } } },
    legacy: {
      created_at: "Tue Oct 20 12:00:00 +0000 2026",
      full_text: "Shout out to @viewer_jack for the tool!",
      display_text_range: [0, 39],
      entities: {
        user_mentions: [{ screen_name: "viewer_jack", id_str: "9999", indices: [13, 25] }],
      },
    },
  };

  const r3 = collectInbound(mentionOnly, ME);
  assert.strictEqual(r3.length, 1);
  assert.strictEqual(r3[0].kind, "mention");
  assert.strictEqual(r3[0].key, "P:703");
  assert.strictEqual(r3[0].from.handle, "user_c");
});

test("collectInbound: the user's own posts ignored", () => {
  // Post by viewer_jack replying to someone
  const myPost = {
    __typename: "Tweet",
    rest_id: "704",
    core: { user_results: { result: { rest_id: "9999", core: { screen_name: "viewer_jack" } } } },
    legacy: {
      in_reply_to_status_id_str: "501",
      in_reply_to_user_id_str: "9999",
      in_reply_to_screen_name: "viewer_jack",
      full_text: "@viewer_jack self reply",
    },
  };
  assert.deepStrictEqual(collectInbound(myPost, ME), []);

  // Post by viewer_jack quoting viewer_jack
  const myQuote = {
    __typename: "Tweet",
    rest_id: "705",
    core: { user_results: { result: { rest_id: "9999", core: { screen_name: "viewer_jack" } } } },
    quoted_status_result: {
      result: {
        __typename: "Tweet",
        rest_id: "501",
        core: { user_results: { result: { rest_id: "9999", core: { screen_name: "viewer_jack" } } } },
      },
    },
  };
  assert.deepStrictEqual(collectInbound(myQuote, ME), []);
});

test("collectInbound: auto mentions of a reply not counted as mentions", () => {
  // 1. Reply to someone else; viewer_jack is in the leading auto-mentions
  const autoMention = {
    __typename: "Tweet",
    rest_id: "706",
    core: { user_results: { result: { rest_id: "204", core: { screen_name: "user_d" } } } },
    legacy: {
      in_reply_to_status_id_str: "400",
      in_reply_to_user_id_str: "8888",
      in_reply_to_screen_name: "other_user",
      full_text: "@other_user @viewer_jack Thanks for the reply!",
      display_text_range: [25, 46], // real text starts at index 25
      entities: {
        user_mentions: [
          { screen_name: "other_user", id_str: "8888", indices: [0, 11] },
          { screen_name: "viewer_jack", id_str: "9999", indices: [12, 24] }, // before display_text_range[0]
        ],
      },
    },
  };
  assert.deepStrictEqual(collectInbound(autoMention, ME), []);

  // 2. Reply to someone else; viewer_jack is mentioned in the actual text
  const realMentionInReply = {
    __typename: "Tweet",
    rest_id: "707",
    core: { user_results: { result: { rest_id: "205", core: { screen_name: "user_e", name: "User E" } } } },
    legacy: {
      created_at: "Tue Oct 20 12:00:00 +0000 2026",
      in_reply_to_status_id_str: "400",
      in_reply_to_user_id_str: "8888",
      in_reply_to_screen_name: "other_user",
      full_text: "@other_user Hey check what @viewer_jack built!",
      display_text_range: [12, 46],
      entities: {
        user_mentions: [
          { screen_name: "other_user", id_str: "8888", indices: [0, 11] },
          { screen_name: "viewer_jack", id_str: "9999", indices: [27, 39] }, // inside display_text_range
        ],
      },
    },
  };
  const res = collectInbound(realMentionInReply, ME);
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0].kind, "mention");
  assert.strictEqual(res[0].key, "P:707");
  assert.strictEqual(res[0].from.handle, "user_e");
});

test("collectInbound: parses test/fixtures/notifications.json fixture", () => {
  const candidates = collectInbound(notificationsFixture, ME);
  assert.strictEqual(candidates.length, 5);

  const byKey = Object.fromEntries(candidates.map((c) => [c.key, c]));
  assert.deepStrictEqual(Object.keys(byKey).sort(), [
    "L:102:501",
    "L:103:502",
    "L:103:503",
    "P:601",
    "P:602",
  ]);

  // Single like
  assert.deepStrictEqual(byKey["L:102:501"], {
    kind: "like",
    from: { handle: "liker_bob", id: "102", name: "Bob Liker" },
    key: "L:102:501",
    at: 1760000001000,
  });

  // Multi-post like
  assert.deepStrictEqual(byKey["L:103:502"], {
    kind: "like",
    from: { handle: "liker_carol", id: "103", name: "Carol Multi" },
    key: "L:103:502",
    at: 1760000002000,
  });
  assert.deepStrictEqual(byKey["L:103:503"], {
    kind: "like",
    from: { handle: "liker_carol", id: "103", name: "Carol Multi" },
    key: "L:103:503",
    at: 1760000002000,
  });

  // Reply 1
  assert.strictEqual(byKey["P:601"].kind, "reply");
  assert.strictEqual(byKey["P:601"].from.handle, "replier_frank");
  assert.strictEqual(byKey["P:601"].from.id, "106");

  // Reply 2
  assert.strictEqual(byKey["P:602"].kind, "reply");
  assert.strictEqual(byKey["P:602"].from.handle, "replier_grace");
  assert.strictEqual(byKey["P:602"].from.id, "107");
});

test("hook emits candidate inbound entries in n field", async () => {
  const listeners = {};
  const events = [];

  const fakeFetch = async () => ({
    ok: true,
    headers: { get: (h) => (h.toLowerCase() === "content-type" ? "application/json" : "") },
    clone: () => ({ json: async () => notificationsFixture }),
  });

  const ctx = {
    window: {
      fetch: fakeFetch,
      addEventListener(type, fn) {
        (listeners[type] = listeners[type] || []).push(fn);
      },
      dispatchEvent(event) {
        if (event.type === "xh-relations") {
          events.push(JSON.parse(event.detail));
        }
      },
    },
    document: {
      querySelector(sel) {
        if (sel === 'a[data-testid="AppTabBar_Profile_Link"]') {
          return { getAttribute: () => "/viewer_jack" };
        }
        return null;
      },
    },
    XMLHttpRequest: class {},
    CustomEvent: class {
      constructor(type, init) {
        this.type = type;
        this.detail = init && init.detail;
      }
    },
  };

  const code = fs.readFileSync(path.join(__dirname, "../src/page-hook.js"), "utf8");
  vm.runInNewContext(code, ctx);

  for (const fn of listeners["xh-ready"] || []) fn();

  await ctx.window.fetch("https://x.com/i/api/graphql/abc/NotificationsTimeline");
  await new Promise((r) => setTimeout(r, 0));

  assert.strictEqual(events.length, 1);
  assert.ok(Array.isArray(events[0].n));
  assert.strictEqual(events[0].n.length, 5);
  // Order is not guaranteed; check the kinds present.
  assert.ok(events[0].n.some((x) => x.kind === "like"));
  assert.ok(events[0].n.some((x) => x.kind === "reply"));
});
