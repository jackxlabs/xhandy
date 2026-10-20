const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { collectCreated } = require("../src/page-hook.js");

const POST_URL = "https://x.com/i/api/graphql/abc123_xyz/CreateTweet";
const NOTE_URL = "https://x.com/i/api/graphql/abc123_xyz/CreateNoteTweet";

test("collectCreated parses successful reply with display range and unicode code points", () => {
  // Made-up account & text structure matching task 1.1 findings
  const json = {
    data: {
      create_tweet: {
        tweet_results: {
          result: {
            legacy: {
              full_text: "@alice @bob 👍 Great job on the release!",
              display_text_range: [12, 39], // code point indices (skips mentions, includes emoji)
              in_reply_to_status_id_str: "1001",
              in_reply_to_screen_name: "alice",
              is_quote_status: false,
            },
          },
        },
      },
    },
  };
  const r = collectCreated(POST_URL, json, true);
  assert.deepStrictEqual(r, {
    ok: true,
    kind: "reply",
    text: "👍 Great job on the release!",
    to: "alice",
    inReplyTo: "1001",
  });
});

test("collectCreated parses quote post as kind post without target", () => {
  const json = {
    data: {
      create_tweet: {
        tweet_results: {
          result: {
            legacy: {
              full_text: "Sharing this thoughtful write-up https://t.co/fake123",
              display_text_range: [0, 53],
              in_reply_to_status_id_str: null,
              in_reply_to_screen_name: null,
              is_quote_status: true,
            },
          },
        },
      },
    },
  };
  const r = collectCreated(POST_URL, json, true);
  assert.deepStrictEqual(r, {
    ok: true,
    kind: "post",
    text: "Sharing this thoughtful write-up https://t.co/fake123",
    to: null,
    inReplyTo: null,
  });
});

test("collectCreated parses long post via CreateNoteTweet", () => {
  const json = {
    data: {
      notetweet_create: {
        tweet_results: {
          result: {
            note_tweet: {
              note_tweet_results: {
                result: {
                  text: "This is a detailed long-form note tweet that exceeds the usual length limits.",
                },
              },
            },
            legacy: {
              full_text: "This is a detailed...",
              in_reply_to_status_id_str: null,
            },
          },
        },
      },
    },
  };
  const r = collectCreated(NOTE_URL, json, true);
  assert.deepStrictEqual(r, {
    ok: true,
    kind: "post",
    text: "This is a detailed long-form note tweet that exceeds the usual length limits.",
    to: null,
    inReplyTo: null,
  });
});

test("collectCreated unwraps TweetWithVisibilityResults without requiring __typename on result", () => {
  const json = {
    data: {
      create_tweet: {
        tweet_results: {
          result: {
            __typename: "TweetWithVisibilityResults",
            tweet: {
              legacy: {
                full_text: "Post wrapped inside visibility results",
                display_text_range: [0, 38],
                in_reply_to_status_id_str: null,
              },
            },
          },
        },
      },
    },
  };
  const r = collectCreated(POST_URL, json, true);
  assert.deepStrictEqual(r, {
    ok: true,
    kind: "post",
    text: "Post wrapped inside visibility results",
    to: null,
    inReplyTo: null,
  });
});

test("collectCreated decodes HTML entities &amp; &lt; &gt;", () => {
  const json = {
    data: {
      create_tweet: {
        tweet_results: {
          result: {
            legacy: {
              full_text: "Tips: 1 &lt; 2 &amp;&amp; 5 &gt; 3",
              display_text_range: [0, 34],
              in_reply_to_status_id_str: null,
            },
          },
        },
      },
    },
  };
  const r = collectCreated(POST_URL, json, true);
  assert.deepStrictEqual(r, {
    ok: true,
    kind: "post",
    text: "Tips: 1 < 2 && 5 > 3",
    to: null,
    inReplyTo: null,
  });
});

test("collectCreated returns { ok: false } for failed or error responses", () => {
  assert.deepStrictEqual(collectCreated(POST_URL, null, false), { ok: false });
  assert.deepStrictEqual(collectCreated(POST_URL, { errors: [{ code: 187, message: "Status is a duplicate." }] }, true), { ok: false });
  assert.deepStrictEqual(collectCreated(POST_URL, "not json", true), { ok: false });
  assert.deepStrictEqual(collectCreated(POST_URL, { errors: [{ code: 88, message: "Rate limit exceeded" }] }, false), { ok: false });
});

test("collectCreated returns { shape: 'unknown' } for 200 without errors or recognisable result", () => {
  assert.deepStrictEqual(collectCreated(POST_URL, {}, true), { shape: "unknown" });
  assert.deepStrictEqual(collectCreated(POST_URL, { data: {} }, true), { shape: "unknown" });
  assert.deepStrictEqual(collectCreated(POST_URL, { data: { create_tweet: { tweet_results: {} } } }, true), { shape: "unknown" });
});

