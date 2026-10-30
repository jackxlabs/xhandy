// Inline SVG stroke icons, drawn for Xhandy (not copied from an icon set). No network calls, no innerHTML.
(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  const PATHS = {
    star: ["M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"],
    flame: [
      "M12 2.5c-.5 2.5-2 4.5-4 6.5C6 11 5 13 5 15.5A7 7 0 0 0 19 15.5c0-3.5-2.5-6.5-4.5-8.5-.5 1-1.5 1.5-2.5 1.5s-1-1 0-2c-1-.5-1.5-1.5-1.5-2.5z",
      "M12 18a3 3 0 0 1-3-3c0-2 1.5-3 3-4.5 1.5 1.5 3 2.5 3 4.5a3 3 0 0 1-3 3z",
    ],
    note: [
      "M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z",
      "M7 7h10",
      "M7 12h10",
      "M7 17h6",
    ],
    warn: [
      "M12 3.5L2.5 20a1 1 0 0 0 .86 1.5h17.28a1 1 0 0 0 .86-1.5L12 3.5z",
      "M12 9v5",
      "M12 18h.01",
    ],
    gear: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"],
    close: [
      "M18 6L6 18",
      "M6 6l12 12",
    ],
    search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M20 20l-3.5-3.5"],
    lock: ["M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z", "M8 11V7a4 4 0 0 1 8 0v4"],
    chevron: ["M9 6l6 6-6 6"],
  };

  function icon(name, size) {
    const list = PATHS[name];
    if (!list) return null;
    const svg = document.createElementNS(SVG_NS, "svg");
    const s = size != null ? String(size) : "16";
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", s);
    svg.setAttribute("height", s);
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "xh-icon xh-icon-" + name);
    for (const d of list) {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", d);
      svg.appendChild(p);
    }
    return svg;
  }

  const XH = (globalThis.XH = globalThis.XH || {});
  XH.icon = icon;
  if (typeof module !== "undefined" && module.exports) module.exports = { icon };
})();
