(async function () {
  const { store } = globalThis.XH;
  const s = await store.get();
  const rows = document.getElementById("rows");
  const head = document.getElementById("head");
  for (const k of ["hud_day", "hud_likes", "hud_replies", "hud_posts", "hud_follows", "hud_unfollows", "hud_time"]) {
    const th = document.createElement("th");
    th.textContent = XH.t(k);
    head.appendChild(th);
  }
  const todayKey = store.dayKey();

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = store.dayKey(d);
    const v = { likes: 0, replies: 0, posts: 0, follows: 0, unfollows: 0, seconds: 0, ...(s.days[k] || {}) };
    const tr = document.createElement("tr");
    if (k === todayKey) tr.className = "today";
    const mins = Math.round(v.seconds / 60);
    const time = `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
    for (const cell of [k.slice(5), v.likes, v.replies, v.posts, v.follows, v.unfollows, time]) {
      const td = document.createElement("td");
      td.textContent = cell;
      if (cell === 0 || cell === "0:00") td.className = "zero";
      tr.appendChild(td);
    }
    rows.appendChild(tr);
  }

  // Opens the "not following you back" panel in the current x.com tab (same as Alt+U there).
  const nfb = document.getElementById("nfb");
  nfb.textContent = XH.t("nfb_title") + " (Alt+U)";
  nfb.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "xh-panel" });
      window.close();
    } catch (_) {
      const msg = document.getElementById("nfb-msg");
      msg.textContent = XH.lang === "zh" ? "先打开 x.com 再点。" : "Open x.com first.";
      msg.hidden = false;
    }
  });

  document.getElementById("opts").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
})();
