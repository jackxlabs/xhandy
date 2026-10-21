const test = require("node:test");
const assert = require("node:assert");

function loadI18n(lang) {
  // Node has its own read-only navigator, so a plain assignment would be ignored.
  Object.defineProperty(globalThis, "navigator", { value: { language: lang }, configurable: true });
  globalThis.XH = {};

  const enPath = require.resolve("../src/locales/en.js");
  const zhPath = require.resolve("../src/locales/zh.js");
  const i18nPath = require.resolve("../src/lib/i18n.js");

  delete require.cache[enPath];
  delete require.cache[zhPath];
  delete require.cache[i18nPath];

  require(enPath);
  require(zhPath);
  require(i18nPath);

  return globalThis.XH;
}

test("reply chip: short follower counts, ratio only when the author is at least 2x bigger", () => {
  for (const lang of ["en-US", "zh-CN"]) {
    const XH = loadI18n(lang);
    assert.strictEqual(XH.replyChip(23, 46000, 3800), "💬 23 · 46K · 12×", lang + " all data");
    assert.strictEqual(XH.replyChip(6, 3200, 4600), "💬 6 · 3.2K", lang + " smaller author: no ratio");
    assert.strictEqual(XH.replyChip(6, 9000, 4600), "💬 6 · 9K", lang + " under 2x: no ratio");
    assert.strictEqual(XH.replyChip(6, 9200, 4600), "💬 6 · 9.2K · 2×", lang + " exactly 2x");
    assert.strictEqual(XH.replyChip(23, 46000, 0), "💬 23 · 46K", lang + " own count unknown");
    assert.strictEqual(XH.replyChip(23, undefined, 3800), "💬 23", lang + " author count unknown");
    assert.strictEqual(XH.replyChip(0, 950, 100), "💬 0 · 950 · 10×", lang + " small numbers");
    assert.strictEqual(XH.replyChip(5, 1_200_000, 4600), "💬 5 · 1.2M · 261×", lang + " millions");
  }
  assert.strictEqual(loadI18n("en-US").t("replied"), "✓ replied");
  assert.strictEqual(loadI18n("zh-CN").t("replied"), "✓ 已回复");
  assert.strictEqual(loadI18n("en-US").t("interacted_both", { a: 3, b: 5, ago: "today" }), "you 3 · them 5 · today");
  assert.strictEqual(loadI18n("zh-CN").t("interacted_both", { a: 3, b: 5, ago: "今天" }), "我3 · 他5 · 今天");
  for (const [lang, hour, mins] of [["en-US", "an hour", "30 minutes"], ["zh-CN", "1 小时内", "30 分钟内"]]) {
    const { t } = loadI18n(lang);
    assert.strictEqual(t("pace_hour"), hour);
    assert.strictEqual(t("pace_minutes", { n: 30 }), mins);
  }
  assert.strictEqual(loadI18n("en-US").t("follow_pace", { n: 10, m: "an hour" }), "Over 10 follows in an hour. Following fast can get the account limited.");
  assert.strictEqual(loadI18n("zh-CN").t("follow_pace", { n: 10, m: "1 小时内" }), "1 小时内已关注超过 10 个，关注太快可能被限流");
  assert.strictEqual(loadI18n("zh-CN").t("unfollow_pace", { n: 10, m: "15 分钟内" }), "15 分钟内已取关超过 10 个，取关太快可能被限流");
});

