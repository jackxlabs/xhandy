(async function () {
  const { store, LANGS } = globalThis.XH;
  const XH = globalThis.XH;
  const $ = (id) => document.getElementById(id);
  const NUMS = ["staleHours", "heatWarm", "heatHot", "dupThreshold", "dupWindow", "repeatShort", "dailyReplyGoal", "relStaleDays", "followLimit", "unfollowLimit", "followPace", "unfollowPace", "paceMinutes"];
  const CHECKS = ["showAge", "showHeat", "showSeen", "showInbound", "showReplies", "showReplied", "showRel", "dupWarn", "followWarn", "hud"];

  let lastRelMeta = null;
  let lastRelCount = 0;

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

  async function load() {
    const all = await store.get();
    const s = all.settings;

    XH.setLang(XH.resolveLang(s.lang, navigator.language));
    applyI18n();
    renderLangSelect(s.lang);

    $("targets").value = s.targets.join("\n");
    for (const k of NUMS) $(k).value = s[k];
    for (const k of CHECKS) $(k).checked = s[k];
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
    renderRelStatus();
  });

  $("showAge").addEventListener("change", syncDisabled);
  $("showSeen").addEventListener("change", syncDisabled);

  $("save").addEventListener("click", async () => {
    await store.update(["settings"], (s) => {
      s.settings.targets = $("targets")
        .value.split("\n")
        .map((h) => h.trim().replace(/^@/, ""))
        .filter(Boolean);
      for (const k of NUMS) {
        const v = Number($(k).value);
        if (Number.isFinite(v)) {
          s.settings[k] = k === "paceMinutes" ? Math.max(5, Math.min(1440, Math.round(v))) : v;
        }
      }
      for (const k of CHECKS) {
        s.settings[k] = $(k).checked;
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

  $("import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
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

  load();
})();
