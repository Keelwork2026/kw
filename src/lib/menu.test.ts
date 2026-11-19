import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MENU, PROJECT_TAB_HINTS, hrefFor, pickerTarget, itemForPath } from "./menu";
import { SECTIONS, PROJECT_TABS } from "./nav";

const APP = join(process.cwd(), "src/app/(app)");
const MARKETING = join(process.cwd(), "src/app/(marketing)");
const pageFile = (route: string) => { const a = join(APP, route, "page.tsx"); return existsSync(a) ? a : join(MARKETING, route, "page.tsx"); };
const projectTabFile = (tab: string) => join(APP, "projects/[id]", tab, "page.tsx");
const hasAnchor = (file: string, id: string) => {
  const src = readFileSync(file, "utf8");
  return src.includes(`id="${id}"`) || new RegExp(`id=\\{[^}]*"${id}"`).test(src) || src.includes(`id: "${id}"`);
};

test("menu: every page in the app is in the menu, and every menu page exists", () => {
  const inMenu = new Set(MENU.flatMap((g) => g.items.map((i) => i.slug)));
  for (const s of SECTIONS) assert.ok(inMenu.has(s.slug), `${s.slug} is missing from the menu`);
  for (const slug of inMenu) assert.ok(existsSync(pageFile(slug)), `/${slug} has no page`);
});

test("menu: every item has a hint and things you can do; every submenu link is real", () => {
  for (const g of MENU) for (const item of g.items) {
    assert.ok(item.hint.length > 8 && item.can.length >= 1, `${item.slug} needs a hint and what-you-can-do`);
    for (const c of item.children ?? []) {
      assert.ok(c.hint.length > 3, `${item.slug} › ${c.label} needs a hint`);
      if ("path" in c.to) {
        const [pathAndQuery, anchor] = c.to.path.split("#");
        const route = pathAndQuery!.split("?")[0]!.replace(/^\//, "");
        assert.ok(existsSync(pageFile(route)), `${c.to.path}: no page`);
        if (anchor) assert.ok(hasAnchor(pageFile(route), anchor), `${c.to.path}: no #${anchor} on the page`);
      } else {
        const file = c.to.tab ? projectTabFile(c.to.tab) : pageFile("projects/[id]");
        assert.ok(existsSync(file), `${item.slug} › ${c.label}: no project tab ${c.to.tab}`);
        if (c.to.at) assert.ok(hasAnchor(file, c.to.at), `${item.slug} › ${c.label}: no #${c.to.at} on tab "${c.to.tab}"`);
        if (c.to.query) assert.ok(pickerTarget({ to: c.to.tab || "build", q: c.to.query })?.query, `${c.label}: filter not allowed`);
      }
    }
  }
});

test("menu: project tab hints cover every tab and their jump links exist", () => {
  for (const t of PROJECT_TABS) {
    const info = PROJECT_TAB_HINTS[t.slug];
    assert.ok(info?.hint && info.can.length, `tab "${t.slug}" needs a hint`);
    const file = t.slug ? projectTabFile(t.slug) : pageFile("projects/[id]");
    for (const j of info.jump ?? []) if (j.at) assert.ok(hasAnchor(file, j.at), `tab "${t.slug}": no #${j.at}`);
  }
});

test("menu: links resolve inside a project or through the picker, and picker input is validated", () => {
  const pid = "0aa0609a-3374-4b3e-84f9-635548dcff7a";
  assert.equal(hrefFor({ tab: "database", at: "migrations" }, { projectId: pid, pickerSlug: "database" }), `/projects/${pid}/database#migrations`);
  assert.equal(hrefFor({ tab: "", at: "chat" }, { projectId: null, pickerSlug: "builder" }), "/builder?to=build&at=chat");
  assert.equal(hrefFor({ tab: "security", query: "status=accepted" }, { projectId: null, pickerSlug: "security" }), "/security?to=security&q=status%3Daccepted");
  assert.equal(hrefFor({ path: "/billing#packs" }, { projectId: pid, pickerSlug: "billing" }), "/billing#packs");
  assert.deepEqual(pickerTarget({ to: "database", at: "migrations" }), { tab: "database", at: "migrations", query: null });
  assert.equal(pickerTarget({ to: "../admin" }), null, "unknown tabs are refused");
  assert.equal(pickerTarget({ to: "code", at: "x\"onload" })?.at, null, "anchors are plain words only");
  assert.equal(pickerTarget({ to: "security", q: "status=accepted&x=1" })?.query, null, "only known filters pass");
  assert.equal(itemForPath("/settings/audit")?.item.slug, "settings");
  assert.equal(itemForPath("/nowhere"), null);
});

test("menu: every project tab maps to a studio in the menu", async () => {
  const { TAB_TO_MENU } = await import("./menu");
  const slugs = new Set(MENU.flatMap((g) => g.items.map((i) => i.slug)));
  for (const t of PROJECT_TABS) assert.ok(slugs.has(TAB_TO_MENU[t.slug]), `tab "${t.slug}" maps to an unknown menu item`);
});

test("quick search: every word must match", async () => {
  const { matches } = await import("./menu");
  const e = { label: "Billing and Usage › Buy credits", hint: "Top up your balance", group: "Workspace" };
  assert.ok(matches(e, "buy cred"));
  assert.ok(matches(e, "workspace top"));
  assert.ok(!matches(e, "buy deploy"));
});
