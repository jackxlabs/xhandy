(async function () {
  const { store, LANGS } = globalThis.XH;
  const XH = globalThis.XH;
  const $ = (id) => document.getElementById(id);

  const NUMS = [
    "staleHours",
    "heatWarm",
    "heatHot",
    "dupThreshold",
    "dupWindow",
    "repeatShort",
    "dailyReplyGoal",
    "relStaleDays",
    "followLimit",
    "unfollowLimit",
    "followPace",
    "unfollowPace",
    "paceMinutes",
    "quietDays",
    "tintFull",
    "tintHalfLife",
  ];

  const CHECKS = [
    "showAge",
    "showHeat",
    "showSeen",
    "showInbound",
    "showTint",
    "showReplies",
    "showReplied",
    "showRel",
    "dupWarn",
    "followWarn",
    "hud",
    "keyAccounts",
    "topPosts",
    "localNotes",
  ];

  const RANGE_TABLE = {
    staleHours: { min: 1, max: 10000, integer: true },
    heatWarm: { min: 0, max: 10000000, integer: false },
    heatHot: { min: 0, max: 10000000, integer: false },
    dupThreshold: { min: 0, max: 1, integer: false },
    dupWindow: { min: 1, max: 1000, integer: true },
    repeatShort: { min: 1, max: 100, integer: true },
    dailyReplyGoal: { min: 0, max: 10000, integer: true },
    relStaleDays: { min: 1, max: 3650, integer: true },
    followLimit: { min: 1, max: 10000, integer: true },
    unfollowLimit: { min: 1, max: 10000, integer: true },
    followPace: { min: 1, max: 10000, integer: true },
    unfollowPace: { min: 1, max: 10000, integer: true },
    paceMinutes: { min: 5, max: 1440, integer: true },
    quietDays: { min: 1, max: 365, integer: true },
    tintFull: { min: 2, max: 500, integer: true },
    tintHalfLife: { min: 1, max: 365, integer: true },
  };

  const SECTION_KEY = "xh:opt_section";
  const VALID_SECTIONS = ["general", "badges", "rel", "dup", "keys", "notes", "data"];

  let lastRelMeta = null;
  let lastRelCount = 0;
  let allKeys = {};
  let allNotes = {};
  let allPeople = {};
  let keyQuery = "";
  let noteQuery = "";
  let noteFilterStatus = "";
  let savedTimer = null;
  const inputDebounceTimers = {};

  function getStoredSection() {
    try {
      const val = sessionStorage.getItem(SECTION_KEY);
      return VALID_SECTIONS.includes(val) ? val : "general";
    } catch (_) {
      return "general";
    }
  }

  function storeSection(name) {
    try {
      sessionStorage.setItem(SECTION_KEY, name);
    } catch (_) {}
  }

  function switchSection(secName) {
    const targetId = "sec-" + secName;
    const targetEl = $(targetId);
    if (!targetEl) return;

    document.querySelectorAll(".opt-section").forEach((sec) => {
      sec.hidden = sec.id !== targetId;
    });

    document.querySelectorAll(".opt-nav-item").forEach((btn) => {
      const isCurrent = btn.dataset.section === secName;
      if (isCurrent) {
        btn.setAttribute("aria-current", "true");
        btn.classList.add("active");
      } else {
        btn.removeAttribute("aria-current");
        btn.classList.remove("active");
      }
    });

    storeSection(secName);
  }

  function checkHash() {
    const hash = (location.hash || "").replace(/^#/, "");
    if (!hash) return;
    const secName = hash.replace(/^sec-/, "");
    if (VALID_SECTIONS.includes(secName)) {
      switchSection(secName);
      return;
    }
    const target = document.getElementById(hash);
    if (target) {
      const parentSec = target.closest(".opt-section");
      if (parentSec) {
        const sName = parentSec.id.replace(/^sec-/, "");
        if (VALID_SECTIONS.includes(sName)) switchSection(sName);
      }
    }
  }

  document.querySelectorAll(".opt-nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sec = btn.dataset.section;
      if (sec) switchSection(sec);
    });
  });

  window.addEventListener("hashchange", checkHash);

  function applyI18n() {
    document.documentElement.lang = XH.lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = XH.t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.placeholder = XH.t(el.getAttribute("data-i18n-ph"));
    });
    const titleEl = document.querySelector("title[data-i18n]");
    if (titleEl) {
      document.title = XH.t(titleEl.getAttribute("data-i18n"));
    }
  }

  function renderLangSelect(chosen) {
    const sel = $("lang");
    if (!sel) return;
    const currentVal = chosen !== undefined ? chosen : sel.value || "auto";
    sel.replaceChildren();

    const autoOpt = document.createElement("option");
    autoOpt.value = "auto";
    autoOpt.textContent = XH.t("opt_lang_auto");
    sel.appendChild(autoOpt);

    for (const lang of XH.LANGS) {
      const opt = document.createElement("option");
      opt.value = lang.code;
      opt.textContent = lang.name;
      sel.appendChild(opt);
    }
    sel.value = currentVal;
  }

  function renderRelStatus() {
    const relStatusEl = $("relStatus");
    if (!relStatusEl) return;
    const last = lastRelMeta && lastRelMeta.last;
    const mins = last ? Math.round((Date.now() - last) / 60000) : null;
    relStatusEl.textContent = last
      ? XH.t("opt_rel_known", { n: lastRelCount, mins })
      : XH.t("opt_rel_none");
  }

  function syncDisabled() {
    const showAge = $("showAge");
    const showHeat = $("showHeat");
    if (showAge && showHeat) {
      showHeat.disabled = !showAge.checked;
    }
    const showSeen = $("showSeen");
    const showInbound = $("showInbound");
    if (showSeen && showInbound) {
      showInbound.disabled = !showSeen.checked;
    }
    const showTint = $("showTint");
    const tintFull = $("tintFull");
    const tintHalfLife = $("tintHalfLife");
    if (showTint) {
      if (tintFull) tintFull.disabled = !showTint.checked;
      if (tintHalfLife) tintHalfLife.disabled = !showTint.checked;
    }
  }

  function updateSwitchAria(el) {
    if (el) {
      el.setAttribute("aria-checked", String(el.checked));
    }
  }

  function showSaved() {
    const statusEl = $("status");
    if (!statusEl) return;
    statusEl.textContent = XH.t("opt_saved");
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = setTimeout(() => {
      statusEl.textContent = "";
    }, 1500);
  }

  async function saveSetting(key, value) {
    let finalVal = value;
    const rule = RANGE_TABLE[key];
    if (rule) {
      if (typeof finalVal !== "number" || !Number.isFinite(finalVal)) return;
      finalVal = Math.max(rule.min, Math.min(rule.max, finalVal));
      if (rule.integer) finalVal = Math.round(finalVal);
      const el = $(key);
      if (el && Number(el.value) !== finalVal) {
        el.value = finalVal;
      }
    }

    await store.update(["settings"], (s) => {
      s.settings[key] = finalVal;
    });

    showSaved();
  }

  function markFieldInvalid(key, el, invalid) {
    const errEl = $("err-" + key);
    if (invalid) {
      el.setAttribute("aria-invalid", "true");
      if (errEl) {
        errEl.hidden = false;
        el.setAttribute("aria-errormessage", "err-" + key);
      }
    } else {
      el.removeAttribute("aria-invalid");
      el.removeAttribute("aria-errormessage");
      if (errEl) errEl.hidden = true;
    }
  }

  async function handleNumberCommit(key, el) {
    if (inputDebounceTimers[key]) {
      clearTimeout(inputDebounceTimers[key]);
      inputDebounceTimers[key] = null;
    }
    const raw = el.value.trim();
    if (raw === "" || Number.isNaN(Number(raw))) {
      markFieldInvalid(key, el, true);
      return;
    }
    markFieldInvalid(key, el, false);
    await saveSetting(key, Number(raw));
  }

  function renderKeyAccountsList() {
    const listEl = $("keyList");
    if (!listEl) return;
    const now = Date.now();
    const rows = Object.entries(allKeys)
      .filter(([h]) => store.isHandle(h))
      .filter(([h, entry]) => !keyQuery || h.includes(keyQuery) || (entry.h || "").toLowerCase().includes(keyQuery))
      .sort(([a], [b]) => a.localeCompare(b));

    listEl.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "key-empty";
      empty.textContent = XH.t("opt_keys_empty");
      listEl.appendChild(empty);
      return;
    }

    for (const [h, entry] of rows) {
      const row = document.createElement("div");
      row.className = "key-row";
      row.dataset.handle = h;

      const info = document.createElement("div");
      info.className = "key-row-info";

      const link = document.createElement("a");
      const displayH = entry.h || h;
      link.href = "https://x.com/" + displayH;
      link.target = "_blank";
      link.textContent = "@" + displayH;

      const p = allPeople[h];
      const youStr = p && p.last ? XH.ago(p.last, now) : XH.t("key_never");
      const themStr = p && p.in && p.in.last ? XH.ago(p.in.last, now) : XH.t("key_never");
      const inter = XH.t("key_both_last", { you: youStr, them: themStr });

      const meta = document.createElement("span");
      meta.className = "key-row-meta";
      const addedDate = entry.t ? new Date(entry.t).toLocaleDateString() : "";
      meta.textContent = addedDate
        ? `${XH.t("opt_keys_added_date", { date: addedDate })} · ${inter}`
        : inter;

      info.append(link, meta);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove";
      removeBtn.dataset.handle = h;
      removeBtn.textContent = XH.t("opt_key_remove");
      removeBtn.addEventListener("click", async () => {
        await store.update(["keys"], (s) => {
          delete s.keys[h];
        });
        delete allKeys[h];
        renderKeyAccountsList();
      });

      row.append(info, removeBtn);
      listEl.appendChild(row);
    }
  }

  function renderNotesList() {
    const listEl = $("noteList");
    if (!listEl) return;
    const entries = Object.entries(allNotes).filter(([h]) => store.isHandle(h));

    listEl.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "key-empty";
      empty.textContent = XH.t("opt_notes_empty");
      listEl.appendChild(empty);
      return;
    }

    const filtered = entries
      .filter(([h, entry]) => {
        if (noteFilterStatus && entry.s !== noteFilterStatus) return false;
        if (!noteQuery) return true;
        const q = noteQuery.replace(/^@/, "").toLowerCase();
        if (h.toLowerCase().includes(q) || (entry.h || "").toLowerCase().includes(q)) return true;
        if (Array.isArray(entry.tags) && entry.tags.some((t) => t.toLowerCase().includes(q))) return true;
        if (entry.text && entry.text.toLowerCase().includes(q)) return true;
        return false;
      })
      .sort(([, a], [, b]) => (b.u || b.t || 0) - (a.u || a.t || 0));

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "key-empty";
      empty.textContent = XH.t("opt_notes_none");
      listEl.appendChild(empty);
      return;
    }

    for (const [h, entry] of filtered) {
      const row = document.createElement("div");
      row.className = "key-row";
      row.dataset.handle = h;

      const info = document.createElement("div");
      info.className = "key-row-info";

      const link = document.createElement("a");
      const displayH = entry.h || h;
      link.href = "https://x.com/" + displayH;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "@" + displayH;

      const meta = document.createElement("span");
      meta.className = "key-row-meta";
      const parts = [];
      if (entry.s) parts.push(XH.t("note_s_" + entry.s));
      if (Array.isArray(entry.tags) && entry.tags.length > 0) {
        parts.push(entry.tags.map((t) => "#" + t).join(" "));
      }
      if (entry.text) {
        const firstLine = entry.text.split("\n")[0].trim();
        const truncated = Array.from(firstLine).slice(0, 80).join("");
        if (truncated) parts.push(truncated);
      }
      const dateVal = entry.u || entry.t;
      if (dateVal) {
        const dateStr = new Date(dateVal).toLocaleDateString();
        parts.push(XH.t("opt_note_last_edited", { date: dateStr }));
      }
      meta.textContent = parts.join(" · ");

      info.append(link, meta);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "remove";
      delBtn.dataset.handle = h;
      delBtn.textContent = XH.t("opt_note_del");
      delBtn.addEventListener("click", async () => {
        await store.update(["notes"], (s) => {
          delete s.notes[h];
        });
        delete allNotes[h];
        renderNotesList();
      });

      row.append(info, delBtn);
      listEl.appendChild(row);
    }
  }

  async function load() {
    const all = await store.get();
    const s = all.settings;

    XH.setLang(XH.resolveLang(s.lang, navigator.language));
    applyI18n();
    renderLangSelect(s.lang);

    allKeys = all.keys || {};
    allNotes = all.notes || {};
    allPeople = all.people || {};
    renderKeyAccountsList();
    renderNotesList();

    for (const k of NUMS) {
      if ($(k)) {
        $(k).value = s[k];
        markFieldInvalid(k, $(k), false);
      }
    }
    for (const k of CHECKS) {
      if ($(k)) {
        $(k).checked = !!s[k];
        updateSwitchAria($(k));
      }
    }
    syncDisabled();

    lastRelCount = Object.keys(all.rel || {}).length;
    lastRelMeta = all.relMeta;
    renderRelStatus();

    checkHash();
    if (!location.hash) {
      switchSection(getStoredSection());
    }
  }

  $("lang").addEventListener("change", async (e) => {
    const lang = e.target.value;
    await saveSetting("lang", lang);
    XH.setLang(XH.resolveLang(lang, navigator.language));
    applyI18n();
    renderLangSelect(lang);
    renderKeyAccountsList();
    renderNotesList();
    renderRelStatus();
  });

  for (const k of CHECKS) {
    const el = $(k);
    if (!el) continue;
    el.addEventListener("change", async () => {
      syncDisabled();
      updateSwitchAria(el);
      await saveSetting(k, el.checked);
    });
  }

  for (const k of NUMS) {
    const el = $(k);
    if (!el) continue;

    el.addEventListener("input", () => {
      if (inputDebounceTimers[k]) {
        clearTimeout(inputDebounceTimers[k]);
        inputDebounceTimers[k] = null;
      }
      const raw = el.value.trim();
      if (raw === "" || Number.isNaN(Number(raw))) {
        markFieldInvalid(k, el, true);
        return;
      }
      markFieldInvalid(k, el, false);
      inputDebounceTimers[k] = setTimeout(() => {
        inputDebounceTimers[k] = null;
        handleNumberCommit(k, el);
      }, 600);
    });

    el.addEventListener("change", () => {
      handleNumberCommit(k, el);
    });
  }

  const hudResetBtn = $("hudReset");
  if (hudResetBtn) {
    hudResetBtn.addEventListener("click", async () => {
      await store.update(["settings"], (s) => {
        s.settings.hudRight = 16;
        s.settings.hudBottom = 16;
      });
      showSaved();
    });
  }

  $("keySearch").addEventListener("input", (e) => {
    keyQuery = e.target.value.trim().replace(/^@/, "").toLowerCase();
    renderKeyAccountsList();
  });

  if ($("noteSearch")) {
    $("noteSearch").addEventListener("input", (e) => {
      noteQuery = e.target.value.trim().toLowerCase();
      renderNotesList();
    });
  }

  if ($("noteFilter")) {
    $("noteFilter").addEventListener("change", (e) => {
      noteFilterStatus = e.target.value;
      renderNotesList();
    });
  }

  $("keyAddBtn").addEventListener("click", async () => {
    const rawVal = $("keyPaste").value;
    const lines = rawVal.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    let added = 0;
    let skipped = 0;
    const toAdd = [];
    for (const line of lines) {
      const h = line.replace(/^@/, "").trim();
      if (store.isHandle(h)) {
        toAdd.push(h);
      } else {
        skipped++;
      }
    }
    if (toAdd.length > 0) {
      const now = Date.now();
      await store.update(["keys"], (s) => {
        if (!s.keys) s.keys = {};
        for (const h of toAdd) {
          const lower = h.toLowerCase();
          if (!s.keys[lower]) {
            s.keys[lower] = { h, t: now };
            added++;
          }
        }
      });
      const data = await store.get();
      allKeys = data.keys || {};
      renderKeyAccountsList();
    }
    $("keyPaste").value = "";
    if (skipped > 0) {
      const key = skipped === 1 ? "opt_keys_skipped" : "opt_keys_skipped_plural";
      $("keyAddReport").textContent = XH.t(key, { n: skipped });
    } else if (added > 0) {
      $("keyAddReport").textContent = XH.t("opt_keys_added", { n: added });
    } else {
      $("keyAddReport").textContent = "";
    }
  });

  $("export").addEventListener("click", async () => {
    const data = await store.get();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `xhandy-${store.dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("import-btn").addEventListener("click", () => $("import").click());
  $("import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file || !confirm(XH.t("opt_import_confirm"))) return;
    try {
      await store.replaceAll(JSON.parse(await file.text()));
      await load();
      $("status").textContent = XH.t("opt_imported");
    } catch (err) {
      alert(XH.t("opt_invalid_file", { msg: err.message }));
    }
  });

  const clearBtn = $("clear") || $("reset");
  if (clearBtn) {
    clearBtn.addEventListener("click", async () => {
      if (!confirm(XH.t("opt_reset_confirm"))) return;
      await store.reset();
      await load();
    });
  }

  store.onChange((all) => {
    if (all && all.notes) {
      allNotes = all.notes;
      renderNotesList();
    }
    if (all && all.keys) {
      allKeys = all.keys;
      renderKeyAccountsList();
    }
  });

  load();
})();