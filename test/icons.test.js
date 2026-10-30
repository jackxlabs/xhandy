const test = require("node:test");
const assert = require("node:assert");

function setupDomStub() {
  class ElementStub {
    constructor(ns, tagName) {
      this.namespaceURI = ns;
      this.tagName = tagName;
      this.attributes = {};
      this.children = [];
    }
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
    getAttribute(name) {
      return this.attributes[name];
    }
    appendChild(child) {
      this.children.push(child);
      return child;
    }
  }

  globalThis.document = {
    createElementNS(ns, tagName) {
      return new ElementStub(ns, tagName);
    },
  };
}

setupDomStub();
const { icon } = require("../src/lib/icons.js");

const NAMES = ["star", "flame", "note", "warn", "gear", "close", "search", "lock", "chevron"];

test("each icon name returns an svg element with at least one path and stroke=currentColor", () => {
  for (const name of NAMES) {
    const el = icon(name);
    assert.ok(el, `icon "${name}" returned an element`);
    assert.strictEqual(el.tagName, "svg", `icon "${name}" is an svg`);
    assert.strictEqual(el.getAttribute("aria-hidden"), "true");
    assert.strictEqual(el.getAttribute("stroke"), "currentColor");
    assert.strictEqual(el.getAttribute("width"), "16");
    assert.strictEqual(el.getAttribute("height"), "16");
    assert.ok(el.children.length >= 1, `icon "${name}" has at least one child element`);
    for (const child of el.children) {
      assert.strictEqual(child.tagName, "path");
      assert.ok(child.getAttribute("d") && child.getAttribute("d").length > 0);
    }
  }
});

test("custom size is set on svg element", () => {
  const el = icon("star", 24);
  assert.strictEqual(el.getAttribute("width"), "24");
  assert.strictEqual(el.getAttribute("height"), "24");
});

test("unknown icon name returns null", () => {
  assert.strictEqual(icon("nonexistent"), null);
});
