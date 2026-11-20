import { test } from "node:test";
import assert from "node:assert/strict";
import { MENU } from "@/lib/menu";
import { PROJECT_TABS } from "@/lib/nav";
import { GLOSSARY, SIMPLE_ACTIONS, SIMPLE_GROUPS, SIMPLE_ITEMS, SIMPLE_PAGES, SIMPLE_SUB, SIMPLE_TABS, SIMPLE_TITLES, guideFor, simpleSub, simplifyConfirm, simplifyMessage, type Guide } from "./content";

const JARGON = /\b(deploy\w*|api|migrations?|repositor\w+|backend|webhooks?|environments?|credentials?|production|integrations?|sandbox|schema|endpoints?|rls|qa|ci)\b/i;
const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean);

function checkGuide(where: string, g: Guide) {
  assert.ok(g.title && g.what, where);
  assert.ok(g.steps.length >= 1 && g.steps.length <= 6, `${where}: one to six steps`);
  for (const text of [g.what, g.like ?? "", g.why ?? "", ...g.steps.flatMap((s) => [s.title, s.say])]) {
    for (const s of sentences(text)) assert.ok(s.split(/\s+/).length <= 24, `${where}: shorten "${s}"`);
  }
  for (const t of g.terms ?? []) assert.ok(GLOSSARY[t], `${where}: unknown term ${t}`);
}

test("simple mode covers every menu group, page, submenu and project tab", () => {
  for (const group of MENU) {
    assert.ok(SIMPLE_GROUPS[group.id], `group ${group.id}`);
    for (const item of group.items) {
      const s = SIMPLE_ITEMS[item.slug];
      assert.ok(s, `menu item ${item.slug}`);
      assert.doesNotMatch(s!.label, JARGON, `${item.slug} label`);
      assert.doesNotMatch(s!.hint, JARGON, `${item.slug} hint`);
      checkGuide(item.slug, s!);
      for (const c of item.children ?? []) assert.ok(SIMPLE_SUB[`${item.slug}:${c.label}`] ?? SIMPLE_SUB[c.label], `submenu ${item.slug} › ${c.label}`);
    }
  }
  for (const t of PROJECT_TABS) {
    const s = SIMPLE_TABS[t.slug];
    assert.ok(s, `tab ${t.slug}`);
    assert.doesNotMatch(s.label, JARGON, `tab ${t.slug} label`);
    checkGuide(`tab ${t.slug}`, s);
  }
  for (const p of SIMPLE_PAGES) checkGuide(p.prefix, p.guide);
  assert.equal(simpleSub("billing", "Plan"), "Your plan");
  assert.equal(simpleSub("builder", "Plan"), "Check the plan");
});

test("simple labels avoid jargon", () => {
  for (const [k, v] of Object.entries(SIMPLE_SUB)) assert.doesNotMatch(v, JARGON, k);
  for (const [k, v] of Object.entries(SIMPLE_ACTIONS)) assert.doesNotMatch(v, JARGON, k);
  for (const [k, v] of Object.entries(SIMPLE_TITLES)) assert.doesNotMatch(v.title, JARGON, k);
  for (const [k, g] of Object.entries(GLOSSARY)) assert.ok(g.means.length < 120 && g.like.length < 120, k);
});

test("errors say what happened and what to do next", () => {
  assert.match(simplifyMessage("Authentication token validation failed due to an invalid credential response."), /couldn't connect your account.*try connecting again/i);
  assert.match(simplifyMessage("Deployment failed because the build process exited with a non-zero status."), /couldn't go online yet.*Try again/i);
  assert.match(simplifyMessage("Invalid input parameter."), /doesn't look right yet.*try again/i);
  assert.match(simplifyMessage("Only owners and admins can change secrets."), /aren't allowed/);
  assert.match(simplifyMessage("Open critical security findings block deployments. Fix them on the Security tab first."), /safety problem/);
  // Messages that are already plain stay as they are.
  assert.equal(simplifyMessage("Saved."), "Saved.");
  assert.match(simplifyConfirm("Delete this secret?"), /can't be undone/);
});

test("the guide fits the page you're on", () => {
  assert.equal(guideFor("/").key, "page:/");
  assert.equal(guideFor("/integrations").key, "integrations");
  assert.equal(guideFor("/sites/new").key, "page:/sites/new");
  assert.equal(guideFor("/sites").key, "sites");
  assert.equal(guideFor("/starters/harbour-kitchen").key, "page:/starters");
  assert.equal(guideFor("/projects/123e4567-e89b-42d3-a456-426614174000/secrets").key, "tab:secrets");
  assert.equal(guideFor("/projects/123e4567-e89b-42d3-a456-426614174000").key, "tab:");
  assert.equal(guideFor("/projects").key, "projects");
  assert.match(guideFor("/some-future-page").key, /^generic:/, "new sections get a general guide");
});
