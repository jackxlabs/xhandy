// Xhandy content script.
// Rule for this file: it only READS the page and the user's own clicks/typing, and shows hints.
// It never clicks, types, sends, likes or follows on the user's behalf. The follow assistant
// only finds and focuses X's own Follow button; the user presses Enter.
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
    followBtn: '[data-testid$="-follow"]',
    unfollowBtn: '[data-testid$="-unfollow"]',
    profileLink: 'a[data-testid="AppTabBar_Profile_Link"]',
  };

  let S = null; // cached state
  const views = new Map(); // post id -> { n: views, at: when X reported it }; memory only
  const replyCounts = new Map(); // post id -> replies count; memory only
  const authorFollowers = new Map(); // post id -> author followers count; memory only
  const MAX_VIEWS = 5000;
  let pendingReply = null; // { handle, t } set when the user clicks a reply button
  let lastSendAt = 0;
  let lastSendText = "";

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

  // h:mm, like a clock, so the stats bar keeps a steady width.
  function fmtDuration(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}:${String(m).padStart(2, "0")}`;
  }

  // Views per hour since posting, from the count X sent with the post. Posts under 30 min old
  // count as 30 min so a handful of early views doesn't look like a spike.
  function viewsPerHour(info) {
    const v = views.get(info.id);
    if (!v || !info.time) return null;
    const hours = Math.max(0.5, (v.at - info.time) / 3600000);
    return v.n / hours;
  }

  // ---------- 3. post badges: age, heat, past interactions, target accounts ----------

  function annotate(article) {
    const info = tweetInfo(article);
    if (!info) return;
    const now = Date.now();
    const s = S.settings;
    const p = S.people[info.handle.toLowerCase()];
    const isTarget = s.targets.some((h) => h.toLowerCase() === info.handle.toLowerCase());
    const stale = now - info.time > s.staleHours * 3600 * 1000;

    // Each chip: [kind, text]. Kind picks the colour in content.css.
    const rate = s.showHeat ? viewsPerHour(info) : null;
    const heat = rate == null ? "age" : rate >= s.heatHot ? "hot" : rate >= s.heatWarm ? "warm" : "age";
    let ageText = (heat === "hot" && !stale ? "🔥 " : "") + fmtAge(now - info.time);
    if (rate != null) ageText += " · " + t("per_hour", { n: XH.compact(rate) });
    if (stale) ageText += " · " + t("stale");
    const chips = [[stale ? "stale" : heat, ageText]];
    const rel = s.showRel && S.rel[info.handle.toLowerCase()];
    if (rel) {
      const key = rel.f && rel.fb ? "mutual" : rel.f ? "following" : rel.fb ? "follower" : "none";
      const old = now - rel.t > s.relStaleDays * 86400000;
      chips.push(["rel-" + key, t("rel_" + key) + (old ? t("rel_stale") : "")]);
    }
    if (p && p.likes + p.replies > 0) {
      const days = Math.floor((now - p.last) / 86400000);
      chips.push([
        "seen",
        t("interacted", {
          n: p.likes + p.replies,
          ago: days < 1 ? t("ago_today") : t("ago_days", { n: days }),
        }),
      ]);
    }
    if (s.showReplies) {
      const rep = replyCounts.get(info.id);
      if (typeof rep === "number") {
        const me = S.relMeta && S.relMeta.me && S.relMeta.me.followers;
        chips.push(["replies", XH.replyChip(rep, authorFollowers.get(info.id), me)]);
      }
    }
    if (s.showReplied && S.replied && S.replied[info.id]) {
      chips.push(["replied", t("replied")]);
    }
    if (isTarget) chips.push(["star", "★ " + t("target")]);

    const key = JSON.stringify(chips);
    let badge = article.querySelector(":scope .xh-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "xh-badge";
      badge.setAttribute("aria-hidden", "true");
      const host = article.querySelector(SEL.userName) || info.anchor.parentElement;
      host.appendChild(badge);
    }
    if (badge.dataset.key !== key) {
      badge.dataset.key = key;
      badge.replaceChildren(
        ...chips.map(([kind, text]) => {
          const c = document.createElement("span");
          c.className = "xh-chip xh-" + kind;
          c.textContent = text;
          return c;
        })
      );
    }
    article.classList.toggle("xh-target", isTarget);
  }

  function annotateAll() {
    if (!S) return;
    document.querySelectorAll(SEL.tweet).forEach(annotate);
  }

  // ---------- 6. counting the user's own actions ----------

  function composerText(container) {
    return Array.from(container.querySelectorAll(SEL.textarea))
      .filter((el) => !el.querySelector(SEL.textarea))
      .map((el) => el.innerText.trim())
      .filter(Boolean)
      .join("\n");
  }

  let pendingSend = null;

  function clearPending() {
    if (!pendingSend) return;
    clearTimeout(pendingSend.fallbackTimer);
    clearTimeout(pendingSend.expiryTimer);
    pendingSend = null;
  }

  function recordSend(t, text, kind, to) {
    if (!text) return;
    const parts = kind === "reply" && to ? ["days", "people", "sent"] : ["days", "sent"];
    store.update(parts, (s) => {
      const d = store.today(s);
      if (kind === "reply") {
        d.replies++;
        if (to) {
          const p = store.person(s, to);
          p.replies++;
          p.last = t;
        }
      } else {
        d.posts++;
      }
      s.sent.push({ t, text, kind, to: kind === "reply" ? to : null });
    });
  }

  function onSend(button) {
    const now = Date.now();
    const dialog = button.closest('[role="dialog"]');
    const text = composerText(dialog || document);
    if (!text) return;
    if (now - lastSendAt < 1500 && text === lastSendText) return; // click + Ctrl+Enter for the same send
    lastSendAt = now;
    lastSendText = text;

    let fallbackKind = "post";
    let fallbackTo = null;
    if (dialog && pendingReply && now - pendingReply.t < 10 * 60 * 1000) {
      fallbackKind = "reply";
      fallbackTo = pendingReply.handle;
    } else if (!dialog && button.matches('[data-testid="tweetButtonInline"]') && pageStatusAuthor()) {
      fallbackKind = "reply";
      fallbackTo = pageStatusAuthor();
    }
    pendingReply = null;
    hideDup();

    clearPending();

    const ps = {
      t: now,
      text,
      kind: fallbackKind,
      to: fallbackTo,
      seen: false,
      inflight: 0, // post requests X has started for this send and not yet answered
      fallbackTimer: null,
      expiryTimer: null,
    };
    ps.fallbackTimer = setTimeout(() => {
      if (!pendingSend || pendingSend !== ps || ps.seen) return;
      recordSend(ps.t, ps.text, ps.kind, ps.to);
      clearPending();
    }, 3000);
    ps.expiryTimer = setTimeout(() => {
      if (pendingSend === ps) clearPending();
    }, 60000);
    pendingSend = ps;
  }

  function countLike(info, delta) {
    store.update(["days", "people"], (s) => {
      const d = store.today(s);
      const p = store.person(s, info.handle);
      d.likes = Math.max(0, d.likes + delta);
      p.likes = Math.max(0, p.likes + delta);
      if (delta > 0) p.last = Date.now();
    });
  }

  function isTyping(el) {
    return !!el.closest('input, textarea, [contenteditable="true"], [role="textbox"]');
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
        countLike(info, +1);
      } else if (el.matches(SEL.unlike) && info) {
        countLike(info, -1);
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
        store.update(["settings"], (s) => (s.settings.hud = !s.settings.hud));
        return;
      }
      // X's own shortcuts: j/k put focus on a post, l toggles like, r opens the reply box.
      // Read which post is focused (capture phase, before X toggles the button) and count it.
      if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "l" || e.key === "r") && !isTyping(e.target)) {
        const article = document.activeElement && document.activeElement.closest(SEL.tweet);
        const info = article && tweetInfo(article);
        if (info) {
          if (e.key === "r") pendingReply = { handle: info.handle, t: Date.now() };
          else if (article.querySelector(SEL.like)) countLike(info, +1);
          else if (article.querySelector(SEL.unlike)) countLike(info, -1);
        }
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
    const d = { likes: 0, replies: 0, posts: 0, follows: 0, seconds: 0, ...(S.days[store.dayKey()] || {}) };
    const goal = S.settings.dailyReplyGoal;
    const replies = goal ? `${d.replies}/${goal}` : String(d.replies);
    const follows = d.follows || 0;
    // [key, value, label, state]; state colours the number (ok / warn).
    const items = [
      ["likes", d.likes, t("hud_likes")],
      ["replies", replies, t("hud_replies"), goal && d.replies >= goal ? "ok" : ""],
      ["posts", d.posts, t("hud_posts")],
      ["follows", follows, t("hud_follows"), follows > S.settings.followLimit ? "warn" : ""],
      ["time", fmtDuration(d.seconds), t("hud_time")],
    ];
    const key = JSON.stringify([items, goal]);
    if (hudEl.dataset.key !== key) {
      hudEl.dataset.key = key;
      hudEl.replaceChildren(
        ...items.map(([k, value, label, state]) => {
          const el = document.createElement("span");
          el.className = "xh-hud-item";
          el.dataset.k = k;
          if (state) el.dataset.state = state;
          const v = document.createElement("b");
          v.textContent = value;
          const l = document.createElement("span");
          l.className = "xh-hud-label";
          l.textContent = label;
          el.append(v, l);
          if (k === "replies" && goal) {
            const bar = document.createElement("span");
            bar.className = "xh-hud-bar";
            bar.style.setProperty("--xh-p", Math.min(100, (d.replies / goal) * 100) + "%");
            el.append(bar);
          }
          return el;
        })
      );
    }
    hudEl.hidden = false;
  }

  // Fade the stats bar while scrolling so it never sits on top of what you are reading.
  let scrollTimer = null;
  window.addEventListener(
    "scroll",
    () => {
      if (!hudEl) return;
      hudEl.classList.add("xh-scrolling");
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => hudEl.classList.remove("xh-scrolling"), 1000);
    },
    { passive: true }
  );

  const TICK = 15;
  setInterval(() => {
    if (document.visibilityState === "visible" && document.hasFocus()) {
      store.update(["days"], (s) => (store.today(s).seconds += TICK));
    }
  }, TICK * 1000);

  // ---------- small toast (shared by the follow assistant) ----------

  let toastEl = null;
  let toastTimer = null;

  function toast(text, kind = "info", ms = 2500) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "xh-toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.dataset.kind = kind;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(() => (toastEl.hidden = true), ms);
  }

  // ---------- follow assistant: Shift+F on a focused post ----------
  // Finds the author's own Follow button (already on the page, e.g. in the hover card the user
  // opened by pointing at the author, or else on the author's profile), focuses it and waits.
  // The user presses Enter to follow (or Esc). Nothing is clicked by Xhandy, and no mouse or
  // pointer events are faked: synthetic input is exactly what X's bot detection looks for.

  const PENDING_KEY = "xh-follow-pending";
  let followTarget = null; // { handle, button }

  function clearFollowTarget() {
    if (!followTarget) return;
    followTarget.button && followTarget.button.classList.remove("xh-follow-focus");
    followTarget = null;
  }

  // Handle a Follow/Following button belongs to, from its aria-label ("Follow @name", "关注 @name").
  function buttonHandle(btn) {
    const m = (btn.getAttribute("aria-label") || "").match(/@([A-Za-z0-9_]{1,15})/);
    return m ? m[1] : null;
  }

  // The author's Follow (or Following) button anywhere on the page: hover card, "Who to follow",
  // profile header. Matched by user id when known, else by the @handle in its aria-label.
  function findFollowButton(handle) {
    const rel = S.rel[handle.toLowerCase()];
    if (rel && store.isId(rel.id)) {
      const exact = document.querySelector(`[data-testid="${rel.id}-follow"], [data-testid="${rel.id}-unfollow"]`);
      if (exact) return exact;
    }
    const lower = handle.toLowerCase();
    return [...document.querySelectorAll(SEL.followBtn + "," + SEL.unfollowBtn)].find(
      (b) => (buttonHandle(b) || "").toLowerCase() === lower
    );
  }

  async function waitForButton(handle, ms) {
    for (let waited = 0; waited <= ms; waited += 100) {
      const b = findFollowButton(handle);
      if (b) return b;
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  }

  function armButton(handle, button, onProfile) {
    if (button.matches(SEL.unfollowBtn)) return toast(t("follow_already", { h: handle }));
    followTarget = { handle, button };
    button.classList.add("xh-follow-focus");
    const r = button.getBoundingClientRect();
    const visible = r.top >= 0 && r.bottom <= innerHeight;
    button.focus({ preventScroll: visible });
    if (!visible) button.scrollIntoView({ block: "center" });
    toast(t(onProfile ? "follow_confirm_profile" : "follow_confirm", { h: handle }), "focus", 0);
  }

  function startFollow() {
    const article = document.activeElement && document.activeElement.closest(SEL.tweet);
    const info = article && tweetInfo(article);
    if (!info) return toast(t("follow_pick"), "warn");
    const handle = info.handle;
    const rel = S.rel[handle.toLowerCase()];
    if (rel && rel.f) return toast(t("follow_already", { h: handle }));

    clearFollowTarget();

    // 1. Already on the page (a hover card the user opened, "Who to follow", ...)?
    const button = findFollowButton(handle);
    if (button) return armButton(handle, button);

    // 2. Go to the author's profile; the button is armed there after the page loads.
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ handle, t: Date.now() }));
    } catch (_) {}
    toast(t("follow_profile", { h: handle }), "info", 0);
    location.assign("/" + handle);
  }

  async function resumePendingFollow() {
    let pending = null;
    try {
      pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
      sessionStorage.removeItem(PENDING_KEY);
    } catch (_) {}
    if (!pending || Date.now() - pending.t > 30000) return;
    if (location.pathname.split("/")[1].toLowerCase() !== pending.handle.toLowerCase()) return;
    const button = await waitForButton(pending.handle, 8000);
    if (button) armButton(pending.handle, button, true);
    else toast(t("follow_missing"), "warn", 4000);
  }

  // Clicking the armed button ends the follow assistant. Counting happens when X confirms the
  // follow (see "follows and unfollows" below), whichever button or menu the user used.
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(SEL.followBtn);
      if (!btn || !followTarget || followTarget.button !== btn) return;
      btn.classList.remove("xh-follow-focus");
      // Only close this card: the user may already have started on the next post.
      const done = followTarget;
      setTimeout(() => followTarget === done && clearFollowTarget(), 600);
    },
    true
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "F" && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        startFollow();
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyU") {
        e.preventDefault();
        togglePanel();
      } else if (e.key === "Escape" && panelEl && !panelEl.hidden && !followTarget) {
        togglePanel(false);
      } else if (e.key === "Escape" && followTarget) {
        clearFollowTarget();
        toastEl && (toastEl.hidden = true);
      } else if (followTarget && (e.key === "j" || e.key === "k")) {
        clearFollowTarget();
        toastEl && (toastEl.hidden = true);
      }
    },
    true
  );

  // ---------- theme: follow X's own background (Default / Dim / Lights out) ----------

  function syncTheme() {
    const bg = getComputedStyle(document.body).backgroundColor;
    const m = bg.match(/\d+(\.\d+)?/g);
    if (!m) return;
    const [r, g, b] = m.map(Number);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const theme = lum > 128 ? "light" : r + g + b < 30 ? "dark" : "dim";
    if (document.documentElement.dataset.xhTheme !== theme) document.documentElement.dataset.xhTheme = theme;
  }
  syncTheme();
  new MutationObserver(syncTheme).observe(document.body, { attributes: true, attributeFilter: ["style", "class"] });
  setInterval(syncTheme, 5000);

  // ---------- follow relationships (read from X's own responses by page-hook.js) ----------

  let relPending = {};
  let relTimer = null;

  let repliedPending = {};
  let repliedTimer = null;
  let lastRepliedWrite = 0;

  function recordReplied(postId, t = Date.now()) {
    if (!store.isId(postId)) return;
    if (S) {
      if (!S.replied) S.replied = {};
      S.replied[postId] = t;
    }
    repliedPending[postId] = t;
    annotateAll();

    if (repliedTimer) return;
    const delay = Math.max(0, 2000 - (Date.now() - lastRepliedWrite));
    repliedTimer = setTimeout(() => {
      repliedTimer = null;
      lastRepliedWrite = Date.now();
      const batch = repliedPending;
      repliedPending = {};
      store.update(["replied"], (s) => {
        Object.assign(s.replied, batch);
      });
    }, delay);
  }

  let pendingMe = null;
  let meTimer = null;
  let lastMeWrite = 0;

  function scheduleMe(data) {
    pendingMe = data;
    if (S && S.relMeta) S.relMeta.me = { ...data };
    annotateAll();
    if (meTimer) return;
    const delay = Math.max(0, 2000 - (Date.now() - lastMeWrite));
    meTimer = setTimeout(() => {
      meTimer = null;
      lastMeWrite = Date.now();
      if (!pendingMe) return;
      const batch = pendingMe;
      pendingMe = null;
      store.update(["relMeta"], (s) => {
        s.relMeta.me = batch;
      });
    }, delay);
  }

  window.addEventListener("xh-relations", (e) => {
    // Any script on x.com can send this event, so only well-formed entries get through.
    const payload = store.cleanRelations(e.detail);
    if (!payload) return;
    if (Array.isArray(payload.c)) {
      for (const entry of payload.c) {
        if (!pendingSend) continue;
        if (entry.seen === true) {
          pendingSend.seen = true;
          pendingSend.inflight++;
          clearTimeout(pendingSend.fallbackTimer);
          pendingSend.fallbackTimer = null;
        } else if (entry.ok === false) {
          // A thread sends one request per post; close only when none is left.
          if (--pendingSend.inflight <= 0) clearPending();
        } else if (entry.shape === "unknown") {
          recordSend(pendingSend.t, pendingSend.text, pendingSend.kind, pendingSend.to);
          clearPending();
        } else if (entry.ok === true) {
          recordSend(Date.now(), entry.text, entry.kind, entry.to);
          if (entry.inReplyTo) {
            recordReplied(entry.inReplyTo, Date.now());
          }
          // Close as soon as X has answered every request, so a forged confirmation has no window.
          if (--pendingSend.inflight <= 0) clearPending();
        }
      }
    }
    const users = payload.u;
    payload.f.forEach(onFriendship);
    const me = myHandle();
    const meLower = me ? me.toLowerCase() : null;
    if (payload.v.length) {
      for (const p of payload.v) {
        if (typeof p.views === "number") {
          views.delete(p.id); // keep the Map in arrival order so the oldest go first
          views.set(p.id, { n: p.views, at: payload.at });
        }
        if (typeof p.replies === "number") {
          replyCounts.delete(p.id);
          replyCounts.set(p.id, p.replies);
        }
        if (typeof p.authorFollowers === "number") {
          authorFollowers.delete(p.id);
          authorFollowers.set(p.id, p.authorFollowers);
        }
        if (meLower && p.author && p.author.toLowerCase() === meLower && p.inReplyTo) {
          recordReplied(p.inReplyTo, payload.at || Date.now());
        }
      }
      for (const id of views.keys()) {
        if (views.size <= MAX_VIEWS) break;
        views.delete(id);
      }
      for (const id of replyCounts.keys()) {
        if (replyCounts.size <= MAX_VIEWS) break;
        replyCounts.delete(id);
      }
      for (const id of authorFollowers.keys()) {
        if (authorFollowers.size <= MAX_VIEWS) break;
        authorFollowers.delete(id);
      }
      clearTimeout(annotateTimer);
      annotateTimer = setTimeout(annotateAll, 250);
    }
    if (me && users.length) {
      const meUser = users.find((u) => u.handle.toLowerCase() === meLower);
      if (meUser) {
        const followers = typeof meUser.followers === "number"
          ? meUser.followers
          : ((S && S.relMeta && S.relMeta.me && S.relMeta.me.followers) || 0);
        const id = meUser.id || (S && S.relMeta && S.relMeta.me && S.relMeta.me.id) || null;
        scheduleMe({ handle: meUser.handle, followers, id, t: Date.now() });
      }
    }
    if (!users.length) return;
    const now = Date.now();
    for (const u of users) {
      relPending[u.handle.toLowerCase()] = { f: u.following, fb: u.followedBy, id: u.id, n: u.name, t: now };
    }
    const onFollowingPage = me && location.pathname.toLowerCase() === "/" + me.toLowerCase() + "/following";
    clearTimeout(relTimer);
    relTimer = setTimeout(() => {
      const batch = relPending;
      relPending = {};
      store.update(["rel", "relMeta"], (s) => {
        Object.assign(s.rel, batch);
        s.relMeta.last = Date.now();
        if (onFollowingPage) s.relMeta.scan = Date.now();
      });
    }, 1000);
  });

  // ---------- follows and unfollows (X's own answers to the user's requests, via page-hook.js) ----------

  function onFriendship({ handle, id, name, on }) {
    const k = handle.toLowerCase();
    store.update(["days", "rel"], (s) => {
      const d = store.today(s);
      if (on) d.follows = (d.follows || 0) + 1;
      else d.unfollows = (d.unfollows || 0) + 1;
      const old = s.rel[k] || { fb: false, id: null, n: null };
      s.rel[k] = { ...old, id: id || old.id, n: name || old.n, f: on, t: Date.now() };
    });
    if (!S) return;
    const field = on ? "follows" : "unfollows";
    const limit = on ? S.settings.followLimit : S.settings.unfollowLimit;
    const over = ((S.days[store.dayKey()] || {})[field] || 0) + 1 > limit;
    if (over) return toast(t(on ? "follow_limit" : "unfollow_limit", { n: limit }), "warn", 5000);
    if (!on) return toast(t("unfollow_done", { h: handle }), "ok");
    const onProfile = location.pathname.split("/")[1].toLowerCase() === k;
    toast(t(onProfile ? "follow_done_profile" : "follow_done", { h: handle }), "ok", onProfile ? 5000 : 2500);
  }

  // ---------- "not following you back" panel (Alt+U or the toolbar popup) ----------
  // Read-only list of accounts you follow that don't follow you, from data X already sent.
  // Each row only links to the profile; there is no unfollow button and no bulk action.

  const PANEL_MAX = 300;
  let panelEl = null;
  let panelQuery = "";

  function myHandle() {
    const a = document.querySelector(SEL.profileLink);
    const m = a && (a.getAttribute("href") || "").match(/^\/([A-Za-z0-9_]{1,15})$/);
    return m ? m[1] : null;
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function buildPanel() {
    panelEl = el("aside", "xh-panel");
    panelEl.hidden = true;
    panelEl.setAttribute("aria-label", t("nfb_title"));
    const head = el("header", "xh-panel-head");
    const title = el("h2", "xh-panel-title");
    const close = el("button", "xh-panel-close", "×");
    close.type = "button";
    close.title = close.ariaLabel = t("nfb_close");
    close.addEventListener("click", () => togglePanel(false));
    head.append(title, close);
    const search = el("input", "xh-panel-search");
    search.type = "search";
    search.placeholder = t("nfb_search");
    search.addEventListener("input", () => {
      panelQuery = search.value.trim().replace(/^@/, "").toLowerCase();
      renderPanel(true);
    });
    panelEl.append(head, el("div", "xh-panel-info"), search, el("ol", "xh-panel-list"), el("footer", "xh-panel-foot"));
    // Keep X's single-key shortcuts (j, k, l, r…) from firing while typing in the search box.
    panelEl.addEventListener("keydown", (e) => e.key !== "Escape" && e.stopPropagation());
    document.body.appendChild(panelEl);
  }

  function togglePanel(open) {
    if (!panelEl) buildPanel();
    const show = open == null ? panelEl.hidden : open;
    panelEl.hidden = !show;
    if (show) {
      renderPanel(true);
      panelEl.querySelector(".xh-panel-search").focus({ preventScroll: true });
    }
  }

  function renderPanel(force) {
    if (!S || !panelEl || panelEl.hidden) return;
    const now = Date.now();
    const me = (myHandle() || "").toLowerCase();
    // isHandle: each row links to "/" + handle, so a stored "/evil.com" must never become "//evil.com".
    const all = Object.entries(S.rel).filter(([h, r]) => r && r.f && h !== me && store.isHandle(h));
    const rows = all
      .filter(([, r]) => !r.fb)
      .sort(([a], [b]) => a.localeCompare(b));
    const matching = rows.filter(
      ([h, r]) => !panelQuery || h.includes(panelQuery) || (r.n || "").toLowerCase().includes(panelQuery)
    );
    const shown = matching.slice(0, PANEL_MAX);
    const today = S.days[store.dayKey()] || {};
    const key = JSON.stringify([shown.map(([h, r]) => [h, r.n, r.t]), rows.length, S.relMeta.scan, today.unfollows, me]);
    if (!force && panelEl.dataset.key === key) return;
    panelEl.dataset.key = key;

    panelEl.querySelector(".xh-panel-title").replaceChildren(t("nfb_title"), el("span", "xh-panel-count", rows.length));

    const info = panelEl.querySelector(".xh-panel-info");
    const [before, after] = t("nfb_hint", { link: "\u0000" }).split("\u0000");
    const link = el("a", null, t("nfb_link"));
    link.href = me ? `/${me}/following` : "/";
    const p1 = el("p");
    p1.append(before, link, after);
    const p2 = el("p", "xh-panel-muted", S.relMeta.scan ? t("nfb_scan", { ago: XH.ago(S.relMeta.scan, now) }) : t("nfb_noscan"));
    info.replaceChildren(p1, p2);
    // If X stops sending "followed_by", every account would look like it doesn't follow back.
    const mutual = all.length - rows.length;
    if (all.length >= 20 && mutual === 0) info.append(el("p", "xh-panel-warn", "⚠ " + t("nfb_suspect", { n: all.length })));

    const list = panelEl.querySelector(".xh-panel-list");
    list.replaceChildren(
      ...shown.map(([h, r]) => {
        const li = el("li");
        const a = el("a", "xh-panel-row");
        a.href = "/" + h;
        const name = el("span", "xh-panel-name", r.n || h);
        const handle = el("span", "xh-panel-handle", "@" + h);
        const meta = [t("nfb_seen", { ago: XH.ago(r.t, now) })];
        if (now - r.t > S.settings.relStaleDays * 86400000) meta[0] += t("rel_stale");
        const p = S.people[h];
        if (p && p.likes + p.replies > 0) meta.push(t("nfb_you", { n: p.likes + p.replies }));
        a.append(name, handle, el("span", "xh-panel-meta", meta.join(" · ")));
        li.append(a);
        return li;
      })
    );
    if (!shown.length) list.append(el("li", "xh-panel-muted xh-panel-empty", t("nfb_empty")));
    if (matching.length > PANEL_MAX) {
      list.append(el("li", "xh-panel-muted xh-panel-empty", t("nfb_more", { n: PANEL_MAX, total: matching.length })));
    }

    panelEl.querySelector(".xh-panel-foot").textContent = t("nfb_footer", {
      n: today.unfollows || 0,
      limit: S.settings.unfollowLimit,
    });
  }

  // The toolbar popup's button opens the panel in this tab.
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "xh-panel") togglePanel(true);
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
    renderPanel();
  });

  store.get().then((s) => {
    S = s;
    annotateAll();
    renderHud();
    // Arrived here from Shift+F's profile fallback? Arm the Follow button.
    resumePendingFollow();
  });

  // Ask page-hook.js to replay relationships it saw before this script loaded.
  window.dispatchEvent(new CustomEvent("xh-ready"));

  // Refresh ages once a minute.
  setInterval(annotateAll, 60000);
})();
