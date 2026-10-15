(async function () {
  const { store } = globalThis.XH;
  const $ = (id) => document.getElementById(id);
  const NUMS = ["staleHours", "heatWarm", "heatHot", "dupThreshold", "dupWindow", "repeatShort", "dailyReplyGoal", "relStaleDays", "followLimit", "unfollowLimit"];

  async function load() {
    const all = await store.get();
    const s = all.settings;
    $("targets").value = s.targets.join("\n");
    for (const k of NUMS) $(k).value = s[k];
    $("hud").checked = s.hud;
    $("showRel").checked = s.showRel;
    $("showHeat").checked = s.showHeat;
    const n = Object.keys(all.rel).length;
    const last = all.relMeta.last;
    const mins = last ? Math.round((Date.now() - last) / 60000) : null;
    // If X renames its fields, this stops updating: that is the signal to update x-helper.
    $("relStatus").textContent = last
      ? `${n} accounts known · last update ${mins} min ago / 已记录 ${n} 个账号 · 最近更新 ${mins} 分钟前`
      : "No relationship data yet. Open x.com and scroll a bit. / 还没有数据，打开 x.com 刷一会儿。";
  }

  $("save").addEventListener("click", async () => {
    await store.update((s) => {
      s.settings.targets = $("targets")
        .value.split("\n")
        .map((h) => h.trim().replace(/^@/, ""))
        .filter(Boolean);
      for (const k of NUMS) {
        const v = Number($(k).value);
        if (Number.isFinite(v)) s.settings[k] = v;
      }
      s.settings.hud = $("hud").checked;
      s.settings.showRel = $("showRel").checked;
      s.settings.showHeat = $("showHeat").checked;
    });
    $("status").textContent = "Saved / 已保存";
    setTimeout(() => ($("status").textContent = ""), 1500);
  });

  $("export").addEventListener("click", async () => {
    const data = await store.get();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `x-helper-${store.dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await store.replaceAll(JSON.parse(await file.text()));
      await load();
      $("status").textContent = "Imported / 已导入";
    } catch (err) {
      alert("Invalid file / 文件无效: " + err.message);
    }
  });

  $("reset").addEventListener("click", async () => {
    if (!confirm("Delete all x-helper data in this browser? / 确定清空本浏览器里的全部数据？")) return;
    await store.reset();
    await load();
  });

  load();
})();
