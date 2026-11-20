import { test } from "node:test";
import assert from "node:assert/strict";
import { SECTIONS, PROJECT_TABS, isUuid, sectionBySlug } from "./nav";

test("the app shell has the 21 primary sections, uniquely named", () => {
  assert.equal(SECTIONS.length, 21);
  assert.equal(new Set(SECTIONS.map((s) => s.slug)).size, 21);
  assert.equal(sectionBySlug("billing")?.phase, 10);
  assert.ok(SECTIONS.every((s) => s.live), "all sections are live in the finished build");
});

test("project tabs are in the specified order", () => {
  assert.deepEqual(PROJECT_TABS.map((t) => t.label), ["Build", "Code", "Database", "Backend", "QA", "Tests", "Incidents", "Security", "Deploy", "Analytics", "Automations", "Integrations", "Secrets"]);
});

test("isUuid validates project ids", () => {
  assert.ok(isUuid("3f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f"));
  assert.ok(!isUuid("3f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5"));
  assert.ok(!isUuid("'; drop table projects; --"));
  assert.ok(!isUuid(undefined));
});