test("collectCreated returns null for other URLs", () => {
  assert.strictEqual(collectCreated("https://x.com/i/api/graphql/abc/HomeTimeline", {}, true), null);
  assert.strictEqual(collectCreated("https://x.com/i/api/1.1/friendships/create.json", {}, true), null);
  assert.strictEqual(collectCreated("https://x.com/home", {}, true), null);
  assert.strictEqual(collectCreated(null, {}, true), null);
});

// Helper to run page-hook.js in a fake browser world
function setupHookContext(fakeFetch = null) {
  const events = [];
  const listeners = {};
  const window = {
    addEventListener: (evt, fn) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    dispatchEvent: (evt) => {
      events.push(JSON.parse(evt.detail));
    },
    fetch: fakeFetch || (async () => ({ ok: true, headers: { get: () => "" } })),
  };

  class FakeXHR {
    constructor() {
      this.listeners = {};
      this.status = 200;
      this.responseType = "";
      this.responseText = "";
      this.response = null;
    }
    addEventListener(evt, fn) {
      this.listeners[evt] = this.listeners[evt] || [];
      this.listeners[evt].push(fn);
    }
    trigger(evt) {
      for (const fn of this.listeners[evt] || []) fn.call(this);
    }
    open(method, url) {}
    send(body) {}
  }

  class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  }

  const ctx = {
    window,
    XMLHttpRequest: FakeXHR,
    CustomEvent,
    Date,
    Number,
    Array,
    String,
    JSON,
    Map,
    Boolean,
    console,
  };

  const code = fs.readFileSync(path.join(__dirname, "../src/page-hook.js"), "utf8");
  vm.runInNewContext(code, ctx);

  // Signal xh-ready so events dispatch immediately instead of buffering
  for (const fn of listeners["xh-ready"] || []) fn();

  return { window, FakeXHR, events };
}

// The hook reads a clone of the response after X's own promise settles, so let those callbacks run.
const flush = () => new Promise((r) => setTimeout(r, 0));

test("fetch wrapper emits { seen: true } on post start and { ok: false } on post failure, preserving non-post behavior", async () => {
  const fakeFetch = async (url) => {
    if (url.includes("HomeTimeline")) {
      return {
        ok: true,
        headers: { get: (h) => (h.toLowerCase() === "content-type" ? "application/json" : "") },
        clone: () => ({
          json: async () => ({
            __typename: "User",
            core: { screen_name: "alice", name: "Alice" },
            relationship_perspectives: { following: true, followed_by: true },
          }),
        }),
      };
    }
    if (url.includes("error_timeline")) {
      return {
        ok: false,
        headers: { get: () => "application/json" },
        clone: () => ({ json: async () => ({ errors: [{ message: "failed" }] }) }),
      };
    }
    return {
      ok: false,
      headers: { get: () => "application/json" },
      clone: () => ({ json: async () => ({ errors: [{ message: "failed" }] }) }),
    };
  };

  const { window, events } = setupHookContext(fakeFetch);

  // 1. Post mutation: emits seen immediately on start, ok: false on failure
  const p = window.fetch("https://x.com/i/api/graphql/xyz/CreateTweet");
  assert.strictEqual(events.length, 1);
  assert.deepStrictEqual(events[0].c, [{ seen: true }]);

  await p;
  await flush();
  assert.strictEqual(events.length, 2);
  assert.deepStrictEqual(events[1].c, [{ ok: false }]);

  // 2. Non-post URL failure: keeps today's behavior, emits nothing
  await window.fetch("https://x.com/i/api/graphql/xyz/error_timeline");
  await flush();
  assert.strictEqual(events.length, 2, "non-post failures emit nothing");

  // 3. Successful non-post timeline response still emits its relations exactly as before
  await window.fetch("https://x.com/i/api/graphql/xyz/HomeTimeline");
  await flush();
  assert.strictEqual(events.length, 3, "non-post timeline response emits relations");
  assert.deepStrictEqual(events[2].u, [
    { handle: "alice", name: "Alice", id: null, following: true, followedBy: true },
  ]);
  assert.deepStrictEqual(events[2].c, []);
});

test("XHR wrapper emits { seen: true } on open and { ok: false } on post failure, preserving non-post behavior", () => {
  const { FakeXHR, events } = setupHookContext();

  const xhr = new FakeXHR();
  xhr.open("POST", "https://x.com/i/api/graphql/xyz/CreateTweet");
  // Immediately emits { seen: true } inside open()
  assert.strictEqual(events.length, 1);
  assert.deepStrictEqual(events[0].c, [{ seen: true }]);

  xhr.send();

  xhr.status = 500;
  xhr.responseText = JSON.stringify({ errors: [{ message: "Server error" }] });
  xhr.trigger("load");

  assert.strictEqual(events.length, 2);
  assert.deepStrictEqual(events[1].c, [{ ok: false }]);

  // Non-post XHR failure: emits nothing
  const nonPost = new FakeXHR();
  nonPost.open("GET", "https://x.com/i/api/graphql/xyz/HomeTimeline");
  assert.strictEqual(events.length, 2, "no seen emitted for non-post open");
  nonPost.send();
  nonPost.status = 500;
  nonPost.trigger("load");
  assert.strictEqual(events.length, 2, "non-post XHR failure emits nothing");
});
