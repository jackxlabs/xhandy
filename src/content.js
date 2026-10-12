// x-helper content script.
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
    avatar: '[data-testid="Tweet-User-Avatar"]',
    followBtn: '[data-testid$="-follow"]',
    unfollowBtn: '[data-testid$="-unfollow"]',
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

    // Each chip: [kind, text]. Kind picks the colour in content.css.
    const chips = [[stale ? "stale" : "age", fmtAge(now - info.time) + (stale ? " · " + t("stale") : "")]];
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

  function countLike(info, delta) {
    store.update((s) => {
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
        store.update((s) => (s.settings.hud = !s.settings.hud));
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
    const d = S.days[store.dayKey()] || { likes: 0, replies: 0, posts: 0, follows: 0, seconds: 0 };
    const goal = S.settings.dailyReplyGoal;
    const replies = goal ? `${d.replies}/${goal}` : String(d.replies);
    const follows = d.follows || 0;
    const items = [
      ["❤", d.likes, t("hud_likes")],
      ["💬", replies, t("hud_replies")],
      ["📝", d.posts, t("hud_posts")],
      ["👤", follows, t("hud_follows")],
      ["⏱", fmtDuration(d.seconds), t("hud_time")],
    ];
    const key = JSON.stringify(items);
    if (hudEl.dataset.key !== key) {
      hudEl.dataset.key = key;
      hudEl.replaceChildren(
        ...items.map(([icon, value, label]) => {
          const el = document.createElement("span");
          el.className = "xh-hud-item";
          el.title = label;
          el.textContent = `${icon} ${value} `;
          const l = document.createElement("span");
          l.className = "xh-hud-label";
          l.textContent = label;
          el.append(l);
          return el;
        })
      );
    }
    hudEl.classList.toggle("xh-goal-met", !!goal && d.replies >= goal);
    hudEl.classList.toggle("xh-follow-high", follows > S.settings.followLimit);
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
      store.update((s) => (store.today(s).seconds += TICK));
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
  // Finds the author's own Follow button (already on the page, in X's hover card, or on the
  // author's profile as a fallback), focuses it and waits. The user presses Enter to follow
  // (or Esc). Nothing is clicked by x-helper.

  const PENDING_KEY = "xh-follow-pending";
  let followTarget = null; // { handle, button, hoverEl }

  function hover(el, on) {
    if (!el) return;
    const types = on ? ["pointerover", "pointerenter", "mouseover", "mouseenter"] : ["pointerout", "pointerleave", "mouseout", "mouseleave"];
    for (const type of types) {
      const Ev = type.startsWith("pointer") ? PointerEvent : MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: !type.endsWith("enter") && !type.endsWith("leave"), view: window }));
    }
  }

  function clearFollowTarget() {
    if (!followTarget) return;
    followTarget.button && followTarget.button.classList.remove("xh-follow-focus");
    hover(followTarget.hoverEl, false);
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
    if (rel && rel.id) {
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

  function armButton(handle, button, hoverEl, onProfile) {
    if (button.matches(SEL.unfollowBtn)) {
      hover(hoverEl, false);
      return toast(t("follow_already", { h: handle }));
    }
    followTarget = { handle, button, hoverEl };
    button.classList.add("xh-follow-focus");
    const r = button.getBoundingClientRect();
    const visible = r.top >= 0 && r.bottom <= innerHeight;
    button.focus({ preventScroll: visible });
    if (!visible) button.scrollIntoView({ block: "center" });
    toast(t(onProfile ? "follow_confirm_profile" : "follow_confirm", { h: handle }), "focus", 0);
  }

  async function startFollow() {
    const article = document.activeElement && document.activeElement.closest(SEL.tweet);
    const info = article && tweetInfo(article);
    if (!info) return toast(t("follow_pick"), "warn");
    const handle = info.handle;
    const rel = S.rel[handle.toLowerCase()];
    if (rel && rel.f) return toast(t("follow_already", { h: handle }));

    clearFollowTarget();

    // 1. Already on the page (e.g. "Who to follow")?
    let button = findFollowButton(handle);
    if (button) return armButton(handle, button, null);

    // 2. Ask X to show its hover card for the author.
    const hoverEl =
      article.querySelector(`[data-testid="UserAvatar-Container-${handle}"]`) ||
      article.querySelector(SEL.avatar) ||
      article.querySelector(`${SEL.userName} a[href="/${handle}"]`);
    hover(hoverEl, true);
    toast(t("follow_opening", { h: handle }), "info", 0);
    button = await waitForButton(handle, 1500);
    if (button) return armButton(handle, button, hoverEl);
    hover(hoverEl, false);

    // 3. Fall back to the author's profile; the button is armed there after the page loads.
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
    if (button) armButton(pending.handle, button, null, true);
    else toast(t("follow_missing"), "warn", 4000);
  }

  // Count follows the user makes: Enter on the focused button, or any click on a Follow button.
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(SEL.followBtn);
      if (!btn) return;
      const handle =
        (followTarget && followTarget.button === btn && followTarget.handle) || buttonHandle(btn);
      const onProfile = handle && location.pathname.split("/")[1].toLowerCase() === handle.toLowerCase();
      store.update((s) => {
        const d = store.today(s);
        d.follows = (d.follows || 0) + 1;
        if (handle) {
          const k = handle.toLowerCase();
          s.rel[k] = { ...(s.rel[k] || { fb: false, id: null }), f: true, t: Date.now() };
        }
      });
      const over = ((S.days[store.dayKey()] || {}).follows || 0) + 1 > S.settings.followLimit;
      if (over) toast(t("follow_limit", { n: S.settings.followLimit }), "warn", 5000);
      else toast(t(onProfile ? "follow_done_profile" : "follow_done", { h: handle || "" }), "ok", onProfile ? 5000 : 2500);
      if (followTarget && followTarget.button === btn) {
        btn.classList.remove("xh-follow-focus");
        // Only close this card: the user may already have started on the next post.
        const done = followTarget;
        setTimeout(() => followTarget === done && clearFollowTarget(), 600);
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "F" && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        startFollow();
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
    // Arrived here from Shift+F's profile fallback? Arm the Follow button.
    resumePendingFollow();
  });

  // Ask page-hook.js to replay relationships it saw before this script loaded.
  window.dispatchEvent(new CustomEvent("xh-ready"));

  // Refresh ages once a minute.
  setInterval(annotateAll, 60000);
})();
