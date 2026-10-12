const test = require("node:test");
const assert = require("node:assert");
const sim = require("../src/lib/similarity.js");

test("normalize drops urls, mentions, punctuation and emoji", () => {
  assert.strictEqual(sim.normalize("@bob 加油！👍 https://t.co/x"), "加油");
});

test("identical text after normalizing scores 1", () => {
  assert.strictEqual(sim.similarity("加油加油！", "加油加油"), 1);
});

test("near-duplicate Chinese replies score high, unrelated ones low", () => {
  const a = "这个思路很赞，我也在用n8n做类似的自动化";
  const b = "这个思路很赞， 我也在用n8n做差不多的自动化";
  const c = "今天天气不错，出去走走";
  assert.ok(sim.similarity(a, b) > 0.6);
  assert.ok(sim.similarity(a, c) < 0.2);
});

test("findSimilar returns the best match above threshold", () => {
  const sent = [
    { text: "完全同意，细节决定成败", t: 1 },
    { text: "这个思路很赞，我也在用n8n做类似的自动化", t: 2 },
  ];
  const r = sim.findSimilar("这个思路很赞，我也在用n8n做差不多的自动化", sent, 0.6);
  assert.strictEqual(r.item.t, 2);
  assert.strictEqual(sim.findSimilar("完全不相关的一句话", sent, 0.6), null);
});

test("countExact counts repeated short replies", () => {
  const sent = [{ text: "加油" }, { text: "加油！" }, { text: "来来来" }];
  assert.strictEqual(sim.countExact("加油 💪", sent), 2);
});
