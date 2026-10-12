// Tiny i18n: Chinese when the browser language is zh*, English otherwise.
(function () {
  const XH = (globalThis.XH = globalThis.XH || {});

  const dict = {
    en: {
      age_min: "{n}m",
      age_hour: "{n}h",
      age_day: "{n}d",
      stale: "old post",
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
      follow_pick: "Select a post first (j / k), then Shift+F",
      follow_already: "You already follow @{h}",
      follow_opening: "Opening @{h}…",
      follow_confirm: "Enter to follow @{h} · Esc to cancel",
      follow_done: "Followed @{h}",
      follow_missing: "Couldn't find the Follow button. X may have changed; please report it.",
      follow_limit: "Over {n} follows today. Following fast can get the account limited.",
      hud_hint: "Alt+H to hide",
      rel_mutual: "⇄ mutual",
      rel_following: "→ you follow",
      rel_follower: "← follows you",
      rel_none: "not following",
      rel_stale: "(old)",
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
      follow_pick: "先用 j / k 选中一条帖子，再按 Shift+F",
      follow_already: "已经关注了 @{h}",
      follow_opening: "正在打开 @{h} 的资料卡…",
      follow_confirm: "按 Enter 关注 @{h} · Esc 取消",
      follow_done: "已关注 @{h}",
      follow_missing: "没找到关注按钮，可能是 X 改版了，告诉作者一声",
      follow_limit: "今天已关注超过 {n} 个，关注太快可能被限流",
      hud_hint: "Alt+H 隐藏",
      rel_mutual: "⇄ 互关",
      rel_following: "→ 我关注他",
      rel_follower: "← 他关注我",
      rel_none: "未关注",
      rel_stale: "（可能过时）",
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
