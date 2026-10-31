(async function () {
  const { store } = globalThis.XH;
  const s = (await store.get()) || {};
  if (s.settings) {
    XH.setLang(XH.resolveLang(s.settings.lang, navigator.language));
  }
  document.documentElement.lang = XH.lang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = XH.t(el.getAttribute("data-i18n"));
  });

  // Header settings button
  const optsBtn = document.getElementById("opts");
  if (optsBtn) {
    optsBtn.replaceChildren(XH.icon("gear", 16));
    optsBtn.title = XH.t("pop_opts");
    optsBtn.setAttribute("aria-label", XH.t("pop_opts"));
    optsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  // Footer lock icon
  const lockIcon = document.getElementById("lock-icon");
  if (lockIcon) {
    lockIcon.replaceChildren(XH.icon("lock", 13));
  }

  // Chevrons on entry rows
  const keysChevron = document.getElementById("keys-chevron");
  if (keysChevron) {
    keysChevron.replaceChildren(XH.icon("chevron", 14));
  }
  const nfbChevron = document.getElementById("nfb-chevron");
  if (nfbChevron) {
    nfbChevron.replaceChildren(XH.icon("chevron", 14));
  }

  // 1. Today card
  const todayKey = store.dayKey();
  const todayDateEl = document.getElementById("today-date");
  if (todayDateEl) {
    todayDateEl.textContent = new Date().toLocaleDateString(XH.lang === "zh" ? "zh-CN" : "en", { month: "short", day: "numeric", weekday: "short" });
  }

  const todayData = {
    likes: 0,
    replies: 0,
    posts: 0,
    follows: 0,
    seconds: 0,
    ...((s.days && s.days[todayKey]) || {}),
  };

  const likesEl = document.getElementById("today-likes");
  if (likesEl) likesEl.textContent = String(todayData.likes || 0);

  const repliesEl = document.getElementById("today-replies");
  if (repliesEl) repliesEl.textContent = String(todayData.replies || 0);

  const postsEl = document.getElementById("today-posts");
  if (postsEl) postsEl.textContent = String(todayData.posts || 0);

  const followsEl = document.getElementById("today-follows");
  if (followsEl) followsEl.textContent = String(todayData.follows || 0);

  const timeEl = document.getElementById("today-time");
  if (timeEl) {
    const sec = todayData.seconds || 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    timeEl.textContent = `${h}:${String(m).padStart(2, "0")}`;
  }

  // 2. Seven-day replies chart
  const chartBars = document.getElementById("chart-bars");
  const chartLabels = document.getElementById("chart-labels");
  const chartTotalEl = document.getElementById("chart-total");
  const chartAvgEl = document.getElementById("chart-avg");

  const days = [];
  let totalReplies = 0;
  let maxReplies = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = store.dayKey(d);
    const count = (s.days && s.days[key] && s.days[key].replies) || 0;
    totalReplies += count;
    if (count > maxReplies) maxReplies = count;
    days.push({
      date: d,
      key,
      count,
      isToday: i === 0,
    });
  }

  if (chartTotalEl) chartTotalEl.textContent = String(totalReplies);
  if (chartAvgEl) {
    const avg = totalReplies / 7;
    chartAvgEl.textContent = avg === 0 ? "0" : avg % 1 === 0 ? String(avg) : avg.toFixed(1);
  }

  const maxVal = Math.max(maxReplies, 1);

  if (chartBars && chartLabels) {
    chartBars.replaceChildren();
    chartLabels.replaceChildren();

    const dayNamesEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayNamesZh = ["日", "一", "二", "三", "四", "五", "六"];
    const dayNames = XH.lang === "zh" ? dayNamesZh : dayNamesEn;

    for (const day of days) {
      const col = document.createElement("div");
      col.className = "chart-col" + (day.isToday ? " is-today" : "");
      col.title = `${day.key}: ${day.count} ${XH.t("hud_replies")}`;

      const barWrap = document.createElement("div");
      barWrap.className = "chart-bar-wrap";

      const bar = document.createElement("div");
      bar.className = "chart-bar" + (day.count > 0 ? " has-replies" : "");
      const pct = Math.max(day.count > 0 ? 8 : 4, Math.round((day.count / maxVal) * 100));
      bar.style.height = pct + "%";

      barWrap.appendChild(bar);
      col.appendChild(barWrap);
      chartBars.appendChild(col);

      const label = document.createElement("div");
      label.className = "chart-day-label" + (day.isToday ? " is-today" : "");
      label.textContent = dayNames[day.date.getDay()];
      chartLabels.appendChild(label);
    }
  }

  // 3. Entry rows
  const meHandle = (s.relMeta && s.relMeta.me && s.relMeta.me.handle) || null;
  const nfbRows = store.notFollowingBack(s.rel, meHandle);
  const nfbCount = nfbRows.length;

  const quietDays = (s.settings && s.settings.quietDays) || 14;
  const keyRows = store.quietKeys(s.keys, s.people, quietDays, Date.now());
  const quietCount = keyRows.filter((item) => item.isQuiet).length;

  const keysCountEl = document.getElementById("keys-count");
  if (keysCountEl) {
    keysCountEl.textContent = XH.t("key_quiet_count", { n: quietCount });
    if (quietCount > 0) keysCountEl.classList.add("has-count");
  }

  const nfbCountEl = document.getElementById("nfb-count");
  if (nfbCountEl) {
    nfbCountEl.textContent = String(nfbCount);
    if (nfbCount > 0) nfbCountEl.classList.add("has-count");
  }

  // Hide entries when their feature is off
  if (s.settings && s.settings.keyAccounts === false) {
    const keysEntry = document.getElementById("keys");
    if (keysEntry) keysEntry.hidden = true;
  }

  // Click handlers
  const nfb = document.getElementById("nfb");
  if (nfb) {
    nfb.addEventListener("click", async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) throw new Error("No active tab");
        await chrome.tabs.sendMessage(tab.id, { type: "xh-panel", mode: "nfb" });
        window.close();
      } catch (_) {
        const msg = document.getElementById("nfb-msg");
        if (msg) {
          msg.textContent = XH.t("pop_open_x");
          msg.hidden = false;
        }
      }
    });
  }

  const keysBtn = document.getElementById("keys");
  if (keysBtn) {
    keysBtn.addEventListener("click", async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) throw new Error("No active tab");
        await chrome.tabs.sendMessage(tab.id, { type: "xh-panel", mode: "keys" });
        window.close();
      } catch (_) {
        const msg = document.getElementById("nfb-msg");
        if (msg) {
          msg.textContent = XH.t("pop_open_x");
          msg.hidden = false;
        }
      }
    });
  }
})();