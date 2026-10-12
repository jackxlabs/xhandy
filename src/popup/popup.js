(async function () {
  const { store } = globalThis.XH;
  const s = await store.get();
  const rows = document.getElementById("rows");
  const todayKey = store.dayKey();

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = store.dayKey(d);
    const v = { likes: 0, replies: 0, posts: 0, follows: 0, seconds: 0, ...(s.days[k] || {}) };
    const tr = document.createElement("tr");
    if (k === todayKey) tr.className = "today";
    const mins = Math.round(v.seconds / 60);
    for (const cell of [k.slice(5), v.likes, v.replies, v.posts, v.follows, `${mins}m`]) {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    }
    rows.appendChild(tr);
  }

  document.getElementById("opts").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
})();
