// Top posts: builds the x.com search URL for an account's best-received posts. No network calls.
(function () {
  // min_faves from the author's follower count; 10 when the count is unknown.
  function topThreshold(followers) {
    if (!Number.isFinite(followers) || followers < 0) {
      return 10;
    }
    if (followers < 1000) return 3;
    if (followers < 10000) return 10;
    if (followers < 100000) return 50;
    if (followers < 1000000) return 200;
    return 1000;
  }

  // X's own search, sorted by Top, for the account's popular original posts.
  function topPostsUrl(handle, followers) {
    const cleanHandle = String(handle || "")
      .trim()
      .replace(/^@/, "");
    const n = topThreshold(followers);
    const query = `from:${cleanHandle} min_faves:${n} -filter:replies`;
    return `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=top`;
  }

  const api = { topThreshold, topPostsUrl };
  const XH = (globalThis.XH = globalThis.XH || {});
  XH.topPosts = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
