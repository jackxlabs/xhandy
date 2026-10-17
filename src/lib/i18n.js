// Tiny i18n: Chinese when the browser language is zh*, English otherwise.
(function () {
  const XH = (globalThis.XH = globalThis.XH || {});

  const dict = {
    en: {
      age_min: "{n}m",
      age_hour: "{n}h",
      age_day: "{n}d",
      stale: "old post",
      per_hour: "{n}/h",
      interacted: "you: {n}× · {ago}",
      ago_today: "today",
      ago_days: "{n}d ago",
      target: "target",
      dup_title: "Similar to a reply you already sent",
      dup_body: "{score}% similar to what you sent {ago} to {to}:",
      dup_repeat: "You have sent “{text}” {n} times recently",
      hud_likes: "likes",
      hud_replies: "replies",
      hud_posts: "posts",
      hud_time: "on X",
      hud_follows: "follows",
      hud_unfollows: "unfollows",
      hud_day: "Day",
      follow_pick: "Select a post first (j / k), then Shift+F",
      follow_already: "You already follow @{h}",
      follow_confirm: "Enter to follow @{h} · Esc to cancel",
      follow_done: "Followed @{h}",
      follow_profile: "Opening @{h}'s profile…",
      follow_confirm_profile: "Enter to follow @{h} · Esc to cancel · Alt+← back",
      follow_done_profile: "Followed @{h} · Alt+← back to the timeline",
      follow_missing: "Couldn't find the Follow button. X may have changed; please report it.",
      follow_limit: "Over {n} follows today. Following fast can get the account limited.",
      hud_hint: "Alt+H to hide",
      rel_mutual: "⇄ mutual",
      rel_following: "→ you follow",
      rel_follower: "← follows you",
      rel_none: "not following",
      rel_stale: "(old)",
      nfb_title: "Not following you back",
      nfb_hint: "From data X has already shown this browser. For the full list, open {link} and scroll to the bottom.",
      nfb_link: "your Following page",
      nfb_scan: "Following page last read {ago}.",
      nfb_noscan: "Your Following page hasn't been read yet, so this list is partial.",
      nfb_suspect: "None of the {n} accounts you follow is marked as following you back. X may have changed its data, so don't trust this list.",
      nfb_search: "Search name or @handle",
      nfb_empty: "Nobody here.",
      nfb_more: "Showing {n} of {total}. Search to narrow it down.",
      nfb_seen: "seen {ago}",
      nfb_you: "you: {n}×",
      nfb_footer: "Check the profile before you unfollow. Xhandy never unfollows anyone. Unfollows today: {n}/{limit}.",
      nfb_close: "Close (Esc)",
      unfollow_done: "Unfollowed @{h}",
      unfollow_limit: "Over {n} unfollows today. Unfollowing fast can get the account limited.",
      just_now: "just now",
      mins_ago: "{n} min ago",
      hours_ago: "{n} h ago",
      days_ago: "{n} d ago",
    },
    zh: {
      age_min: "{n}分钟",
      age_hour: "{n}小时",
      age_day: "{n}天",
      stale: "旧帖",
      per_hour: "{n}/时",
      interacted: "互动{n}次 · {ago}",
      ago_today: "今天",
      ago_days: "{n}天前",
      target: "关注对象",
      dup_title: "和你发过的回复很像",
      dup_body: "和你{ago}发给 {to} 的回复相似 {score}%：",
      dup_repeat: "最近已经发过 {n} 次「{text}」",
      hud_likes: "赞",
      hud_replies: "回复",
      hud_posts: "发帖",
      hud_time: "在线",
      hud_follows: "关注",
      hud_unfollows: "取关",
      hud_day: "日期",
      follow_pick: "先用 j / k 选中一条帖子，再按 Shift+F",
      follow_already: "已经关注了 @{h}",
      follow_confirm: "按 Enter 关注 @{h} · Esc 取消",
      follow_done: "已关注 @{h}",
      follow_profile: "正在打开 @{h} 的主页…",
      follow_confirm_profile: "按 Enter 关注 @{h} · Esc 取消 · Alt+← 返回",
      follow_done_profile: "已关注 @{h} · 按 Alt+← 回到时间线",
      follow_missing: "没找到关注按钮，可能是 X 改版了，告诉作者一声",
      follow_limit: "今天已关注超过 {n} 个，关注太快可能被限流",
      hud_hint: "Alt+H 隐藏",
      rel_mutual: "⇄ 互关",
      rel_following: "→ 我关注他",
      rel_follower: "← 他关注我",
      rel_none: "未关注",
      rel_stale: "（可能过时）",
      nfb_title: "我关注了、没回关我的",
      nfb_hint: "依据 X 已经发给这个浏览器的数据。要完整名单，打开{link}一直滚到底。",
      nfb_link: "我的「正在关注」页",
      nfb_scan: "「正在关注」页上次读取：{ago}。",
      nfb_noscan: "还没读过你的「正在关注」页，这份名单不完整。",
      nfb_suspect: "你关注的 {n} 个账号里没有一个显示回关了你，可能是 X 改了数据格式，先别信这份名单。",
      nfb_search: "搜索名字或 @handle",
      nfb_empty: "没有。",
      nfb_more: "显示 {n} / {total} 个，用搜索缩小范围。",
      nfb_seen: "{ago}看到",
      nfb_you: "互动{n}次",
      nfb_footer: "取关前先点进主页确认。Xhandy 不会取关任何人。今天已取关 {n}/{limit}。",
      nfb_close: "关闭（Esc）",
      unfollow_done: "已取关 @{h}",
      unfollow_limit: "今天已取关超过 {n} 个，取关太快可能被限流",
      just_now: "刚刚",
      mins_ago: "{n}分钟前",
      hours_ago: "{n}小时前",
      days_ago: "{n}天前",
    },
  };

  const lang =
    (globalThis.navigator && /^zh/i.test(navigator.language || "")) ? "zh" : "en";

  XH.lang = lang;
  XH.t = function (key, vars) {
    let s = (dict[lang] && dict[lang][key]) || dict.en[key] || key;
    if (vars) for (const k in vars) s = s.replaceAll("{" + k + "}", String(vars[k]));
    return s;
  };

  // Compact counts: 1.2K / 15K / 1.2M, or 3400 / 1.5万 / 120万 in Chinese.
  XH.compact = function (n) {
    const r = (x) => (x < 10 ? Math.round(x * 10) / 10 : Math.round(x));
    if (lang === "zh") {
      if (n >= 1e8) return r(n / 1e8) + "亿";
      if (n >= 1e4) return r(n / 1e4) + "万";
      return String(Math.round(n));
    }
    if (n >= 1e6) return r(n / 1e6) + "M";
    if (n >= 1e3) return r(n / 1e3) + "K";
    return String(Math.round(n));
  };

  // "3 h ago" style, for timestamps in ms.
  XH.ago = function (ts, now = Date.now()) {
    const m = Math.floor((now - ts) / 60000);
    if (m < 1) return XH.t("just_now");
    if (m < 60) return XH.t("mins_ago", { n: m });
    const h = Math.floor(m / 60);
    if (h < 24) return XH.t("hours_ago", { n: h });
    return XH.t("days_ago", { n: Math.floor(h / 24) });
  };
})();
