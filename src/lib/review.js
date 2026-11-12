// Review computation: pure functions for reply performance and follower growth. No side effects.
(function () {
  function median(numbers) {
    if (!Array.isArray(numbers)) return null;
    const valid = numbers.filter((x) => typeof x === "number" && Number.isFinite(x));
    if (!valid.length) return null;
    valid.sort((a, b) => a - b);
    const mid = Math.floor(valid.length / 2);
    if (valid.length % 2 === 1) return valid[mid];
    return (valid[mid - 1] + valid[mid]) / 2;
  }

  const ONE_HOUR = 3600 * 1000;
  const SIX_HOURS = 6 * ONE_HOUR;
  const TWENTY_FOUR_HOURS = 24 * ONE_HOUR;
  const NINETY_DAYS = 90 * 86400 * 1000;
  const THIRTY_DAYS = 30 * 86400 * 1000;
  const SEVEN_DAYS = 7 * 86400 * 1000;

  function applyBest(list) {
    const withMedian = list.filter((g) => g.median !== null);
    if (withMedian.length >= 2) {
      const medians = withMedian.map((g) => g.median);
      const max = Math.max(...medians);
      const min = Math.min(...medians);
      if (max >= 1.5 * min) {
        for (const g of list) {
          if (g.median === max) g.best = true;
        }
      }
    }
  }

  function groups(mine, settings, now = Date.now()) {
    const delayBuckets = {
      under_1h: [],
      "1_to_6h": [],
      "6_to_24h": [],
      over_24h: [],
    };
    const sizeBuckets = {
      under_2x: [],
      "2_to_10x": [],
      over_10x: [],
    };
    const heatBuckets = {
      below_warm: [],
      warm: [],
      hot: [],
    };

    const warmThreshold = (settings && typeof settings.heatWarm === "number" && settings.heatWarm >= 0) ? settings.heatWarm : 1000;
    const hotThreshold = (settings && typeof settings.heatHot === "number" && settings.heatHot >= 0) ? settings.heatHot : 10000;

    const nNow = typeof now === "number" && Number.isFinite(now) ? now : (now instanceof Date ? now.getTime() : Date.now());

    for (const r of Object.values(mine || {})) {
      if (!r || r.k !== "r") continue;
      if (typeof r.v !== "number" || !Number.isFinite(r.v) || r.v < 0) continue;
      if (typeof r.t !== "number" || !Number.isFinite(r.t)) continue;
      const age = nNow - r.t;
      if (age < TWENTY_FOUR_HOURS || age > NINETY_DAYS) continue;

      // 1. Delay dimension: t - pt
      if (typeof r.pt === "number" && Number.isFinite(r.pt)) {
        const delay = r.t - r.pt;
        if (delay >= 0) {
          if (delay < ONE_HOUR) delayBuckets.under_1h.push(r.v);
          else if (delay < SIX_HOURS) delayBuckets["1_to_6h"].push(r.v);
          else if (delay < TWENTY_FOUR_HOURS) delayBuckets["6_to_24h"].push(r.v);
          else delayBuckets.over_24h.push(r.v);
        }
      }

      // 2. Size dimension: pf / mf
      if (typeof r.pf === "number" && Number.isFinite(r.pf) && r.pf >= 0 &&
          typeof r.mf === "number" && Number.isFinite(r.mf) && r.mf > 0) {
        const ratio = r.pf / r.mf;
        if (ratio < 2) sizeBuckets.under_2x.push(r.v);
        else if (ratio <= 10) sizeBuckets["2_to_10x"].push(r.v);
        else sizeBuckets.over_10x.push(r.v);
      }

      // 3. Heat dimension: against ph
      if (typeof r.ph === "number" && Number.isFinite(r.ph) && r.ph >= 0) {
        if (r.ph < warmThreshold) heatBuckets.below_warm.push(r.v);
        else if (r.ph < hotThreshold) heatBuckets.warm.push(r.v);
        else heatBuckets.hot.push(r.v);
      }
    }

    function buildDimension(buckets, ids) {
      const res = ids.map((id) => {
        const views = buckets[id] || [];
        const n = views.length;
        const med = n >= 5 ? median(views) : null;
        return { id, n, median: med, best: false };
      });
      applyBest(res);
      return res;
    }

    return {
      delay: buildDimension(delayBuckets, ["under_1h", "1_to_6h", "6_to_24h", "over_24h"]),
      size: buildDimension(sizeBuckets, ["under_2x", "2_to_10x", "over_10x"]),
      heat: buildDimension(heatBuckets, ["below_warm", "warm", "hot"]),
    };
  }

  function topReplies(mine, now = Date.now(), limit = 10) {
    const nNow = typeof now === "number" && Number.isFinite(now) ? now : (now instanceof Date ? now.getTime() : Date.now());
    const out = [];
    for (const [id, r] of Object.entries(mine || {})) {
      if (!r || r.k !== "r") continue;
      if (typeof r.v !== "number" || !Number.isFinite(r.v) || r.v < 0) continue;
      if (typeof r.t !== "number" || !Number.isFinite(r.t)) continue;
      const age = nNow - r.t;
      if (age < 0 || age > THIRTY_DAYS) continue;
      out.push({ id, ...r });
    }

    out.sort((a, b) => {
      if (b.v !== a.v) return b.v - a.v;
      const bLikes = typeof b.l === "number" && Number.isFinite(b.l) ? b.l : 0;
      const aLikes = typeof a.l === "number" && Number.isFinite(a.l) ? a.l : 0;
      if (bLikes !== aLikes) return bLikes - aLikes;
      return (b.t || 0) - (a.t || 0);
    });

    return out.slice(0, Math.max(0, limit));
  }

  function week(mine, now = Date.now()) {
    const nNow = typeof now === "number" && Number.isFinite(now) ? now : (now instanceof Date ? now.getTime() : Date.now());
    let n = 0;
    const views = [];
    for (const r of Object.values(mine || {})) {
      if (!r || r.k !== "r") continue;
      if (typeof r.t !== "number" || !Number.isFinite(r.t)) continue;
      const age = nNow - r.t;
      if (age < 0 || age > SEVEN_DAYS) continue;
      n++;
      if (typeof r.v === "number" && Number.isFinite(r.v) && r.v >= 0) {
        views.push(r.v);
      }
    }
    return { n, median: median(views) };
  }

  function formatDay(d) {
    const p = (num) => String(num).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function growth(days, now = Date.now()) {
    const baseDate = now instanceof Date ? new Date(now.getTime()) : (typeof now === "number" && Number.isFinite(now) ? new Date(now) : new Date());
    const series = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - i);
      const key = formatDay(d);
      const dayData = (days && days[key]) || {};
      const followers = (typeof dayData.followers === "number" && Number.isInteger(dayData.followers) && dayData.followers >= 0)
        ? dayData.followers
        : null;
      const replies = (typeof dayData.replies === "number" && Number.isInteger(dayData.replies) && dayData.replies >= 0)
        ? dayData.replies
        : 0;
      series.push({ day: key, followers, replies });
    }

    function calcChange(periodEntries) {
      const snapshots = periodEntries.filter((e) => e.followers !== null);
      if (snapshots.length < 2) return null;
      const earliest = snapshots[0].followers;
      const latest = snapshots[snapshots.length - 1].followers;
      return latest - earliest;
    }

    const d7 = calcChange(series.slice(-8));
    const d30 = calcChange(series);

    return { d7, d30, series };
  }

  const api = { median, groups, topReplies, week, growth };
  const XH = (globalThis.XH = globalThis.XH || {});
  XH.review = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
