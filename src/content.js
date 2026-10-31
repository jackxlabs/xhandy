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
    profileName: '[data-testid="UserName"]',
    tweetText: '[data-testid="tweetText"]',
  };

  let S = null; // cached state
  const views = new Map(); // post id -> { n: views, at: when X reported it }; memory only
  const replyCounts = new Map(); // post id -> replies count; memory only
  const authorFollowers = new Map(); // post id -> author followers count; memory only
  const handleFollowers = new Map(); // handle (lowercase) -> author followers count; memory only
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
    if (i < 1 || !store.isHandle(parts[i - 1])) return null;
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

  function toggleKeyAccount(handle, showToast = false) {
    if (!handle || !store.isHandle(handle)) return;
    const h = handle.toLowerCase();
    store.update(["keys"], (s) => {
      if (!s.keys) s.keys = {};
      const exists = !!s.keys[h];
      if (exists) {
        delete s.keys[h];
      } else {
        s.keys[h] = { h: handle, t: Date.now() };
      }
      if (showToast) {
        toast(t(exists ? "key_done_remove" : "key_done_add", { h: handle }), exists ? "warn" : "ok");
      }
    });
  }

  function handleAltS() {
    const article = document.activeElement && document.activeElement.closest(SEL.tweet);
    const info = article && tweetInfo(article);
    if (!info) return toast(t("key_pick"), "warn");
    if (isMe(info.handle)) return;
    toggleKeyAccount(info.handle, true);
  }

  const SYSTEM_PATHS = new Set([
    "home", "explore", "search", "notifications", "messages", "i", "settings", "compose", "login", "logout"
  ]);

  function profileHandleFromUrl() {
    const parts = location.pathname.split("/").filter(Boolean);
    if (!parts.length) return null;
    const first = parts[0];
    if (SYSTEM_PATHS.has(first.toLowerCase())) return null;
    if (!store.isHandle(first)) return null;
    return first;
  }

  function findProfileHeaderName(handle) {
    const list = document.querySelectorAll(SEL.profileName);
    const expected = "@" + handle.toLowerCase();
    for (const el of list) {
      if (el.closest(SEL.tweet)) continue;
      const text = (el.textContent || "").toLowerCase();
      if (text.includes(expected)) return el;
    }
    return null;
  }

  // The profile owner's own Follow / Following button, never one in a post, hover card or "Who to follow".
  function findProfileFollowButton(handle) {
    const b = findFollowButton(handle);
    return b && !b.closest(SEL.tweet) && !b.closest('[data-testid="HoverCard"]') && !b.closest('[data-testid="sidebarColumn"]') ? b : null;
  }

  function findProfileFallbackArea(handle) {
    const userActions = document.querySelector(
      '[data-testid="primaryColumn"] [data-testid="userActions"], [data-testid="userActions"]'
    );
    if (userActions && !userActions.closest(SEL.tweet) && !userActions.closest('[data-testid="HoverCard"]')) {
      return { el: userActions, position: "before" };
    }
    const nameEl = findProfileHeaderName(handle);
    if (nameEl) {
      const header = nameEl.closest("header") || nameEl.parentNode;
      return { el: header, position: "append" };
    }
    return null;
  }

  function updateProfileButtons() {
    const existingTop = document.querySelector("button.xh-top");
    const existingNote = document.querySelector("button.xh-note-btn");
    const showTop = !!(S && S.settings && S.settings.topPosts);
    const showNote = !!(S && S.settings && S.settings.localNotes);

    const handle = profileHandleFromUrl();
    if (!handle || isMe(handle) || document.querySelector('[data-testid="editProfileButton"]')) {
      if (existingTop) existingTop.remove();
      if (existingNote) existingNote.remove();
      return;
    }

    const followBtn = findProfileFollowButton(handle);
    let target = null;
    let insertBefore = true;

    if (followBtn) {
      target = followBtn;
      insertBefore = true;
    } else {
      const fallback = findProfileFallbackArea(handle);
      if (!fallback) {
        if (existingTop) existingTop.remove();
        if (existingNote) existingNote.remove();
        return;
      }
      target = fallback.el;
      insertBefore = fallback.position === "before";
    }

    let topBtn = existingTop;
    if (!showTop) {
      if (existingTop) {
        existingTop.remove();
        topBtn = null;
      }
    } else {
      if (existingTop) {
        const isCorrectPlace = insertBefore
          ? existingTop.nextSibling === target || (existingNote && existingTop.nextSibling === existingNote)
          : existingTop.parentNode === target;
        if (existingTop.dataset.h === handle.toLowerCase() && isCorrectPlace) {
          existingTop.replaceChildren(XH.icon("flame", 16), document.createTextNode(t("top_btn")));
          existingTop.setAttribute("aria-label", t("top_label", { h: handle }));
        } else {
          existingTop.remove();
          topBtn = null;
        }
      }
      if (!topBtn) {
        topBtn = document.createElement("button");
        topBtn.className = "xh-top";
        topBtn.type = "button";
        topBtn.dataset.h = handle.toLowerCase();
        topBtn.replaceChildren(XH.icon("flame", 16), document.createTextNode(t("top_btn")));
        topBtn.setAttribute("aria-label", t("top_label", { h: handle }));
        topBtn.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = XH.topPosts.topPostsUrl(handle, handleFollowers.get(handle.toLowerCase()));
            location.assign(url);
          },
          true
        );
        if (insertBefore) {
          target.before(topBtn);
        } else {
          target.appendChild(topBtn);
        }
      }
    }

    if (!showNote) {
      if (existingNote) existingNote.remove();
      return;
    }

    let noteBtn = existingNote;
    if (existingNote) {
      const isCorrectPlace = topBtn
        ? existingNote.previousElementSibling === topBtn
        : insertBefore
        ? existingNote.nextSibling === target
        : existingNote.parentNode === target;
      if (existingNote.dataset.h === handle.toLowerCase() && isCorrectPlace) {
        existingNote.replaceChildren(XH.icon("note", 16), document.createTextNode(t("note_btn")));
        existingNote.setAttribute("aria-label", t("note_title") + " @" + handle);
      } else {
        existingNote.remove();
        noteBtn = null;
      }
    }
    if (!noteBtn) {
      noteBtn = document.createElement("button");
      noteBtn.className = "xh-note-btn";
      noteBtn.type = "button";
      noteBtn.dataset.h = handle.toLowerCase();
      noteBtn.replaceChildren(XH.icon("note", 16), document.createTextNode(t("note_btn")));
      noteBtn.setAttribute("aria-label", t("note_title") + " @" + handle);
      noteBtn.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          openNoteEditor(handle);
        },
        true
      );
      if (topBtn) {
        topBtn.after(noteBtn);
      } else if (insertBefore) {
        target.before(noteBtn);
      } else {
        target.appendChild(noteBtn);
      }
    }
  }

  function updateTopPostsButton() {
    updateProfileButtons();
  }

  let noteEditorEl = null;

  function closeNoteEditor() {
    if (noteEditorEl) {
      noteEditorEl.remove();
      noteEditorEl = null;
    }
  }

  function openNoteEditor(handle) {
    if (!handle) return;
    closeNoteEditor();
    if (!S || !S.settings || !S.settings.localNotes) return;

    const lower = handle.toLowerCase();
    const existingNote = (S.notes && S.notes[lower]) || null;
    let selectedStatus = existingNote && existingNote.s ? existingNote.s : null;
    let currentTags = Array.isArray(existingNote?.tags) ? [...existingNote.tags] : [];

    const pop = document.createElement("div");
    pop.className = "xh-note";
    pop.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") closeNoteEditor();
    });
    pop.addEventListener("keyup", (e) => e.stopPropagation());
    pop.addEventListener("keypress", (e) => e.stopPropagation());

    const header = document.createElement("div");
    header.className = "xh-note-header";
    const userTitle = document.createElement("div");
    userTitle.className = "xh-note-user";
    userTitle.textContent = "@" + handle;
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "xh-note-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", t("note_close"));
    closeBtn.addEventListener("click", () => closeNoteEditor());
    header.appendChild(userTitle);
    header.appendChild(closeBtn);
    pop.appendChild(header);

    const statusesDiv = document.createElement("div");
    statusesDiv.className = "xh-note-statuses";
    const statusBtns = [];
    for (const st of XH.store.NOTE_STATUS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "xh-note-status";
      btn.dataset.s = st;
      btn.textContent = t("note_s_" + st);
      btn.setAttribute("aria-pressed", selectedStatus === st ? "true" : "false");
      btn.addEventListener("click", () => {
        if (selectedStatus === st) {
          selectedStatus = null;
        } else {
          selectedStatus = st;
        }
        statusBtns.forEach((b) => {
          b.setAttribute("aria-pressed", b.dataset.s === selectedStatus ? "true" : "false");
        });
      });
      statusBtns.push(btn);
      statusesDiv.appendChild(btn);
    }
    pop.appendChild(statusesDiv);

    const tagsWrap = document.createElement("div");
    tagsWrap.className = "xh-note-tags-wrap";
    const tagsList = document.createElement("div");
    tagsList.className = "xh-note-tags";

    const tagInput = document.createElement("input");
    tagInput.type = "text";
    tagInput.className = "xh-note-tag";
    tagInput.placeholder = t("note_tag_ph");

    const tagHint = document.createElement("div");
    tagHint.className = "xh-note-tag-hint";
    tagHint.hidden = true;
    tagHint.textContent = t("note_tag_hint");

    function renderTags() {
      tagsList.replaceChildren(
        ...currentTags.map((tag, idx) => {
          const chip = document.createElement("span");
          chip.className = "xh-note-tag-chip";
          chip.textContent = tag;
          const del = document.createElement("button");
          del.type = "button";
          del.className = "xh-note-tag-del";
          del.textContent = "×";
          del.addEventListener("click", () => {
            currentTags.splice(idx, 1);
            renderTags();
          });
          chip.appendChild(del);
          return chip;
        })
      );
    }
    renderTags();

    tagInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const raw = tagInput.value.trim().replace(/^#+/, "").trim();
        if (!raw) return;
        const chars = Array.from(raw);
        if (currentTags.length >= 5 || chars.length > 20) {
          tagHint.hidden = false;
          return;
        }
        if (currentTags.some((t) => t.toLowerCase() === raw.toLowerCase())) {
          tagInput.value = "";
          return;
        }
        tagHint.hidden = true;
        currentTags.push(raw);
        tagInput.value = "";
        renderTags();
      }
    });

    tagsWrap.appendChild(tagsList);
    tagsWrap.appendChild(tagInput);
    tagsWrap.appendChild(tagHint);
    pop.appendChild(tagsWrap);

    const textWrap = document.createElement("div");
    textWrap.className = "xh-note-text-wrap";
    const textarea = document.createElement("textarea");
    textarea.className = "xh-note-text";
    textarea.maxLength = 500;
    textarea.placeholder = t("note_text_ph");
    textarea.value = existingNote && existingNote.text ? existingNote.text : "";

    const countDiv = document.createElement("div");
    countDiv.className = "xh-note-count";
    const updateCount = () => {
      const len = Array.from(textarea.value).length;
      countDiv.textContent = `${len}/500`;
    };
    updateCount();
    textarea.addEventListener("input", updateCount);

    textWrap.appendChild(textarea);
    textWrap.appendChild(countDiv);
    pop.appendChild(textWrap);

    const actions = document.createElement("div");
    actions.className = "xh-note-actions";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "xh-note-del";
    delBtn.textContent = t("note_del");
    delBtn.addEventListener("click", () => doSave(true));

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "xh-note-save";
    saveBtn.textContent = t("note_save");
    saveBtn.addEventListener("click", () => doSave(false));

    actions.appendChild(delBtn);
    actions.appendChild(saveBtn);
    pop.appendChild(actions);

    async function doSave(empty) {
      const pending = tagInput.value.trim().replace(/^#+/, "").trim();
      if (!empty && pending && !currentTags.some((x) => x.toLowerCase() === pending.toLowerCase())) currentTags.push(pending);
      const sVal = empty ? null : selectedStatus;
      const tagsVal = empty ? [] : currentTags;
      const textVal = empty ? "" : textarea.value.trim();
      const idVal = (S.rel && S.rel[lower] && S.rel[lower].id) || (existingNote && existingNote.id) || undefined;
      let r;
      await store.update(["notes"], (s) => {
        r = store.saveNote(s.notes, handle, {
          s: sVal,
          tags: tagsVal,
          text: textVal,
          id: idVal,
        });
      });
      if (r && r.reason === "full") {
        toast(t("note_full"), "warn");
        return;
      }
      closeNoteEditor();
      if (r && r.deleted) toast(t("note_deleted"));
      else toast(t("note_saved"));
    }

    document.body.appendChild(pop);
    noteEditorEl = pop;
    textarea.focus();
  }

  function handleAltB() {
    let handle = null;
    const article = document.activeElement && document.activeElement.closest(SEL.tweet);
    const info = article && tweetInfo(article);
    if (info && info.handle) {
      handle = info.handle;
    } else {
      const urlHandle = profileHandleFromUrl();
      if (urlHandle) handle = urlHandle;
    }

    if (!handle) {
      return toast(t("top_pick"), "warn");
    }

    const url = XH.topPosts.topPostsUrl(handle, handleFollowers.get(handle.toLowerCase()));
    location.assign(url);
  }

  function handleAltN() {
    let handle = null;
    const article = document.activeElement && document.activeElement.closest(SEL.tweet);
    const info = article && tweetInfo(article);
    if (info && info.handle) {
      handle = info.handle;
    } else {
      const urlHandle = profileHandleFromUrl();
      if (urlHandle) handle = urlHandle;
    }

    if (!handle) {
      return toast(t("note_pick"), "warn");
    }

    if (isMe(handle)) {
      return;
    }

    openNoteEditor(handle);
  }

  function annotate(article) {
    const info = tweetInfo(article);
    if (!info) return;
    const now = Date.now();
    const s = S.settings;
    const p = S.people[info.handle.toLowerCase()];
    const isKey = !!(s.keyAccounts && S.keys && S.keys[info.handle.toLowerCase()]);
    // On the user's own posts, "not following" and interactions with yourself mean nothing.
    const me = myHandle();
    const own = !!me && me.toLowerCase() === info.handle.toLowerCase();

    const step = (!own && s.showTint) ? XH.store.tintLevel(p, s, now) : 0;
    // Touch the classes only when the step changes; X can reuse the element for another author.
    for (let i = 1; i <= 8; i++) article.classList.toggle("xh-tint-" + i, i === step);
    article.classList.toggle("xh-tint", step > 0);

    const stale = now - info.time > s.staleHours * 3600 * 1000;

    // Each chip: [kind, text]. Kind picks the colour in content.css.
    const chips = [];
    if (s.showAge) {
      const rate = s.showHeat ? viewsPerHour(info) : null;
      if (stale) {
        const text = rate != null ? t("per_hour", { n: XH.compact(rate) }) + " · " + t("stale") : t("stale");
        chips.push(["stale", text]);
      } else if (rate != null) {
        const heat = rate >= s.heatHot ? "hot" : rate >= s.heatWarm ? "warm" : "age";
        const text = t("per_hour", { n: XH.compact(rate) });
        chips.push([heat, text]);
      }
    }
    const rel = !own && s.showRel && S.rel[info.handle.toLowerCase()];
    if (rel && (rel.f || rel.fb)) {
      const key = rel.f && rel.fb ? "mutual" : rel.f ? "following" : "follower";
      const old = now - rel.t > s.relStaleDays * 86400000;
      chips.push(["rel-" + key, t("rel_" + key) + (old ? t("rel_stale") : "")]);
    }
    if (!own && s.localNotes && S.notes) {
      const note = S.notes[info.handle.toLowerCase()];
      if (note) {
        let label = "";
        if (note.s && XH.store.NOTE_STATUS.includes(note.s)) {
          label = t("note_s_" + note.s);
        } else if (Array.isArray(note.tags) && note.tags.length > 0) {
          label = "#" + note.tags[0];
        }
        const title = Array.from(note.text || "").slice(0, 200).join("");
        chips.push(["note", label, title]);
      }
    }
    if (!own && s.showSeen) {
      const ownCount = p ? p.likes + p.replies : 0;
      const inCount = p && p.in ? p.in.likes + p.in.replies + p.in.quotes + p.in.mentions : 0;
      if (s.showInbound && inCount > 0) {
        const latest = Math.max(p?.last || 0, p?.in?.last || 0);
        const days = Math.floor((now - latest) / 86400000);
        const ago = days < 1 ? t("ago_today") : t("ago_days", { n: days });
        chips.push([
          "seen",
          t("interacted_both", { a: ownCount, b: inCount, ago }),
        ]);
      } else if (ownCount > 0) {
        const days = Math.floor((now - p.last) / 86400000);
        chips.push([
          "seen",
          t("interacted", {
            n: ownCount,
            ago: days < 1 ? t("ago_today") : t("ago_days", { n: days }),
          }),
        ]);
      }
    }
    if (s.showReplies) {
      const rep = replyCounts.get(info.id);
      if (typeof rep === "number") {
        const mine = S.relMeta && S.relMeta.me && S.relMeta.me.followers;
        chips.push(["replies", XH.replyChip(rep, own ? undefined : authorFollowers.get(info.id), mine)]);
      }
    }
    if (s.showReplied && S.replied && S.replied[info.id]) {
      chips.push(["replied", t("replied")]);
    }

    const showStar = !!(s.keyAccounts && !own);
    let badge = article.querySelector(":scope .xh-badge");
    if (!chips.length && !showStar) {
      if (badge) badge.remove();
      article.classList.toggle("xh-target", false);
      article.classList.toggle("xh-key", false);
      return;
    }
    const key = JSON.stringify([info.id, chips, isKey, showStar]);
    const host = article.querySelector(SEL.userName) || info.anchor.parentElement;
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "xh-badge";
      host.appendChild(badge);
    } else if (badge.dataset.post !== info.id) {
      // X can reuse a post's element for another post: start again in the name row.
      badge.classList.remove("xh-badge-row");
      host.appendChild(badge);
    }
    badge.dataset.post = info.id;
    if (badge.dataset.key !== key) {
      badge.dataset.key = key;
      const nodes = chips.map(([kind, text, title]) => {
        const c = document.createElement("span");
        c.className = "xh-chip xh-" + kind;
        if (kind === "hot") {
          c.append(XH.icon("flame", 12), document.createTextNode(text));
        } else if (kind === "note" && !text) {
          c.append(XH.icon("note", 12));
        } else {
          c.textContent = text;
        }
        if (title) c.title = title;
        return c;
      });
      if (showStar) {
        const star = document.createElement("button");
        star.type = "button";
        star.className = "xh-star";
        star.setAttribute("aria-pressed", isKey ? "true" : "false");
        star.setAttribute("aria-label", t(isKey ? "key_remove" : "key_add"));
        star.append(XH.icon("star", 14));
        star.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Read the author when clicked, not when the star was made, in case the element was reused.
            const now = tweetInfo(article);
            if (now) toggleKeyAccount(now.handle);
          },
          true
        );
        nodes.push(star);
      }
      badge.replaceChildren(...nodes);
      queueFit(article, badge);
    }
    article.classList.toggle("xh-target", isKey);
    article.classList.toggle("xh-key", isKey);
  }

  // Own row: above the post's own text (not a quoted post's), or right below the name row when the post has
  // no text, so the name row's fixed width can't cut it off.
  function placeAsRow(article, badge) {
    if (!badge.isConnected) return;
    badge.classList.add("xh-badge-row");
    const text = [...article.querySelectorAll(SEL.tweetText)].find((el) => !el.closest('[role="link"]'));
    if (text) {
      if (badge.nextElementSibling !== text) text.before(badge);
      return;
    }
    const name = article.querySelector(SEL.userName);
    if (!name) return;
    const row = name.parentElement && name.parentElement !== article ? name.parentElement : name;
    if (row.nextElementSibling !== badge) row.after(badge);
  }

  // X's name row has a fixed width (narrow windows, the Subscribe button on a post's own page), so a long
  // badge would be cut off. When it doesn't fit, it moves to its own row, where chips wrap. It never moves
  // back while showing the same post, so it can't flip between the two places. Checks run once per frame,
  // all measurements first and all moves after, so a busy timeline doesn't force a layout per post.
  const fitQueue = new Map(); // badge -> article
  function queueFit(article, badge) {
    if (!fitQueue.size) requestAnimationFrame(runFits);
    fitQueue.set(badge, article);
  }
  function runFits() {
    const tooWide = [];
    for (const [badge, article] of fitQueue) {
      if (badge.isConnected && !badge.classList.contains("xh-badge-row") && badge.scrollWidth > badge.clientWidth + 1) {
        tooWide.push([article, badge]);
      }
    }
    fitQueue.clear();
    for (const [article, badge] of tooWide) placeAsRow(article, badge);
  }

  function annotateAll() {
    if (!S) return;
    document.querySelectorAll(SEL.tweet).forEach(annotate);
    updateTopPostsButton();
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
    const parts = kind === "reply" && to && !isMe(to) ? ["days", "people", "sent"] : ["days", "sent"];
    store.update(parts, (s) => {
      const d = store.today(s);
      if (kind === "reply") {
        d.replies++;
        if (to && !isMe(to)) {
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

  // The user's own posts and replies to them are not interactions with an author.
  function isMe(handle) {
    const me = myHandle();
    return !!me && !!handle && me.toLowerCase() === handle.toLowerCase();
  }

  function countLike(info, delta) {
    const self = isMe(info.handle);
    store.update(self ? ["days"] : ["days", "people"], (s) => {
      const d = store.today(s);
      d.likes = Math.max(0, d.likes + delta);
      if (self) return;
      const p = store.person(s, info.handle);
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
    h.append(XH.icon("warn", 16), document.createTextNode(" " + title));
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
    if (!s.dupWarn) return hideDup();
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
  let hudDrag = null;

  function clampHud(r, b, w, h) {
    const maxR = Math.max(8, window.innerWidth - w - 8);
    const maxB = Math.max(8, window.innerHeight - h - 8);
    return [Math.min(Math.max(8, r), maxR), Math.min(Math.max(8, b), maxB)];
  }

  function applyHudPosition() {
    if (!hudEl || !S || !S.settings || hudEl.hidden) return;
    if (hudDrag && hudDrag.dragging) return;
    const r = typeof S.settings.hudRight === "number" ? S.settings.hudRight : 16;
    const b = typeof S.settings.hudBottom === "number" ? S.settings.hudBottom : 16;
    const rect = hudEl.getBoundingClientRect();
    const w = rect.width || hudEl.offsetWidth || 200;
    const h = rect.height || hudEl.offsetHeight || 32;
    const [clampedR, clampedB] = clampHud(r, b, w, h);
    hudEl.style.right = clampedR + "px";
    hudEl.style.bottom = clampedB + "px";
  }

  function initHudDrag() {
    hudEl.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || hudDrag) return;
      // Start from the position we set, not the box: the entrance animation may still be moving it.
      const curR = parseFloat(hudEl.style.right) || 16;
      const curB = parseFloat(hudEl.style.bottom) || 16;
      hudDrag = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startRight: curR,
        startBottom: curB,
        currentRight: curR,
        currentBottom: curB,
        dragging: false,
      };
      try {
        hudEl.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    hudEl.addEventListener("pointermove", (e) => {
      if (!hudDrag || hudDrag.pointerId !== e.pointerId) return;
      const dx = e.clientX - hudDrag.startX;
      const dy = e.clientY - hudDrag.startY;
      if (!hudDrag.dragging) {
        if (Math.hypot(dx, dy) < 4) return;
        hudDrag.dragging = true;
        hudEl.classList.add("xh-dragging");
      }
      e.preventDefault();
      const rawR = hudDrag.startRight - dx;
      const rawB = hudDrag.startBottom - dy;
      const rect = hudEl.getBoundingClientRect();
      const w = rect.width || hudEl.offsetWidth || 200;
      const h = rect.height || hudEl.offsetHeight || 32;
      const [r, b] = clampHud(rawR, rawB, w, h);
      hudDrag.currentRight = Math.round(r);
      hudDrag.currentBottom = Math.round(b);
      hudEl.style.right = hudDrag.currentRight + "px";
      hudEl.style.bottom = hudDrag.currentBottom + "px";
    });

    hudEl.addEventListener("pointerup", (e) => {
      if (!hudDrag || hudDrag.pointerId !== e.pointerId) return;
      try {
        if (hudEl.hasPointerCapture && hudEl.hasPointerCapture(e.pointerId)) {
          hudEl.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      const wasDragging = hudDrag.dragging;
      const finalRight = hudDrag.currentRight;
      const finalBottom = hudDrag.currentBottom;
      hudEl.classList.remove("xh-dragging");
      hudDrag = null;
      if (wasDragging) {
        store.update(["settings"], (s) => {
          s.settings.hudRight = finalRight;
          s.settings.hudBottom = finalBottom;
        });
      }
    });

    hudEl.addEventListener("pointercancel", (e) => {
      if (!hudDrag || hudDrag.pointerId !== e.pointerId) return;
      try {
        if (hudEl.hasPointerCapture && hudEl.hasPointerCapture(e.pointerId)) {
          hudEl.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      hudEl.classList.remove("xh-dragging");
      hudDrag = null;
      applyHudPosition();
    });
  }

  function renderHud() {
    if (!S) return;
    if (!S.settings.hud) {
      if (hudEl) hudEl.hidden = true;
      return;
    }
    if (!hudEl) {
      hudEl = document.createElement("div");
      hudEl.className = "xh-hud";
      initHudDrag();
      document.body.appendChild(hudEl);
    }
    hudEl.title = t("hud_hint");
    const d = { likes: 0, replies: 0, posts: 0, follows: 0, seconds: 0, ...(S.days[store.dayKey()] || {}) };
    const goal = S.settings.dailyReplyGoal;
    const replies = goal ? `${d.replies}/${goal}` : String(d.replies);
    const follows = d.follows || 0;
    const now = Date.now();
    const paceMinutes = S.settings.paceMinutes || 60;
    const followPace = S.settings.followPace;
    const followTimes = (S.pace && S.pace.follows) || [];
    const followPaceCount = followTimes.filter((t) => now - t <= paceMinutes * 60000).length;
    const followWarnState = S.settings.followWarn && (follows > S.settings.followLimit || followPaceCount > followPace) ? "warn" : "";
    // [key, value, label, state]; state colours the number (ok / warn).
    const items = [
      ["likes", d.likes, t("hud_likes")],
      ["replies", replies, t("hud_replies"), goal && d.replies >= goal ? "ok" : ""],
      ["posts", d.posts, t("hud_posts")],
      ["follows", follows, t("hud_follows"), followWarnState],
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
    applyHudPosition();
  }

  // Fade the stats bar while scrolling so it never sits on top of what you are reading.
  let scrollTimer = null;
  window.addEventListener(
    "scroll",
    () => {
      if (!hudEl || (hudDrag && hudDrag.dragging)) return;
      hudEl.classList.add("xh-scrolling");
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => hudEl.classList.remove("xh-scrolling"), 1000);
    },
    { passive: true }
  );

  window.addEventListener("resize", applyHudPosition, { passive: true });

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
    toastEl.replaceChildren();
    if (kind === "warn") toastEl.append(XH.icon("warn", 16));
    toastEl.append(document.createTextNode(text));
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
        togglePanel(null, "nfb");
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyK") {
        e.preventDefault();
        if (S && S.settings && S.settings.keyAccounts) {
          togglePanel(null, "keys");
        }
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyS" && !isTyping(e.target)) {
        e.preventDefault();
        if (S && S.settings && S.settings.keyAccounts) {
          handleAltS();
        }
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyB" && !isTyping(e.target)) {
        e.preventDefault();
        if (S && S.settings && S.settings.topPosts) {
          handleAltB();
        }
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyN" && !isTyping(e.target)) {
        e.preventDefault();
        if (S && S.settings && S.settings.localNotes) {
          handleAltN();
        }
      } else if (e.key === "Escape" && noteEditorEl) {
        closeNoteEditor();
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
  let relHandles = {}; // lowercase -> handle as X shows it, for moving notes; not stored
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

  let inSeenPending = {};
  let inboundPending = {};
  let inboundTimer = null;
  let lastInboundWrite = 0;

  function recordInbound(candidates) {
    if (!Array.isArray(candidates) || !candidates.length) return;
    let changed = false;
    for (const c of candidates) {
      if (!c || !c.key || !c.from || !c.from.handle) continue;
      if (isMe(c.from.handle)) continue;
      if ((S && S.inSeen && S.inSeen[c.key]) || inSeenPending[c.key]) continue;

      const h = c.from.handle.toLowerCase();
      const at = typeof c.at === "number" ? c.at : Date.now();

      inSeenPending[c.key] = at;
      const cur = inboundPending[h] || { likes: 0, replies: 0, quotes: 0, mentions: 0, last: 0 };
      if (c.kind === "like") cur.likes++;
      else if (c.kind === "reply") cur.replies++;
      else if (c.kind === "quote") cur.quotes++;
      else if (c.kind === "mention") cur.mentions++;
      cur.last = Math.max(cur.last, at);
      inboundPending[h] = cur;

      if (S) {
        if (!S.inSeen) S.inSeen = {};
        S.inSeen[c.key] = at;
        let p = S.people[h];
        if (!p) p = S.people[h] = { likes: 0, replies: 0, last: 0 };
        if (!p.in) p.in = { likes: 0, replies: 0, quotes: 0, mentions: 0, last: 0 };
        if (c.kind === "like") p.in.likes++;
        else if (c.kind === "reply") p.in.replies++;
        else if (c.kind === "quote") p.in.quotes++;
        else if (c.kind === "mention") p.in.mentions++;
        p.in.last = Math.max(p.in.last, at);
      }
      changed = true;
    }

    if (!changed) return;
    annotateAll();

    if (inboundTimer) return;
    const delay = Math.max(0, 2000 - (Date.now() - lastInboundWrite));
    inboundTimer = setTimeout(() => {
      inboundTimer = null;
      lastInboundWrite = Date.now();
      const batchSeen = inSeenPending;
      const batchInbound = inboundPending;
      inSeenPending = {};
      inboundPending = {};

      store.update(["people", "inSeen"], (s) => {
        Object.assign(s.inSeen, batchSeen);
        for (const [h, diff] of Object.entries(batchInbound)) {
          const p = store.person(s, h);
          if (!p.in) p.in = { likes: 0, replies: 0, quotes: 0, mentions: 0, last: 0 };
          p.in.likes += diff.likes;
          p.in.replies += diff.replies;
          p.in.quotes += diff.quotes;
          p.in.mentions += diff.mentions;
          p.in.last = Math.max(p.in.last, diff.last);
        }
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
    if (payload.n && payload.n.length) recordInbound(payload.n);
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
          if (p.author) {
            const h = p.author.toLowerCase();
            handleFollowers.delete(h);
            handleFollowers.set(h, p.authorFollowers);
          }
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
      for (const h of handleFollowers.keys()) {
        if (handleFollowers.size <= MAX_VIEWS) break;
        handleFollowers.delete(h);
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
    for (const u of users) {
      const k = u.handle.toLowerCase();
      const prev = relPending[k];
      // Within one batch, a later sighting that leaves a flag out keeps the earlier one.
      relPending[k] = prev ? { ...u, following: u.following ?? prev.following, followedBy: u.followedBy ?? prev.followedBy } : u;
      relHandles[k] = u.handle;
    }
    const onFollowingPage = me && location.pathname.toLowerCase() === "/" + me.toLowerCase() + "/following";
    clearTimeout(relTimer);
    relTimer = setTimeout(() => {
      const batch = relPending;
      const shown = relHandles;
      relPending = {};
      relHandles = {};
      store.update(["rel", "relMeta", "notes"], (s) => {
        const now = Date.now();
        for (const [k, u] of Object.entries(batch)) s.rel[k] = store.nextRel(s.rel[k], u, now);
        // A known user id under a new handle means the account was renamed: its note follows it.
        for (const [k, u] of Object.entries(batch)) {
          if (!u.id) continue;
          store.renameNote(s.notes, u.id, shown[k] || k);
          if (s.notes[k] && !s.notes[k].id) s.notes[k].id = u.id;
        }
        s.relMeta.last = Date.now();
        if (onFollowingPage) s.relMeta.scan = Date.now();
      });
    }, 1000);
  });

  // ---------- follows and unfollows (X's own answers to the user's requests, via page-hook.js) ----------

  function onFriendship({ handle, id, name, on }) {
    const k = handle.toLowerCase();
    const now = Date.now();
    // A sighting still waiting in the 1 s batch was read before this follow or unfollow.
    if (relPending[k]) delete relPending[k].following;
    store.update(["days", "rel", "pace"], (s) => {
      const d = store.today(s);
      if (on) d.follows = (d.follows || 0) + 1;
      else d.unfollows = (d.unfollows || 0) + 1;
      s.rel[k] = store.relAfterFriendship(s.rel[k], { id, name, on }, now);
      const list = (on ? s.pace.follows : s.pace.unfollows) || [];
      const updated = store.prunePace(list.concat(now), now);
      if (on) s.pace.follows = updated;
      else s.pace.unfollows = updated;
    });
    if (!S) return;
    const field = on ? "follows" : "unfollows";
    const limit = on ? S.settings.followLimit : S.settings.unfollowLimit;
    const pace = on ? S.settings.followPace : S.settings.unfollowPace;
    const paceMinutes = S.settings.paceMinutes || 60;
    const dailyOver = ((S.days[store.dayKey()] || {})[field] || 0) + 1 > limit;
    const paceTimes = ((S.pace && (on ? S.pace.follows : S.pace.unfollows)) || []).concat(now);
    const paceCount = paceTimes.filter((t) => now - t <= paceMinutes * 60000).length;
    const paceOver = paceCount > pace;

    if (S.settings.followWarn) {
      if (dailyOver) return toast(t(on ? "follow_limit" : "unfollow_limit", { n: limit }), "warn", 5000);
      if (paceOver) return toast(t(on ? "follow_pace" : "unfollow_pace", { n: pace, m: paceMinutes === 60 ? t("pace_hour") : t("pace_minutes", { n: paceMinutes }) }), "warn", 5000);
    }
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
  let panelMode = "nfb"; // "nfb" or "keys"

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

  const AVATAR_COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f43f5e",
    "#ea580c",
    "#d97706",
    "#059669",
    "#0d9488",
    "#0284c7",
    "#2563eb",
    "#7c3aed",
    "#db2777",
  ];

  function avatarColor(handle) {
    let hash = 0;
    const str = String(handle || "");
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function makeAvatar(handle, name) {
    const initial = (name || handle || "?").trim().charAt(0).toUpperCase() || "?";
    const av = el("div", "xh-panel-avatar", initial);
    av.setAttribute("aria-hidden", "true");
    av.style.backgroundColor = avatarColor(handle);
    return av;
  }

  function buildPanel() {
    panelEl = el("aside", "xh-panel");
    panelEl.hidden = true;
    panelEl.setAttribute("aria-label", t("nfb_title"));
    const head = el("header", "xh-panel-head");
    const title = el("h2", "xh-panel-title");
    const close = el("button", "xh-panel-close");
    close.type = "button";
    close.title = close.ariaLabel = t("nfb_close");
    close.append(XH.icon("close", 16));
    close.addEventListener("click", () => togglePanel(false));
    head.append(title, close);

    const searchWrap = el("div", "xh-panel-search-wrap");
    searchWrap.append(XH.icon("search", 14));
    const search = el("input", "xh-panel-search");
    search.type = "search";
    search.placeholder = t("nfb_search");
    search.addEventListener("input", () => {
      panelQuery = search.value.trim().replace(/^@/, "").toLowerCase();
      renderPanel(true);
    });
    searchWrap.append(search);

    panelEl.append(head, el("div", "xh-panel-info"), searchWrap, el("ol", "xh-panel-list"), el("footer", "xh-panel-foot"));
    // Keep X's single-key shortcuts (j, k, l, r…) from firing while typing in the search box.
    // Alt shortcuts (Alt+K, Alt+U, Alt+H) and Escape are allowed through.
    panelEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape" || e.altKey) return;
      e.stopPropagation();
    });
    document.body.appendChild(panelEl);
  }

  function togglePanel(open, mode) {
    if (!panelEl) buildPanel();
    if (mode && mode !== panelMode) {
      panelMode = mode;
      panelQuery = "";
      const search = panelEl.querySelector(".xh-panel-search");
      if (search) search.value = "";
      if (open == null) open = true;
    }
    const show = open == null ? panelEl.hidden : open;
    panelEl.hidden = !show;
    if (show) {
      renderPanel(true);
      panelEl.querySelector(".xh-panel-search").focus({ preventScroll: true });
    }
  }

  function renderPanel(force) {
    if (!S || !panelEl || panelEl.hidden) return;
    if (panelMode === "keys") {
      renderKeysPanel(force);
    } else {
      renderNfbPanel(force);
    }
  }

  function renderNfbPanel(force) {
    panelEl.setAttribute("aria-label", t("nfb_title"));
    const now = Date.now();
    const me = (myHandle() || "").toLowerCase();
    // isHandle: each row links to "/" + handle, so a stored "/evil.com" must never become "//evil.com".
    const all = Object.entries(S.rel).filter(([h, r]) => r && r.f && h !== me && store.isHandle(h));
    const rows = store.notFollowingBack(S.rel, me);
    const matches = ([h, r]) => !panelQuery || h.includes(panelQuery) || (r.n || "").toLowerCase().includes(panelQuery);
    // Mutuals who stopped following back and haven't been dismissed go on top, newest first.
    const isRecent = ([, r]) => r.lostAt != null && !r.ackAt;
    const recent = rows.filter((x) => isRecent(x) && matches(x)).sort(([, a], [, b]) => b.lostAt - a.lostAt);
    const matching = rows.filter((x) => !isRecent(x) && matches(x));
    const shown = matching.slice(0, PANEL_MAX);
    const today = S.days[store.dayKey()] || {};
    const key = JSON.stringify([
      "nfb",
      recent.map(([h, r]) => [h, r.n, r.lostAt, r.mAt]),
      shown.map(([h, r]) => [h, r.n, r.t]),
      rows.length,
      S.relMeta.scan,
      today.unfollows,
      me,
      panelQuery,
    ]);
    if (!force && panelEl.dataset.key === key) return;
    panelEl.dataset.key = key;

    panelEl.querySelector(".xh-panel-title").replaceChildren(t("nfb_title"), el("span", "xh-panel-count", String(rows.length)));

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
    if (all.length >= 20 && mutual === 0) {
      const warnP = el("p", "xh-panel-warn");
      warnP.append(XH.icon("warn", 14), document.createTextNode(" " + t("nfb_suspect", { n: all.length })));
      info.append(warnP);
    }

    const list = panelEl.querySelector(".xh-panel-list");
    list.replaceChildren();
    if (recent.length) {
      list.append(el("li", "xh-panel-section", t("nfb_recent", { n: recent.length })));
      for (const [h, r] of recent) {
        const li = el("li", "xh-panel-recent");
        const a = el("a", "xh-panel-row");
        a.href = "/" + h;
        // When they were last seen as mutuals tells how recent the unfollow really is.
        const meta = [t("nfb_lost", { ago: XH.ago(r.lostAt, now) })];
        if (r.mAt != null) meta.push(t("nfb_was", { ago: XH.ago(r.mAt, now) }));
        const p = S.people[h];
        if (p && p.likes + p.replies > 0) meta.push(t("nfb_you", { n: p.likes + p.replies }));

        const av = makeAvatar(h, r.n);
        const body = el("div", "xh-panel-body");
        const user = el("div", "xh-panel-user");
        user.append(
          el("span", "xh-panel-name", r.n || h),
          el("span", "xh-panel-handle", "@" + h)
        );
        body.append(user, el("span", "xh-panel-meta", meta.join(" · ")));
        a.append(av, body);

        const dismiss = el("button", "xh-panel-dismiss");
        dismiss.type = "button";
        dismiss.title = dismiss.ariaLabel = t("nfb_dismiss", { h });
        dismiss.append(XH.icon("close", 14));
        dismiss.addEventListener("click", () => {
          store.update(["rel"], (s) => {
            if (s.rel[h]) s.rel[h].ackAt = Date.now();
          });
        });
        li.append(a, dismiss);
        list.append(li);
      }
      if (shown.length) list.append(el("li", "xh-panel-section", t("nfb_rest")));
    }
    list.append(
      ...shown.map(([h, r]) => {
        const li = el("li");
        const a = el("a", "xh-panel-row");
        a.href = "/" + h;
        const meta = [t("nfb_seen", { ago: XH.ago(r.t, now) })];
        if (now - r.t > S.settings.relStaleDays * 86400000) meta[0] += t("rel_stale");
        const p = S.people[h];
        if (p && p.likes + p.replies > 0) meta.push(t("nfb_you", { n: p.likes + p.replies }));

        const av = makeAvatar(h, r.n);
        const body = el("div", "xh-panel-body");
        const user = el("div", "xh-panel-user");
        user.append(
          el("span", "xh-panel-name", r.n || h),
          el("span", "xh-panel-handle", "@" + h)
        );
        body.append(user, el("span", "xh-panel-meta", meta.join(" · ")));
        a.append(av, body);
        li.append(a);
        return li;
      })
    );
    if (!shown.length && !recent.length) list.append(el("li", "xh-panel-muted xh-panel-empty", t("nfb_empty")));
    if (matching.length > PANEL_MAX) {
      list.append(el("li", "xh-panel-muted xh-panel-empty", t("nfb_more", { n: PANEL_MAX, total: matching.length })));
    }

    const foot = panelEl.querySelector(".xh-panel-foot");
    foot.replaceChildren();
    const footText = el("div", "xh-panel-foot-text", t("nfb_footer", {
      n: today.unfollows || 0,
      limit: S.settings.unfollowLimit,
    }));
    const footBar = el("div", "xh-panel-foot-bar");
    const footFill = el("div", "xh-panel-foot-fill");
    const unfollowLimit = S.settings.unfollowLimit || 20;
    const unfollowRatio = Math.min(1, Math.max(0, (today.unfollows || 0) / unfollowLimit));
    footFill.style.width = Math.round(unfollowRatio * 100) + "%";
    if (unfollowRatio >= 1) footFill.dataset.state = "warn";
    footBar.append(footFill);
    foot.append(footText, footBar);
  }

  function renderKeysPanel(force) {
    panelEl.setAttribute("aria-label", t("key_panel_title"));
    const now = Date.now();
    const quietDays = (S.settings && S.settings.quietDays) || 14;

    const all = store.quietKeys(S.keys, S.people, quietDays, now);
    const quietCount = all.filter((item) => item.isQuiet).length;

    const matching = all.filter(
      (item) => !panelQuery || item.h.includes(panelQuery) || (item.entry.h || "").toLowerCase().includes(panelQuery)
    );
    const shown = matching.slice(0, PANEL_MAX);

    const key = JSON.stringify([
      "keys",
      shown.map((x) => [x.h, x.entry.h, x.latest, x.isQuiet]),
      all.length,
      quietCount,
      quietDays,
      panelQuery,
    ]);
    if (!force && panelEl.dataset.key === key) return;
    panelEl.dataset.key = key;

    const countText = all.length + (quietCount > 0 ? " · " + t("key_quiet_count", { n: quietCount }) : "");
    panelEl.querySelector(".xh-panel-title").replaceChildren(t("key_panel_title"), el("span", "xh-panel-count", countText));

    const info = panelEl.querySelector(".xh-panel-info");
    info.replaceChildren(el("p", "xh-panel-muted", t("key_panel_hint")));

    const list = panelEl.querySelector(".xh-panel-list");
    list.replaceChildren(
      ...shown.map((item) => {
        const li = el("li");
        const a = el("a", "xh-panel-row");
        a.href = "/" + item.h;
        const displayH = item.entry.h || item.h;
        const nameText = (S.rel && S.rel[item.h] && S.rel[item.h].n) || displayH;

        const av = makeAvatar(item.h, nameText);
        const body = el("div", "xh-panel-body");
        const user = el("div", "xh-panel-user");
        const name = el("span", "xh-panel-name", nameText);
        if (item.isQuiet) {
          name.append(el("span", "xh-quiet-mark", t("key_quiet")));
        }
        const handle = el("span", "xh-panel-handle", "@" + displayH);
        user.append(name, handle);

        const youStr = item.youLast ? XH.ago(item.youLast, now) : t("key_never");
        const themStr = item.themLast ? XH.ago(item.themLast, now) : t("key_never");
        const meta = el("span", "xh-panel-meta", t("key_both_last", { you: youStr, them: themStr }));

        body.append(user, meta);
        a.append(av, body);
        li.append(a);
        return li;
      })
    );

    if (!all.length) {
      list.append(el("li", "xh-panel-muted xh-panel-empty", t("key_empty_hint")));
    } else if (!shown.length) {
      list.append(el("li", "xh-panel-muted xh-panel-empty", t("nfb_empty")));
    } else if (matching.length > PANEL_MAX) {
      list.append(el("li", "xh-panel-muted xh-panel-empty", t("nfb_more", { n: PANEL_MAX, total: matching.length })));
    }

    const foot = panelEl.querySelector(".xh-panel-foot");
    foot.replaceChildren(el("div", "xh-panel-foot-text", t("key_panel_footer", { days: quietDays })));
  }

  // The toolbar popup's button opens the panel in this tab.
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "xh-panel") {
      const mode = msg.mode || "nfb";
      if (mode === "keys" && (!S || !S.settings || !S.settings.keyAccounts)) return;
      togglePanel(true, mode);
    }
  });

  // ---------- wiring ----------

  let annotateTimer = null;
  new MutationObserver(() => {
    clearTimeout(annotateTimer);
    annotateTimer = setTimeout(annotateAll, 250);
  }).observe(document.body, { childList: true, subtree: true });

  store.onChange((s) => {
    S = s;
    if (s && s.settings) XH.setLang(XH.resolveLang(s.settings.lang, navigator.language));
    if (!s.settings.dupWarn) hideDup();
    if (panelMode === "keys" && s.settings && !s.settings.keyAccounts) togglePanel(false);
    if (!s.settings.localNotes) closeNoteEditor();
    annotateAll();
    renderHud();
    renderPanel();
  });

  store.get().then((s) => {
    S = s;
    if (s && s.settings) XH.setLang(XH.resolveLang(s.settings.lang, navigator.language));
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
