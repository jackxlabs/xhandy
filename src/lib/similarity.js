// Local text similarity for the duplicate-reply warning.
// Character bigrams + Jaccard: works for Chinese and English without tokenizers or network calls.
(function () {
  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, "")
      .replace(/@\w+/g, "")
      .replace(/[^\p{L}\p{N}]/gu, "");
  }

  function bigrams(s) {
    const set = new Set();
    if (s.length < 2) {
      if (s) set.add(s);
      return set;
    }
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  }

  function similarity(a, b) {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    const A = bigrams(na);
    const B = bigrams(nb);
    let inter = 0;
    for (const x of A) if (B.has(x)) inter++;
    return inter / (A.size + B.size - inter);
  }

  // Best match among previously sent items ({text, t, to}) at or above threshold, or null.
  function findSimilar(text, sent, threshold) {
    let best = null;
    for (const item of sent) {
      const score = similarity(text, item.text);
      if (score >= threshold && (!best || score > best.score)) best = { score, item };
    }
    return best;
  }

  // How many times this exact short text (after normalizing) was sent.
  function countExact(text, sent) {
    const n = normalize(text);
    if (!n) return 0;
    return sent.filter((s) => normalize(s.text) === n).length;
  }

  const api = { normalize, similarity, findSimilar, countExact };
  const XH = (globalThis.XH = globalThis.XH || {});
  XH.sim = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
