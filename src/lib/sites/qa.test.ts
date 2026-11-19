import { test } from "node:test";
import assert from "node:assert/strict";
import { SITES, SITE_CATEGORIES, siteBrief, siteFeatures } from "./index";
import { qaSite } from "./qa";
import { pieces, plain, resolveHref } from "./text";

test("every category has at least one complete template", () => {
  for (const c of SITE_CATEGORIES) assert.ok(SITES.some((s) => s.category === c), `missing ${c}`);
  assert.equal(new Set(SITES.map((s) => s.slug)).size, SITES.length, "unique slugs");
});

for (const site of SITES) {
  test(`QA: ${site.name}`, () => {
    const issues = qaSite(site);
    assert.deepEqual(issues, [], issues.map((i) => `${i.page}: ${i.rule} — ${i.detail}`).join("\n"));
    assert.ok(siteFeatures(site).length >= 2);
    assert.ok(siteBrief(site).length <= 2000);
  });
}

test("QA catches dead links, lorem ipsum and invented claims", () => {
  const bad = structuredClone(SITES[0]!);
  bad.pages[0]!.sections.push({ t: "cta", title: "Lorem ipsum", sub: "Trusted by 50,000 customers", ctas: [{ label: "x", href: "/nowhere" }] });
  bad.pages[0]!.sections.push({ t: "testimonials", title: "Reviews", items: [{ quote: "Great", name: "A", role: "B" }] });
  const rules = qaSite(bad).map((i) => i.detail);
  assert.ok(rules.includes("dead link /nowhere"));
  assert.ok(rules.includes("placeholder Latin text"));
  assert.ok(rules.includes("unsupported customer-count claim"));
  assert.ok(rules.some((r) => r.startsWith("testimonials must be marked")));
});

test("placeholders and links", () => {
  assert.deepEqual(pieces("Call [[phone]] now"), [{ text: "Call " }, { ph: "phone", label: "phone number" }, { text: " now" }]);
  assert.equal(plain("Reg [[reg]]"), "Reg [your company registration number]");
  assert.deepEqual(pieces("[[price:asking price]]"), [{ ph: "price", label: "asking price" }]);
  const s = SITES[0]!;
  assert.equal(resolveHref(s, "/"), `/demo/${s.slug}`);
  assert.equal(resolveHref(s, "/services"), `/demo/${s.slug}/services`);
  assert.equal(resolveHref(s, "#book"), "#book");
});
