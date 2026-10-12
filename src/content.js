// x-helper content script.
// Rule for this file: it only READS the page and the user's own clicks/typing, and shows hints.
// It never clicks, types, sends, likes or follows on the user's behalf.
(function () {
  const XH = globalThis.XH;
  const { store, sim, t } = XH;

  const SEL = {
    tweet: 'article[data-testid="tweet"]',
    userName: '[data-testid="User-Name"]',
    like: '[data-testid="like"]',
    unlike: '[data-testid="unlike"]',
    reply: '[data-testid="reply"]',
    send: '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]',
    textarea: '[data-testid^="tweetTextarea_"]',
  };

  let S = null; // cached state
  let pendingReply = null; // { handle, t } set when the user clicks a reply button
  let lastSendAt = 0;

  // ---------- helpers ----------

  function tweetInfo(article) {
    const time = article.querySelector('a[href*="/status/"] time');
    if (!time) return null;
    const href = time.closest("a").getAttribute("href");
    const parts = new URL(href, location.origin).pathname.split("/");
    const i = parts.indexOf("status");
    if (i < 1) return null;
    return {
      handle: parts[i - 1],
      id: parts[i + 1],
      time: Date.parse(time.getAttribute("datetime")),
      anchor: time.closest("a"),
    };
  }

  function pageStatusAuthor() {
    const m = location.pathname.match(/^\/([^/]+)\/status\/\d+/);
    return m ? m[1] : null;
  }

  function fmtAge(ms) {
    const m = Math.max(0, Math.floor(ms / 60000));
    if (m < 60) return t("age_min", { n: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t("age_hour", { n: h });
    return t("age_day", { n: Math.floor(h / 24) });
  }

  function fmtDuration(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h ? `${h}h${String(m).padStart(2, "0")}m` : `${m}m`;
  }

  // ---------- 3. post badges: age, past interactions, target accounts ----------

  function annotate(article) {
    const info = tweetInfo(article);
    if (!info) return;
    const now = Date.now();
    const s = S.settings;
    const p = S.people[info.handle.toLowerCase()];
    const isTarget = s.targets.some((h) => h.toLowerCase() === info.handle.toLowerCase());
    const stale = now - info.time > s.staleHours * 3600 * 1000;

    let parts = [fmtAge(now - info.time)];
    if (stale) parts.push(t("stale"));
    const rel = s.showRel && S.rel[info.handle.toLowerCase()];
    if (rel) {
      const key = rel.f && rel.fb ? "rel_mutual" : rel.f ? "rel_following" : rel.fb ? "rel_follower" : "rel_none";
      const old = now - rel.t > s.relStaleDays * 86400000;
      parts.push(t(key) + (old ? t("rel_stale") : ""));
    }
    if (p && p.likes + p.replies > 0) {
      const days = Math.floor((now - p.last) / 86400000);
      parts.push(
        t("interacted", {
          n: p.likes + p.replies,
          ago: days < 1 ? t("ago_today") : t("ago_days", { n: days }),
        })
      );
    }
    if (isTarget) parts.push("★ " + t("target"));
    const text = parts.join(" · ");

    let badge = article.querySelector(":scope .xh-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "xh-badge";
      const host = article.querySelector(SEL.userName) || info.anchor.parentElement;
      host.appendChild(badge);
    }
    if (badge.textContent !== text) badge.textContent = text;
    badge.classList.toggle("xh-stale", stale);
    article.classList.toggle("xh-target", isTarget);
  }

  function annotateAll() {
    if (!S) return;
    document.querySelectorAll(SEL.tweet).forEach(annotate);
  }

  // ---------- 6. counting the user's own actions ----------

  function composerText(container) {
    return Array.from(container.querySelectorAll(SEL.textarea))
      .map((el) => el.innerText.trim())
      .filter(Boolean)
      .join("\n");
  }

  function onSend(button) {
    const now = Date.now();
    if (now - lastSendAt < 1500) return; // click + Ctrl+Enter for the same send
    const dialog = button.closest('[role="dialog"]');
    const text = composerText(dialog || document);
    if (!text) return;
    lastSendAt = now;

    let kind = "post";
    let to = null;
    if (dialog && pendingReply && now - pendingReply.t < 10 * 60 * 1000) {
      kind = "reply";
      to = pendingReply.handle;
    } else if (!dialog && button.matches('[data-testid="tweetButtonInline"]') && pageStatusAuthor()) {
      kind = "reply";
      to = pageStatusAuthor();
    }
    pendingReply = null;
    hideDup();

    store.update((s) => {
      const d = store.today(s);
      if (kind === "reply") {
        d.replies++;
        const p = store.person(s, to);
        p.replies++;
        p.last = now;
      } else {
        d.posts++;
      }
      s.sent.push({ t: now, text, kind, to });
    });
  }

  document.addEventListener(
    "click",
    (e) => {
      const el = e.target.closest(
        [SEL.like, SEL.unlike, SEL.reply, SEL.send].join(",")
      );
      if (!el) return;
      const article = el.closest(SEL.tweet);
      const info = article && tweetInfo(article);

      if (el.matches(SEL.like) && info) {
        store.update((s) => {
          store.today(s).likes++;
          const p = store.person(s, info.handle);
          p.likes++;
          p.last = Date.now();
        });
      } else if (el.matches(SEL.unlike) && info) {
        store.update((s) => {
          const d = store.today(s);
          d.likes = Math.max(0, d.likes - 1);
          const p = store.person(s, info.handle);
          p.likes = Math.max(0, p.likes - 1);
        });
      } else if (el.matches(SEL.reply) && info) {
        pendingReply = { handle: info.handle, t: Date.now() };
      } else if (el.matches(SEL.send)) {
        onSend(el);
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyH") {
        e.preventDefault();
        store.update((s) => (s.settings.hud = !s.settings.hud));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && e.target.closest(SEL.textarea)) {
        const scope = e.target.closest('[role="dialog"]') || document;
        const button = scope.querySelector(SEL.send);
        if (button) onSend(button);
      }
    },
    true
  );

  // ---------- 4. duplicate-reply warning ----------

  let dupEl = null;
  let dupTimer = null;

  function showDup(title, body, quote) {
    if (!dupEl) {
      dupEl = document.createElement("div");
      dupEl.className = "xh-dup";
      dupEl.setAttribute("role", "status");
      document.body.appendChild(dupEl);
    }
    dupEl.replaceChildren();
    const h = document.createElement("strong");
    h.textContent = "⚠ " + title;
    const b = document.createElement("div");
    b.textContent = body;
    dupEl.append(h, b);
    if (quote) {
      const q = document.createElement("blockquote");
      q.textContent = quote.length > 80 ? quote.slice(0, 80) + "…" : quote;
      dupEl.append(q);
    }
    dupEl.hidden = false;
  }

  function hideDup() {
    if (dupEl) dupEl.hidden = true;
  }

  function checkDup(text) {
    if (!S) return;
    const s = S.settings;
    const recent = S.sent.slice(-s.dupWindow);
    const len = sim.normalize(text).length;
    if (len === 0) return hideDup();

    if (len <= 6) {
      const c = sim.countExact(text, recent);
      if (c >= s.repeatShort - 1) {
        return showDup(t("dup_title"), t("dup_repeat", { text: text.trim(), n: c }));
      }
      return hideDup();
    }
    const best = sim.findSimilar(text, recent, s.dupThreshold);
    if (!best) return hideDup();
    showDup(
      t("dup_title"),
      t("dup_body", {
        score: Math.round(best.score * 100),
        ago: XH.ago(best.item.t),
        to: best.item.to ? "@" + best.item.to : t("hud_posts"),
      }),
      best.item.text
    );
  }

  document.addEventListener(
    "input",
    (e) => {
      const box = e.target.closest && e.target.closest(SEL.textarea);
      if (!box) return;
      clearTimeout(dupTimer);
      dupTimer = setTimeout(() => checkDup(box.innerText), 400);
    },
    true
  );

  // ---------- 6. HUD and time on X ----------

  let hudEl = null;

  function renderHud() {
    if (!S) return;
    if (!S.settings.hud) {
      if (hudEl) hudEl.hidden = true;
      return;
    }
    if (!hudEl) {
      hudEl = document.createElement("div");
      hudEl.className = "xh-hud";
      hudEl.title = t("hud_hint");
      document.body.appendChild(hudEl);
    }
    const d = S.days[store.dayKey()] || { likes: 0, replies: 0, posts: 0, seconds: 0 };
    const goal = S.settings.dailyReplyGoal;
    const replies = goal ? `${d.replies}/${goal}` : String(d.replies);
    hudEl.textContent =
      `❤ ${d.likes} ${t("hud_likes")} · 💬 ${replies} ${t("hud_replies")} · ` +
      `📝 ${d.posts} ${t("hud_posts")} · ⏱ ${fmtDuration(d.seconds)} ${t("hud_time")}`;
    hudEl.classList.toggle("xh-goal-met", !!goal && d.replies >= goal);
    hudEl.hidden = false;
  }

  const TICK = 15;
  setInterval(() => {
    if (document.visibilityState === "visible" && document.hasFocus()) {
      store.update((s) => (store.today(s).seconds += TICK));
    }
  }, TICK * 1000);

  // ---------- follow relationships (read from X's own responses by page-hook.js) ----------

  let relPending = {};
  let relTimer = null;

  window.addEventListener("xh-relations", (e) => {
    let users;
    try {
      users = JSON.parse(e.detail);
    } catch (_) {
      return;
    }
    const now = Date.now();
    for (const u of users) {
      relPending[u.handle.toLowerCase()] = { f: u.following, fb: u.followedBy, id: u.id, t: now };
    }
    clearTimeout(relTimer);
    relTimer = setTimeout(() => {
      const batch = relPending;
      relPending = {};
      store.update((s) => {
        Object.assign(s.rel, batch);
        s.relMeta.last = Date.now();
      });
    }, 1000);
  });

  // ---------- wiring ----------

  let annotateTimer = null;
  new MutationObserver(() => {
    clearTimeout(annotateTimer);
    annotateTimer = setTimeout(annotateAll, 250);
  }).observe(document.body, { childList: true, subtree: true });

  store.onChange((s) => {
    S = s;
    annotateAll();
    renderHud();
  });

  store.get().then((s) => {
    S = s;
    annotateAll();
    renderHud();
  });

  // Ask page-hook.js to replay relationships it saw before this script loaded.
  window.dispatchEvent(new CustomEvent("xh-ready"));

  // Refresh ages once a minute.
  setInterval(annotateAll, 60000);
})();
