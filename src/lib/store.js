// All state lives in chrome.storage.local. Nothing leaves the browser.
// Each top-level part (settings, rel, ...) is its own key ("xh:rel"), so a write touches only the parts
// it changes: the 15-second time tick rewrites a few bytes of "xh:days", not 30,000 relationships.
(function () {
  const XH = (globalThis.XH = globalThis.XH || {});
  const PREFIX = "xh:";
  const VERSION_KEY = "xh:v";
  const VERSION = 5;
  const LEGACY_KEY = "xh"; // v1 kept everything under this one key

  const DEFAULTS = {
    settings: {
      lang: "auto", // interface language: "auto" (follow browser), "en", "zh"
      staleHours: 48,
      showHeat: true, // colour the age chip by views per hour
      heatWarm: 1000, // views/hour from which a post counts as warm
      heatHot: 10000, // ... and hot
      dupThreshold: 0.6,
      dupWindow: 50, // compare against the last N sent texts
      repeatShort: 3, // warn when the same short text was sent this many times
      hud: true,
      hudRight: 16,
      hudBottom: 16,
      dailyReplyGoal: 0, // 0 = no goal
      showRel: true, // follow relationship in post badges
      followLimit: 20, // soft daily follow limit: warn above this, never block
      unfollowLimit: 20, // same for unfollows made by hand on X
      relStaleDays: 30,
      showReplies: true, // show reply count and author follower count in post badges
      showReplied: true, // mark posts the user already replied to
      showInbound: true, // show interactions from others in post badges
      showAge: true, // post age chip (incl. heat and old post)
      showSeen: true, // interaction count chip
      dupWarn: true, // duplicate-reply warning
      followWarn: true, // follow and unfollow limit and pace reminders
      followPace: 10, // warn when follows in paceMinutes exceed this
      unfollowPace: 10, // warn when unfollows in paceMinutes exceed this
      paceMinutes: 60, // pace reminder window in minutes
      keyAccounts: true, // key accounts feature switch (star, highlight, panel)
      quietDays: 14, // days of inactivity before a key account is marked quiet
      topPosts: true, // open X search for an account's top posts
      localNotes: true, // private notes and tags on accounts
    },
    people: {}, // handle -> { likes, replies, last, in?: { likes, replies, quotes, mentions, last } }
    sent: [], // { t, text, kind: "reply" | "post", to }
    days: {}, // "YYYY-MM-DD" -> { likes, replies, posts, seconds }
    rel: {}, // handle (lowercase) -> { f: I follow them, fb: they follow me, id, n: display name, t: seen at }
    relMeta: {
      last: 0,
      scan: 0,
      me: { handle: null, followers: 0, id: null, t: 0 }, // handle, followers, id, t of the signed-in account
    },
    replied: {}, // postId -> timestamp
    inSeen: {}, // key -> timestamp
    pace: { follows: [], unfollows: [] },
    keys: {}, // handle (lowercase) -> { h: displayHandle, t: addedAt }
    notes: {}, // handle (lowercase) -> { h, id?, s?, tags?, text?, t, u }
  };
  const PARTS = Object.keys(DEFAULTS);
  const MAX_REL = 30000;
  const MAX_SENT = 300;
  const MAX_TEXT = 25000; // X's longest post
  const MAX_REPLIED = 5000;
  const MAX_IN_SEEN = 20000;
  const MAX_PACE = 100;
  const MAX_KEYS = 1000;
  const MAX_NOTES = 5000;
  const MAX_NOTE_TEXT = 500;
  const MAX_NOTE_TAGS = 5;
  const MAX_TAG_LEN = 20;
  const NOTE_STATUS = ["reach", "touch", "regular", "work"];
  const PACE_WINDOW_MS = 24 * 60 * 60 * 1000;

  const keyOf = (part) => PREFIX + part;
  const partOf = (key) => (key.startsWith(PREFIX) && PARTS.includes(key.slice(PREFIX.length)) ? key.slice(PREFIX.length) : null);

  function dayKey(d = new Date()) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // ---------- validation ----------
  // Data reaches storage from three places the extension doesn't control: window events from the
  // page (any script on x.com can send them), import files, and older versions' data. Anything that
  // ends up in a link, a selector or a comparison is checked here first.

  const HANDLE = /^[A-Za-z0-9_]{1,15}$/;
  const ID = /^\d{1,20}$/;
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const INBOUND_KEY = /^(L:\d{1,20}:\d{1,20}|P:\d{1,20})$/; // L:<liker>:<post>, P:<post>
  // Handles are used as object keys; these names would hit Object.prototype instead of our data.
  const RESERVED = new Set(["__proto__", "constructor", "prototype"]);
  const isHandle = (h) => typeof h === "string" && HANDLE.test(h) && !RESERVED.has(h.toLowerCase());
  const isId = (id) => typeof id === "string" && ID.test(id);
  const isNonNegInt = (n) => typeof n === "number" && Number.isInteger(n) && n >= 0;
  const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  const num = (n, def = 0) => (typeof n === "number" && Number.isFinite(n) ? n : def);
  const str = (s, max) => (typeof s === "string" ? s.slice(0, max) : null);

  // Collapses "a\na\na" (from the nested composer bug) to "a". a must be non-empty.
  function untriple(text) {
    if (typeof text !== "string") return text;
    const rem = text.length - 2;
    if (rem < 3 || rem % 3 !== 0) return text;
    const len = rem / 3;
    const a = text.slice(0, len);
    return text === a + "\n" + a + "\n" + a ? a : text;
  }

  // The signed-in account in relMeta.me.
  function cleanMe(m) {
    if (!isObj(m)) return { ...DEFAULTS.relMeta.me };
    return {
      handle: isHandle(m.handle) ? m.handle : null,
      followers: isNonNegInt(m.followers) ? m.followers : 0,
      id: isId(m.id) ? m.id : null,
      t: num(m.t, 0),
    };
  }

  // Keep the newest MAX_REPLIED replied-to post ids.
  function capReplied(r) {
    const ids = Object.keys(r);
    if (ids.length <= MAX_REPLIED) return;
    ids.sort((a, b) => r[a] - r[b]).slice(0, ids.length - MAX_REPLIED).forEach((id) => delete r[id]);
  }

  // Keep the newest MAX_IN_SEEN counted inbound interaction keys.
  function capInSeen(seen) {
    const keys = Object.keys(seen);
    if (keys.length <= MAX_IN_SEEN) return;
    keys.sort((a, b) => seen[a] - seen[b]).slice(0, keys.length - MAX_IN_SEEN).forEach((k) => delete seen[k]);
  }

  // Keep the MAX_REL most recently seen relationships.
  function capRel(rel) {
    const handles = Object.keys(rel);
    if (handles.length <= MAX_REL) return;
    handles
      .sort((a, b) => rel[a].t - rel[b].t)
      .slice(0, handles.length - MAX_REL)
      .forEach((h) => delete rel[h]);
  }

  // Keep the newest MAX_KEYS key accounts, dropping the oldest by added timestamp.
  function capKeys(k) {
    if (!isObj(k)) return;
    const handles = Object.keys(k);
    if (handles.length <= MAX_KEYS) return;
    handles
      .sort((a, b) => ((k[a] && k[a].t) || 0) - ((k[b] && k[b].t) || 0))
      .slice(0, handles.length - MAX_KEYS)
      .forEach((h) => delete k[h]);
  }

  // Keep the newest MAX_NOTES notes, dropping the oldest by updated timestamp.
  function capNotes(notes) {
    if (!isObj(notes)) return;
    const handles = Object.keys(notes);
    if (handles.length <= MAX_NOTES) return;
    handles
      .sort((a, b) => ((notes[a] && notes[a].u) || 0) - ((notes[b] && notes[b].u) || 0))
      .slice(0, handles.length - MAX_NOTES)
      .forEach((h) => delete notes[h]);
  }

  const chars = (x) => Array.from(x);

  // Tags: trimmed, leading # dropped, 1-20 characters, unique ignoring case, at most 5.
  function cleanTags(tags) {
    if (!Array.isArray(tags)) return [];
    const seen = new Set();
    const out = [];
    for (const raw of tags) {
      if (typeof raw !== "string") continue;
      const tag = raw.trim().replace(/^#+/, "").trim();
      const n = chars(tag).length;
      if (n < 1 || n > MAX_TAG_LEN || seen.has(tag.toLowerCase())) continue;
      seen.add(tag.toLowerCase());
      out.push(tag);
      if (out.length >= MAX_NOTE_TAGS) break;
    }
    return out;
  }

  // One account's note, or null when it holds no status, tags or text.
  function cleanNote(handle, v) {
    if (!isHandle(handle) || !isObj(v)) return null;
    const st = NOTE_STATUS.includes(v.s) ? v.s : null;
    const tags = cleanTags(v.tags);
    const text = typeof v.text === "string" ? chars(v.text.trim()).slice(0, MAX_NOTE_TEXT).join("") : "";
    if (!st && !tags.length && !text) return null;
    const t = Math.max(0, num(v.t));
    const out = { h: isHandle(v.h) ? v.h : handle, t, u: Math.max(num(v.u), t) };
    if (isId(v.id)) out.id = v.id;
    if (st) out.s = st;
    if (tags.length) out.tags = tags;
    if (text) out.text = text;
    return out;
  }

  // Saves the user's edit into the notes part. An empty note deletes it; a new account is refused
  // when MAX_NOTES are stored, so nothing the user wrote is ever dropped to make room.
  function saveNote(notes, handle, input, now = Date.now()) {
    if (!isHandle(handle)) return { ok: false, reason: "handle" };
    const k = handle.toLowerCase();
    const old = notes[k];
    const note = cleanNote(handle, { ...(isObj(input) ? input : {}), id: isObj(input) && isId(input.id) ? input.id : old && old.id, t: old ? old.t : now, u: now });
    if (!note) {
      delete notes[k];
      return { ok: true, deleted: true };
    }
    if (!old && Object.keys(notes).length >= MAX_NOTES) return { ok: false, reason: "full" };
    notes[k] = note;
    return { ok: true };
  }

  // The account with this user id now uses newHandle: move its note there. If both keys hold a note,
  // the one edited last wins. Returns whether anything changed.
  function renameNote(notes, id, newHandle) {
    if (!isId(id) || !isHandle(newHandle)) return false;
    const k = newHandle.toLowerCase();
    const from = Object.keys(notes).find((h) => h !== k && notes[h] && notes[h].id === id);
    if (!from) return false;
    const moved = { ...notes[from], h: newHandle };
    delete notes[from];
    if (!notes[k] || notes[k].u <= moved.u) notes[k] = moved;
    return true;
  }

  // The stored relation after X reports u = { name, id, following?, followedBy? } at time now.
  // mAt: last seen mutual, lostAt: a mutual stopped following back, ackAt: the user dismissed that.
  // A flag X left out keeps its stored value and never starts or ends a mutual or an unfollow.
  function nextRel(prev, u, now) {
    // Same handle, different user id: the handle now belongs to someone else, so nothing carries over.
    const reused = prev && u.id && prev.id && u.id !== prev.id;
    const old = prev && !reused ? prev : { f: false, fb: false, id: null, n: null };
    const next = { ...old, id: u.id || old.id || null, n: u.name || old.n || null, t: now };
    if (typeof u.following === "boolean") next.f = u.following;
    if (typeof u.followedBy === "boolean") next.fb = u.followedBy;
    // Only a mutual X actually showed counts; f and fb can both be true after the user unfollows and follows again.
    const wasMutual = old.mAt != null;
    if (u.following === true && u.followedBy === true) {
      next.mAt = now;
      delete next.lostAt;
      delete next.ackAt;
    } else if (u.following === true && u.followedBy === false && wasMutual) {
      if (old.lostAt == null) next.lostAt = now;
    }
    return next;
  }

  // The stored relation after X confirms the user followed (on) or unfollowed someone.
  // Unfollowing ends the mutual from the user's side, so it can never turn into an "unfollowed you" alert.
  function relAfterFriendship(prev, { id, name, on }, now) {
    const old = prev || { fb: false, id: null, n: null };
    const next = { ...old, id: id || old.id, n: name || old.n, f: on, t: now };
    if (!on) {
      delete next.mAt;
      delete next.lostAt;
      delete next.ackAt;
    }
    return next;
  }

  function cleanInbound(v) {
    if (!isObj(v)) return null;
    return {
      likes: num(v.likes),
      replies: num(v.replies),
      quotes: num(v.quotes),
      mentions: num(v.mentions),
      last: num(v.last),
    };
  }

  // Each setting keeps the type of its default; a wrong type falls back to the default.
  function cleanSettings(v) {
    const def = DEFAULTS.settings;
    const out = { ...def };
    if (!isObj(v)) return out;
    for (const k of Object.keys(def)) {
      if (typeof def[k] === "number") {
        out[k] = num(v[k], def[k]);
      } else if (typeof v[k] === typeof def[k]) {
        out[k] = v[k];
      }
    }
    return out;
  }

  function cleanRelEntry(r) {
    if (!isObj(r)) return null;
    const e = { f: r.f === true, fb: r.fb === true, id: isId(r.id) ? r.id : null, n: str(r.n, 100), t: num(r.t) };
    // Unfollow detection: mutual since, unfollow detected at, alert dismissed at.
    for (const k of ["mAt", "lostAt", "ackAt"]) if (isNonNegInt(r[k])) e[k] = r[k];
    return e;
  }

  function cleanPaceList(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter((t) => typeof t === "number" && Number.isFinite(t) && t >= 0)
      .sort((a, b) => a - b)
      .slice(-MAX_PACE);
  }

  function cleanPace(p) {
    if (!isObj(p)) return { follows: [], unfollows: [] };
    return {
      follows: cleanPaceList(p.follows),
      unfollows: cleanPaceList(p.unfollows),
    };
  }

  // Drops times older than 24 hours and keeps the newest MAX_PACE.
  function prunePace(list, now = Date.now()) {
    if (!Array.isArray(list)) return [];
    const n = typeof now === "number" && Number.isFinite(now) ? now : Date.now();
    const cutoff = n - PACE_WINDOW_MS;
    return list
      .filter((t) => typeof t === "number" && Number.isFinite(t) && t >= 0 && t >= cutoff)
      .sort((a, b) => a - b)
      .slice(-MAX_PACE);
  }

  // A whole state object from an import file: drop what can't be right, keep the rest.
  function cleanState(data) {
    const s = isObj(data) ? data : {};
    const out = {
      settings: cleanSettings(s.settings),
      people: {},
      sent: [],
      days: {},
      rel: {},
      relMeta: { ...DEFAULTS.relMeta, me: { ...DEFAULTS.relMeta.me } },
      replied: {},
      inSeen: {},
      pace: cleanPace(s.pace),
      keys: {},
      notes: {},
    };
    for (const [h, p] of Object.entries(isObj(s.people) ? s.people : {})) {
      if (isHandle(h) && isObj(p)) {
        const entry = { likes: num(p.likes), replies: num(p.replies), last: num(p.last) };
        if (p.in != null) {
          const inbound = cleanInbound(p.in);
          if (inbound) entry.in = inbound;
        }
        out.people[h.toLowerCase()] = entry;
      }
    }
    for (const x of Array.isArray(s.sent) ? s.sent : []) {
      if (!isObj(x) || typeof x.text !== "string" || x.text.length > MAX_TEXT) continue;
      out.sent.push({ t: num(x.t), text: untriple(x.text), kind: x.kind === "reply" ? "reply" : "post", to: isHandle(x.to) ? x.to : null });
    }
    if (out.sent.length > MAX_SENT) out.sent = out.sent.slice(-MAX_SENT);
    for (const [k, d] of Object.entries(isObj(s.days) ? s.days : {})) {
      if (!DAY.test(k) || !isObj(d)) continue;
      const day = {};
      for (const f of ["likes", "replies", "posts", "follows", "unfollows", "seconds"]) day[f] = num(d[f]);
      out.days[k] = day;
    }
    for (const [h, r] of Object.entries(isObj(s.rel) ? s.rel : {})) {
      const e = isHandle(h) && cleanRelEntry(r);
      if (e) out.rel[h.toLowerCase()] = e;
    }
    capRel(out.rel);
    if (isObj(s.relMeta)) {
      out.relMeta = {
        last: num(s.relMeta.last),
        scan: num(s.relMeta.scan),
        me: cleanMe(s.relMeta.me),
      };
    }
    for (const [id, t] of Object.entries(isObj(s.replied) ? s.replied : {})) {
      if (isId(id)) out.replied[id] = num(t);
    }
    capReplied(out.replied);
    for (const [k, t] of Object.entries(isObj(s.inSeen) ? s.inSeen : {})) {
      if (typeof k === "string" && INBOUND_KEY.test(k)) out.inSeen[k] = num(t);
    }
    capInSeen(out.inSeen);
    if (s.keys != null) {
      for (const [h, entry] of Object.entries(isObj(s.keys) ? s.keys : {})) {
        if (isHandle(h) && isObj(entry) && typeof entry.t === "number" && Number.isFinite(entry.t) && entry.t >= 0) {
          out.keys[h.toLowerCase()] = {
            h: isHandle(entry.h) ? entry.h : h,
            t: entry.t,
          };
        }
      }
    } else if (s.settings && Array.isArray(s.settings.targets)) {
      const now = Date.now();
      for (const h of s.settings.targets) {
        if (isHandle(h)) {
          out.keys[h.toLowerCase()] = { h, t: now };
        }
      }
    }
    capKeys(out.keys);
    if (isObj(s.notes)) {
      for (const [h, n] of Object.entries(s.notes)) {
        if (!isHandle(h)) continue;
        const entry = cleanNote(h, n);
        if (entry) out.notes[h.toLowerCase()] = entry;
      }
    }
    capNotes(out.notes);
    return out;
  }

  // The "xh-relations" event from page-hook.js. Returns { u, v, f, c, at } with only well-formed entries,
  // or null. A script on x.com can still send believable data; it just can't send links or selectors.
  function cleanRelations(detail) {
    let p;
    try {
      p = JSON.parse(detail);
    } catch (_) {
      return null;
    }
    if (!isObj(p)) return null;
    const u = [];
    for (const x of Array.isArray(p.u) ? p.u : []) {
      if (!isObj(x) || !isHandle(x.handle)) continue;
      if (x.followers != null && !isNonNegInt(x.followers)) continue;
      const uEntry = {
        handle: x.handle,
        name: str(x.name, 100),
        id: isId(x.id) ? x.id : null,
      };
      // Flags X left out stay out: the caller keeps what it already knows.
      if (typeof x.following === "boolean") uEntry.following = x.following;
      if (typeof x.followedBy === "boolean") uEntry.followedBy = x.followedBy;
      if (isNonNegInt(x.followers)) uEntry.followers = x.followers;
      u.push(uEntry);
    }
    const v = [];
    for (const x of Array.isArray(p.v) ? p.v : []) {
      if (!isObj(x) || !isId(x.id)) continue;
      if (x.views != null && !isNonNegInt(x.views)) continue;
      if (x.replies != null && !isNonNegInt(x.replies)) continue;
      if (x.author != null && !isHandle(x.author)) continue;
      if (x.authorFollowers != null && !isNonNegInt(x.authorFollowers)) continue;
      if (x.inReplyTo != null && !isId(x.inReplyTo)) continue;

      const post = { id: x.id };
      if (isNonNegInt(x.views)) post.views = x.views;
      if (isNonNegInt(x.replies)) post.replies = x.replies;
      if (isHandle(x.author)) post.author = x.author;
      if (isNonNegInt(x.authorFollowers)) post.authorFollowers = x.authorFollowers;
      if (isId(x.inReplyTo)) post.inReplyTo = x.inReplyTo;
      v.push(post);
    }
    const f = (Array.isArray(p.f) ? p.f : [])
      .filter((x) => isObj(x) && isHandle(x.handle) && typeof x.on === "boolean")
      .map((x) => ({ handle: x.handle, name: str(x.name, 100), id: isId(x.id) ? x.id : null, on: x.on }));
    const c = [];
    for (const x of Array.isArray(p.c) ? p.c : []) {
      if (!isObj(x)) continue;
      if (x.seen === true) {
        c.push({ seen: true });
      } else if (x.ok === false) {
        c.push({ ok: false });
      } else if (x.shape === "unknown") {
        c.push({ shape: "unknown" });
      } else if (
        x.ok === true &&
        (x.kind === "reply" || x.kind === "post") &&
        typeof x.text === "string" &&
        x.text.length <= MAX_TEXT &&
        (x.to == null || isHandle(x.to)) &&
        (x.inReplyTo == null || isId(x.inReplyTo))
      ) {
        c.push({
          ok: true,
          kind: x.kind,
          text: x.text,
          to: isHandle(x.to) ? x.to : null,
          inReplyTo: isId(x.inReplyTo) ? x.inReplyTo : null,
        });
      }
    }
    const n = [];
    const INBOUND_KINDS = ["like", "reply", "quote", "mention"];
    for (const x of Array.isArray(p.n) ? p.n : []) {
      if (!isObj(x) || !INBOUND_KINDS.includes(x.kind)) continue;
      if (!isObj(x.from) || !isHandle(x.from.handle)) continue;
      if (typeof x.key !== "string" || !INBOUND_KEY.test(x.key)) continue;
      n.push({
        kind: x.kind,
        from: {
          handle: x.from.handle,
          id: isId(x.from.id) ? x.from.id : null,
          name: str(x.from.name, 100),
        },
        key: x.key,
        at: num(x.at, Date.now()),
      });
    }
    return { u, v, f, c, n, at: num(p.at, Date.now()) };
  }

  function partWithDefaults(part, v) {
    const def = DEFAULTS[part];
    if (Array.isArray(def)) return Array.isArray(v) ? v : [];
    if (part === "settings") return cleanSettings(v);
    if (part === "relMeta") {
      const r = isObj(v) ? v : {};
      return {
        ...def,
        ...r,
        me: cleanMe(r.me),
      };
    }
    if (part === "pace") return cleanPace(v);
    if (part === "keys") return isObj(v) ? v : {};
    if (part === "notes") return isObj(v) ? v : {};
    return v || {};
  }

  function withDefaults(s) {
    s = s || {};
    const out = {};
    for (const part of PARTS) out[part] = partWithDefaults(part, s[part]);
    return out;
  }

  // Runs once per page, before any read or write.
  // v1 -> v2: split the single "xh" object into one key per part.
  // v2 -> v3: collapse tripled sent history entries.
  // v3 -> v4: move settings.targets into keys.
  let migrated = null;
  function migrate() {
    return (migrated =
      migrated ||
      (async () => {
        const r = await chrome.storage.local.get([VERSION_KEY, LEGACY_KEY]);
        let v = r[VERSION_KEY] || 0;
        if (v >= VERSION) return;
        if (r[LEGACY_KEY]) {
          const legacy = r[LEGACY_KEY];
          const old = withDefaults(legacy);
          if (legacy.settings && Array.isArray(legacy.settings.targets)) {
            old.settings.targets = legacy.settings.targets;
          }
          const out = { [VERSION_KEY]: 2 };
          for (const part of PARTS) out[keyOf(part)] = old[part];
          if (old.settings.targets) out[keyOf("settings")].targets = old.settings.targets;
          await chrome.storage.local.set(out);
          await chrome.storage.local.remove(LEGACY_KEY);
          v = 2;
        }
        if (v < 3) {
          const sr = await chrome.storage.local.get(keyOf("sent"));
          const out = { [VERSION_KEY]: 3 };
          if (Array.isArray(sr[keyOf("sent")])) {
            out[keyOf("sent")] = sr[keyOf("sent")].map((x) =>
              isObj(x) && typeof x.text === "string" ? { ...x, text: untriple(x.text) } : x
            );
          }
          await chrome.storage.local.set(out);
          v = 3;
        }
        if (v < 4) {
          const sr = await chrome.storage.local.get([keyOf("settings"), keyOf("keys")]);
          const settings = isObj(sr[keyOf("settings")]) ? sr[keyOf("settings")] : {};
          const keys = isObj(sr[keyOf("keys")]) ? sr[keyOf("keys")] : {};
          const now = Date.now();
          if (Array.isArray(settings.targets)) {
            for (const h of settings.targets) {
              if (isHandle(h)) {
                const lower = h.toLowerCase();
                if (!keys[lower]) {
                  keys[lower] = { h, t: now };
                }
              }
            }
            delete settings.targets;
          }
          capKeys(keys);
          await chrome.storage.local.set({
            [VERSION_KEY]: 4,
            [keyOf("settings")]: settings,
            [keyOf("keys")]: keys,
          });
        }
        if (v < 5) {
          // Unfollow detection only trusts mAt. A mutual stored before it existed was last seen mutual at its t.
          const sr = await chrome.storage.local.get(keyOf("rel"));
          const rel = sr[keyOf("rel")];
          const out = { [VERSION_KEY]: 5 };
          let changed = false;
          for (const r of Object.values(isObj(rel) ? rel : {})) {
            if (isObj(r) && r.f === true && r.fb === true && r.mAt == null) {
              r.mAt = isNonNegInt(r.t) ? r.t : 0;
              changed = true;
            }
          }
          if (changed) out[keyOf("rel")] = rel;
          await chrome.storage.local.set(out);
        }
      })());
  }

  async function read(parts) {
    await migrate();
    const r = await chrome.storage.local.get(parts.map(keyOf));
    const s = {};
    for (const part of parts) s[part] = partWithDefaults(part, r[keyOf(part)]);
    return s;
  }

  async function get() {
    return withDefaults(await read(PARTS));
  }

  // update(parts, fn): reads only `parts`, lets fn change them, writes only them back.
  // Touching a part that was not listed throws, so a missing name shows up in tests instead of losing data.
  // update(fn) without parts still works and rewrites everything; use it only where every part may change.
  // Writes are serialized within this page so quick clicks don't overwrite each other.
  let chain = Promise.resolve();
  function update(parts, fn) {
    if (typeof parts === "function") [parts, fn] = [PARTS, parts];
    const unknown = parts.filter((p) => !PARTS.includes(p));
    if (unknown.length) throw new Error(`store.update: unknown part ${unknown.join(", ")}`);
    const next = chain.then(async () => {
      const s = await read(parts);
      const guarded = new Proxy(s, {
        get(target, k) {
          if (PARTS.includes(k) && !parts.includes(k)) throw new Error(`store.update: "${k}" not in [${parts}]`);
          return target[k];
        },
      });
      fn(guarded);
      if (s.sent && s.sent.length > MAX_SENT) s.sent = s.sent.slice(-MAX_SENT);
      if (s.rel) capRel(s.rel);
      if (s.replied) capReplied(s.replied);
      if (s.inSeen) capInSeen(s.inSeen);
      if (s.pace) {
        if (Array.isArray(s.pace.follows) && s.pace.follows.length > MAX_PACE) {
          s.pace.follows = s.pace.follows.slice(-MAX_PACE);
        }
        if (Array.isArray(s.pace.unfollows) && s.pace.unfollows.length > MAX_PACE) {
          s.pace.unfollows = s.pace.unfollows.slice(-MAX_PACE);
        }
      }
      if (s.keys) capKeys(s.keys);
      const out = {};
      for (const part of parts) out[keyOf(part)] = s[part];
      await chrome.storage.local.set(out);
      return s;
    });
    chain = next.catch(() => {}); // one failed update must not block the ones after it
    return next;
  }

  function today(s) {
    const k = dayKey();
    return (s.days[k] = s.days[k] || { likes: 0, replies: 0, posts: 0, follows: 0, unfollows: 0, seconds: 0 });
  }

  function person(s, handle) {
    const h = handle.toLowerCase();
    return (s.people[h] = s.people[h] || { likes: 0, replies: 0, last: 0 });
  }

  // cb gets the full state after any part changes, in this page or another one.
  function onChange(cb) {
    let state = null;
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area !== "local") return;
      const changed = Object.keys(changes).map(partOf).filter(Boolean);
      if (!changed.length) return;
      if (!state) state = await get();
      else for (const part of changed) state[part] = partWithDefaults(part, changes[keyOf(part)].newValue);
      cb(withDefaults(state));
    });
  }

  async function replaceAll(data) {
    await migrate();
    const s = cleanState(data);
    const out = { [VERSION_KEY]: VERSION };
    for (const part of PARTS) out[keyOf(part)] = s[part];
    await chrome.storage.local.set(out);
  }

  async function reset() {
    await chrome.storage.local.remove([...PARTS.map(keyOf), VERSION_KEY, LEGACY_KEY]);
  }

  // Accounts followed by the user that do not follow back.
  // Returns [[handle, relEntry], ...] sorted alphabetically by handle.
  function notFollowingBack(rel, meHandle) {
    if (!isObj(rel)) return [];
    const me = typeof meHandle === "string" ? meHandle.trim().toLowerCase().replace(/^@/, "") : "";
    const rows = [];
    for (const [h, r] of Object.entries(rel)) {
      if (!isObj(r) || !r.f || r.fb) continue;
      if (!isHandle(h) || h.toLowerCase() === me) continue;
      rows.push([h, r]);
    }
    return rows.sort(([a], [b]) => a.localeCompare(b));
  }

  // Key accounts sorted by last interaction time ascending (quietest first).
  // Returns [{ h, entry, youLast, themLast, latest, isQuiet }, ...].
  function quietKeys(keys, people, quietDays = 14, now = Date.now()) {
    if (!isObj(keys)) return [];
    const pTable = isObj(people) ? people : {};
    const days = typeof quietDays === "number" && Number.isFinite(quietDays) && quietDays > 0 ? quietDays : 14;
    const n = typeof now === "number" && Number.isFinite(now) ? now : Date.now();
    const quietThresholdMs = days * 86400000;

    const rows = [];
    for (const [h, entry] of Object.entries(keys)) {
      if (!isHandle(h)) continue;
      const cleanEntry = isObj(entry) ? entry : { h, t: 0 };
      const p = pTable[h.toLowerCase()];
      const youLast = (p && typeof p.last === "number" && Number.isFinite(p.last)) ? p.last : 0;
      const themLast = (p && p.in && typeof p.in.last === "number" && Number.isFinite(p.in.last)) ? p.in.last : 0;
      const latest = Math.max(youLast, themLast);
      const isQuiet = !latest || n - latest >= quietThresholdMs;
      rows.push({ h, entry: cleanEntry, youLast, themLast, latest, isQuiet });
    }

    rows.sort((a, b) => {
      if (a.latest !== b.latest) return a.latest - b.latest;
      return a.h.localeCompare(b.h);
    });

    return rows;
  }

  XH.store = { PARTS, DEFAULTS, MAX_REPLIED, MAX_IN_SEEN, MAX_PACE, MAX_KEYS, MAX_NOTES, NOTE_STATUS, dayKey, get, update, today, person, onChange, replaceAll, reset, isHandle, isId, isNonNegInt, cleanRelations, nextRel, relAfterFriendship, untriple, prunePace, cleanNote, saveNote, renameNote, notFollowingBack, quietKeys };
})();
