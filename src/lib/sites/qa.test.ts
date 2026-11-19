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

test("validateSite blocks unsafe links, CSS and oversized sites", async () => {
  const { validateSite } = await import("./validate");
  const ok = structuredClone(SITES[0]!);
  assert.equal(validateSite(ok).ok, true);
  for (const s of SITES) assert.equal(validateSite(s).ok, true, s.slug);
  const js = structuredClone(ok); (js.pages[0]!.sections[0] as { ctas: { href: string }[] }).ctas[0]!.href = "javascript:alert(1)";
  assert.equal(validateSite(js).ok, false);
  const proto = structuredClone(ok); (proto.pages[0]!.sections[0] as { ctas: { href: string }[] }).ctas[0]!.href = "//evil.example";
  assert.equal(validateSite(proto).ok, false);
  const css = structuredClone(ok); css.palette.accent = "red;background:url(x)";
  assert.equal(validateSite(css).ok, false);
  const big = structuredClone(ok); big.pages[0]!.title = "x".repeat(950_000);
  assert.equal(validateSite(big).ok, false);
  const dup = structuredClone(ok); dup.pages.push(structuredClone(dup.pages[0]!));
  assert.equal(validateSite(dup).ok, false);
});

test("text fields: every editable string, set by path", async () => {
  const { textFields, setAt } = await import("./text");
  const hero = SITES[0]!.pages[0]!.sections[0]!;
  const f = textFields(hero);
  assert.ok(f.some((x) => x.label === "Title"));
  assert.ok(f.some((x) => x.link));
  assert.ok(!f.some((x) => x.path.includes("art") || x.path.at(-1) === "t"));
  const t = f.find((x) => x.label === "Title")!;
  const next = setAt(hero, t.path, "New title");
  assert.equal((next as { title: string }).title, "New title");
  assert.notEqual((hero as { title: string }).title, "New title", "immutable");
  const card = SITES[0]!.pages[0]!.sections.find((s) => s.t === "cards")!;
  const ff = textFields(card);
  assert.ok(ff.some((x) => x.label.startsWith("1 · Title")), ff.map((x) => x.label).join("|"));
});
