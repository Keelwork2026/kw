import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSource, selectorFor, buildSelection, inspectorActive } from "../lib/inspector.ts";

type FakeEl = { tagName: string; id: string; classList: string[]; parentElement: FakeEl | null; textContent: string; children: FakeEl[]; getAttribute(n: string): string | null };

function el(tagName: string, attrs: Record<string, string> = {}, parent: FakeEl | null = null, text = ""): FakeEl {
  const node: FakeEl = { tagName: tagName.toUpperCase(), id: attrs.id ?? "", classList: (attrs.class ?? "").split(" ").filter(Boolean), parentElement: parent, textContent: text, children: [], getAttribute: (n: string) => attrs[n] ?? null };
  if (parent) parent.children.push(node);
  return node;
}

test("parseSource accepts file:line and refuses traversal", () => {
  assert.deepEqual(parseSource("app/page.tsx:12"), { file: "app/page.tsx", line: 12 });
  assert.equal(parseSource("../etc/passwd.ts:1"), null);
  assert.equal(parseSource("/abs/page.tsx:1"), null);
  assert.equal(parseSource("page.tsx"), null);
});

test("buildSelection finds the nearest data-kw-source and a selector", () => {
  const body = el("body");
  const main = el("main", { "data-kw-source": "app/page.tsx:3", class: "hero wide extra" }, body);
  el("p", {}, main, "first");
  const h = el("p", {}, main, "  Hello   world ");
  const s = buildSelection(h);
  assert.equal(s.tag, "p");
  assert.equal(s.text, "Hello world");
  assert.deepEqual(s.source, { file: "app/page.tsx", line: 3 });
  assert.equal(s.selector, "body > main.hero.wide > p:nth-of-type(2)");
  assert.equal(selectorFor(el("div", { id: "cta" }, body)), "div#cta");
});

test("the inspector is active only in the preview frame with ?kw-inspect=1", () => {
  assert.equal(inspectorActive("?kw-inspect=1", true, "https://app.keelwork.dev"), true);
  assert.equal(inspectorActive("?kw-inspect=1", false, "https://app.keelwork.dev"), false);
  assert.equal(inspectorActive("", true, "https://app.keelwork.dev"), false);
  assert.equal(inspectorActive("?kw-inspect=1", true, undefined), false);
});
