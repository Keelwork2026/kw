import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG, CATALOG_CATEGORIES, recentlyAdded, related, templateUseHref } from "./index";
import { parseQuery, searchCatalog } from "./search";
import { APP_TEMPLATES, appBrief } from "@/lib/apps";
import type { Module } from "@/lib/apps/types";

const top = (q: string, n = 3) => searchCatalog(CATALOG, q).slice(0, n).map((e) => e.slug);

test("catalog: every category has templates and slugs are unique", () => {
  for (const c of CATALOG_CATEGORIES) assert.ok(CATALOG.some((e) => e.category === c), `no templates in ${c}`);
  assert.equal(new Set(CATALOG.map((e) => e.slug)).size, CATALOG.length);
  assert.ok(CATALOG.length >= 40, `only ${CATALOG.length} templates`);
});

test("search: understands how people describe projects", () => {
  assert.ok(top("I need a website for my restaurant").includes("harbour-kitchen"), top("I need a website for my restaurant").join());
  assert.equal(top("I need a website for my restaurant")[0], "harbour-kitchen");
  assert.equal(top("Build a dashboard for my sales team")[0], "app-sales-dashboard");
  assert.ok(top("construction company").includes("ironline-construction"));
  assert.ok(top("construction company").includes("app-construction-sites"));
  assert.ok(top("online shop for clothing").includes("app-online-store"), top("online shop for clothing").join());
  assert.ok(top("platform for students").includes("app-learning-platform"), top("platform for students").join());
  assert.ok(top("patient booking portal").includes("app-patient-portal"));
  assert.ok(top("crm for my team").includes("app-crm-northwind"));
  assert.equal(searchCatalog(CATALOG, "").length, CATALOG.length);
  assert.equal(searchCatalog(CATALOG, "zzqx flibbertigibbet").length, 0);
});

test("search: type words steer, filler words are ignored", () => {
  assert.deepEqual(parseQuery("I want to build a website for my bakery").types, ["Website", "Landing page"]);
  assert.deepEqual(parseQuery("I want to build a website for my bakery").terms, ["bakery"]);
  assert.ok(parseQuery("Build a dashboard").types.includes("Dashboard"));
});

test("apps: every template is complete and its brief is usable", () => {
  for (const a of APP_TEMPLATES) {
    assert.ok(a.screens.length >= 2, `${a.slug} screens`);
    assert.equal(new Set(a.screens.map((s) => s.slug)).size, a.screens.length, `${a.slug} duplicate screen slug`);
    const flat = (ms: Module[]): Module[] => ms.flatMap((m) => (m.m === "split" ? flat([...m.left, ...m.right]) : [m]));
    for (const m of flat(a.screens.flatMap((s) => s.modules))) {
      if (m.m === "table") {
        for (const r of m.rows) assert.equal(r.length, m.columns.length, `${a.slug} ${m.title} row width`);
        if (m.status !== undefined && m.tones) for (const r of m.rows) assert.ok(r[m.status]! in m.tones, `${a.slug} ${m.title}: tone for ${r[m.status]}`);
      }
      if (m.m === "chart") for (const s of m.series) assert.equal(s.values.length, m.labels.length, `${a.slug} ${m.title} series length`);
      if (m.m === "calendar") for (const e of m.events) { assert.ok(e.day < m.days.length); assert.ok(e.start < e.end, `${a.slug} ${e.title}`); }
      if (m.m === "catalog" && m.filters) for (const i of m.items) assert.ok(!i.tag || m.filters.includes(i.tag), `${a.slug} ${i.title} tag`);
      if (m.m === "progress") for (const i of m.items) assert.ok(i.pct >= 0 && i.pct <= 100);
    }
    const brief = appBrief(a);
    assert.ok(brief.length <= 2000 && brief.includes(a.brand) && /never invent/.test(brief), a.slug);
  }
});

test("catalog: recent, related and use links", () => {
  const recent = recentlyAdded(4);
  assert.equal(recent.length, 4);
  assert.ok(recent.every((e) => e.added));
  const crm = CATALOG.find((e) => e.slug === "app-crm-northwind")!;
  assert.ok(related(crm).length > 0 && related(crm).every((e) => e.slug !== crm.slug));
  const href = templateUseHref(crm, true);
  assert.ok(href.startsWith("/new-project?") && new URLSearchParams(href.split("?")[1]).get("template") === crm.slug);
  assert.ok(templateUseHref(crm, false).startsWith("/sign-up?"));
});

test("catalog: template names say what the template does, not a sample company", async () => {
  const { SITES } = await import("@/lib/sites");
  for (const a of APP_TEMPLATES) assert.ok(!a.name.includes(a.brand.split(" ")[0]!), `${a.slug}: ${a.name}`);
  for (const s of SITES) assert.ok(!s.name.includes(s.logo.word.split(" ")[0]!), `${s.slug}: ${s.name}`);
  for (const a of APP_TEMPLATES) assert.ok(!appBrief(a).includes(a.brand), `${a.slug} brief names the sample brand`);
});
