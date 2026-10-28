(async function () {
  const { store, LANGS } = globalThis.XH;
  const XH = globalThis.XH;
  const $ = (id) => document.getElementById(id);
  const NUMS = ["staleHours", "heatWarm", "heatHot", "dupThreshold", "dupWindow", "repeatShort", "dailyReplyGoal", "relStaleDays", "followLimit", "unfollowLimit", "followPace", "unfollowPace", "paceMinutes", "quietDays"];
  const CHECKS = ["showAge", "showHeat", "showSeen", "showInbound", "showReplies", "showReplied", "showRel", "dupWarn", "followWarn", "hud", "keyAccounts", "topPosts", "localNotes"];

  let lastRelMeta = null;
  let lastRelCount = 0;
  let allKeys = {};
  let allNotes = {};
  let allPeople = {};
  let keyQuery = "";
  let noteQuery = "";
  let noteFilterStatus = "";

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
    const last = lastRelMeta && lastRelMeta.last;
    const mins = last ? Math.round((Date.now() - last) / 60000) : null;
    $("relStatus").textContent = last
      ? XH.t("opt_rel_known", { n: lastRelCount, mins })
      : XH.t("opt_rel_none");
  }

  function syncDisabled() {
    $("showHeat").disabled = !$("showAge").checked;
    $("showInbound").disabled = !$("showSeen").checked;
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
      if ($(k)) $(k).value = s[k];
    }
    for (const k of CHECKS) {
      if ($(k)) $(k).checked = s[k];
    }
    syncDisabled();

    lastRelCount = Object.keys(all.rel || {}).length;
    lastRelMeta = all.relMeta;
    renderRelStatus();
  }

  $("lang").addEventListener("change", async (e) => {
    const lang = e.target.value;
    await store.update(["settings"], (s) => {
      s.settings.lang = lang;
    });
    XH.setLang(XH.resolveLang(lang, navigator.language));
    applyI18n();
    renderLangSelect(lang);
    renderKeyAccountsList();
    renderNotesList();
    renderRelStatus();
  });

  $("showAge").addEventListener("change", syncDisabled);
  $("showSeen").addEventListener("change", syncDisabled);

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

  $("save").addEventListener("click", async () => {
    await store.update(["settings"], (s) => {
      for (const k of NUMS) {
        if (!$(k)) continue;
        const v = Number($(k).value);
        if (Number.isFinite(v)) {
          if (k === "paceMinutes") {
            s.settings[k] = Math.max(5, Math.min(1440, Math.round(v)));
          } else if (k === "quietDays") {
            s.settings[k] = Math.max(1, Math.min(365, Math.round(v)));
          } else {
            s.settings[k] = v;
          }
        }
      }
      for (const k of CHECKS) {
        if ($(k)) s.settings[k] = $(k).checked;
      }
    });
    $("status").textContent = XH.t("opt_saved");
    setTimeout(() => ($("status").textContent = ""), 1500);
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

  $("reset").addEventListener("click", async () => {
    if (!confirm(XH.t("opt_reset_confirm"))) return;
    await store.reset();
    await load();
  });

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