test("resolveLang handles auto (zh-TW, de-DE), unknown codes, and explicit en/zh", () => {
  const XH = loadI18n("en-US");

  // Auto with zh-TW -> zh
  assert.strictEqual(XH.resolveLang("auto", "zh-TW"), "zh");
  // Auto with de-DE -> en
  assert.strictEqual(XH.resolveLang("auto", "de-DE"), "en");

  // Unknown codes fall back to browser language (treated as auto)
  assert.strictEqual(XH.resolveLang("unknown-code", "zh-TW"), "zh");
  assert.strictEqual(XH.resolveLang("unknown-code", "de-DE"), "en");
  assert.strictEqual(XH.resolveLang(null, "zh-CN"), "zh");
  assert.strictEqual(XH.resolveLang(undefined, "fr-FR"), "en");

  // Explicit en/zh
  assert.strictEqual(XH.resolveLang("en", "zh-TW"), "en");
  assert.strictEqual(XH.resolveLang("en", "de-DE"), "en");
  assert.strictEqual(XH.resolveLang("zh", "zh-TW"), "zh");
  assert.strictEqual(XH.resolveLang("zh", "de-DE"), "zh");

  // Default browserLang fallback from global navigator
  assert.strictEqual(XH.resolveLang("auto"), "en");
  const XHZh = loadI18n("zh-CN");
  assert.strictEqual(XHZh.resolveLang("auto"), "zh");
});

test("setLang switching changes t(), compact(), and ago() output", () => {
  const XH = loadI18n("en-US");

  XH.setLang("en");
  assert.strictEqual(XH.lang, "en");
  assert.strictEqual(XH.t("hud_likes"), "likes");
  assert.strictEqual(XH.compact(15000), "15K");
  assert.strictEqual(XH.compact(1200000), "1.2M");

  const oneHourAgo = Date.now() - 3600000;
  assert.strictEqual(XH.ago(oneHourAgo), "1 h ago");

  XH.setLang("zh");
  assert.strictEqual(XH.lang, "zh");
  assert.strictEqual(XH.t("hud_likes"), "赞");
  assert.strictEqual(XH.compact(15000), "1.5万");
  assert.strictEqual(XH.compact(1200000), "120万");
  assert.strictEqual(XH.ago(oneHourAgo), "1小时前");

  // Switching back to en
  XH.setLang("en");
  assert.strictEqual(XH.lang, "en");
  assert.strictEqual(XH.t("hud_likes"), "likes");
  assert.strictEqual(XH.compact(15000), "15K");
});

test("English fallback for a missing key", () => {
  const XH = loadI18n("en-US");

  // Add temporary test key to English only
  XH.locales.en.__test_key_missing_in_zh__ = "fallback to english";
  XH.setLang("zh");

  // When key is missing in zh, it returns the English translation
  assert.strictEqual(XH.t("__test_key_missing_in_zh__"), "fallback to english");

  // With variable interpolation in fallback
  XH.locales.en.__test_key_vars__ = "fallback {val}";
  assert.strictEqual(XH.t("__test_key_vars__", { val: "123" }), "fallback 123");

  // When key is missing in both, it returns the key itself
  assert.strictEqual(XH.t("__completely_missing_key__"), "__completely_missing_key__");

  delete XH.locales.en.__test_key_missing_in_zh__;
  delete XH.locales.en.__test_key_vars__;
});

test("completeness check: all supported languages have the same keys and placeholders as English", () => {
  const XH = loadI18n("en-US");

  assert.ok(Array.isArray(XH.LANGS), "XH.LANGS is an array");
  assert.ok(XH.LANGS.some((l) => l.code === "en"), "English is in XH.LANGS");
  assert.ok(XH.locales.en, "en locale loaded");

  const enKeys = Object.keys(XH.locales.en).sort();
  assert.ok(enKeys.length > 0, "English dictionary is not empty");

  const extractPlaceholders = (str) => {
    const matches = str.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
    return matches.map((m) => m.slice(1, -1)).sort();
  };

  for (const lang of XH.LANGS) {
    if (lang.code === "en") continue;

    const loc = XH.locales[lang.code];
    assert.ok(loc, `locale dictionary for ${lang.code} (${lang.name}) exists`);

    const langKeys = Object.keys(loc).sort();
    assert.deepStrictEqual(
      langKeys,
      enKeys,
      `Key mismatch in locale "${lang.code}": keys must match English exactly`
    );

    for (const key of enKeys) {
      const enPlaceholders = extractPlaceholders(XH.locales.en[key]);
      const langPlaceholders = extractPlaceholders(loc[key]);
      assert.deepStrictEqual(
        langPlaceholders,
        enPlaceholders,
        `Placeholder mismatch for key "${key}" in locale "${lang.code}"`
      );
    }
  }
});
