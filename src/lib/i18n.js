// Tiny i18n with runtime language switching and locale files in src/locales/.
(function () {
  const XH = (globalThis.XH = globalThis.XH || {});
  XH.locales = XH.locales || {};

  XH.LANGS = [
    { code: "en", name: "English" },
    { code: "zh", name: "中文" },
  ];

  XH.resolveLang = function (setting, browserLang) {
    if (setting && XH.LANGS.some((l) => l.code === setting)) {
      return setting;
    }
    const b = browserLang != null ? browserLang : (globalThis.navigator && navigator.language) || "";
    return /^zh/i.test(b) ? "zh" : "en";
  };

  XH.setLang = function (code) {
    XH.lang = code;
    return code;
  };

  // At load, set language from the browser (Auto) so nothing renders untranslated before settings arrive.
  XH.setLang(XH.resolveLang("auto"));

  XH.t = function (key, vars) {
    const cur = (XH.locales && XH.locales[XH.lang]) || {};
    const en = (XH.locales && XH.locales.en) || {};
    let s = (cur && cur[key] != null) ? cur[key] : ((en && en[key] != null) ? en[key] : key);
    if (vars) for (const k in vars) s = s.replaceAll("{" + k + "}", String(vars[k]));
    return s;
  };

  // Compact counts: 1.2K / 15K / 1.2M, or 3400 / 1.5万 / 120万 in Chinese.
  XH.compact = function (n) {
    const r = (x) => (x < 10 ? Math.round(x * 10) / 10 : Math.round(x));
    if (XH.lang === "zh") {
      if (n >= 1e8) return r(n / 1e8) + "亿";
      if (n >= 1e4) return r(n / 1e4) + "万";
      return String(Math.round(n));
    }
    if (n >= 1e6) return r(n / 1e6) + "M";
    if (n >= 1e3) return r(n / 1e3) + "K";
    return String(Math.round(n));
  };

  // Follower counts in K/M in every language, so the chip stays short: 950 / 3.2K / 46K / 1.2M.
  XH.kNum = function (n) {
    const r = (x) => (x < 10 ? Math.round(x * 10) / 10 : Math.round(x));
    if (n >= 1e6) return r(n / 1e6) + "M";
    if (n >= 1e3) return r(n / 1e3) + "K";
    return String(Math.round(n));
  };

  // Reply-signal chip: "💬 23 · 46K · 12×". The size ratio only shows when the author is at least
  // twice as big as the user, the range reply guides aim for; a smaller author adds nothing.
  XH.replyChip = function (replies, authorFollowers, myFollowers) {
    const parts = ["💬 " + XH.compact(replies)];
    if (typeof authorFollowers === "number") {
      parts.push(XH.kNum(authorFollowers));
      const ratio = myFollowers > 0 ? authorFollowers / myFollowers : 0;
      if (ratio >= 2) parts.push(Math.round(ratio) + "×");
    }
    return parts.join(" · ");
  };

  // "3 h ago" style, for timestamps in ms.
  XH.ago = function (ts, now = Date.now()) {
    const m = Math.floor((now - ts) / 60000);
    if (m < 1) return XH.t("just_now");
    if (m < 60) return XH.t("mins_ago", { n: m });
    const h = Math.floor(m / 60);
    if (h < 24) return XH.t("hours_ago", { n: h });
    return XH.t("days_ago", { n: Math.floor(h / 24) });
  };
})();
