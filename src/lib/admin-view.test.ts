import { test } from "node:test";
import assert from "node:assert/strict";
import { filterOrgs, grantView, timeLeft, type AdminOrg } from "./admin-view";

const orgs: AdminOrg[] = [
  { id: "a1", name: "Acme", plan_key: "pro", member_count: 3, project_count: 9, created_at: "2026-11-01T00:00:00Z" },
  { id: "b2", name: "Bistro", plan_key: "free", member_count: 8, project_count: 1, created_at: "2026-11-10T00:00:00Z" },
  { id: "c3", name: "acme labs", plan_key: "free", member_count: 1, project_count: 2, created_at: "2026-10-01T00:00:00Z" },
];

test("admin: search, plan filter and sorting", () => {
  assert.deepEqual(filterOrgs(orgs, { q: "ACME" }).map((o) => o.id), ["a1", "c3"]);
  assert.deepEqual(filterOrgs(orgs, { plan: "free" }).map((o) => o.id), ["b2", "c3"]);
  assert.deepEqual(filterOrgs(orgs, { sort: "projects" }).map((o) => o.id), ["a1", "c3", "b2"]);
  assert.deepEqual(filterOrgs(orgs, { sort: "bogus" }).map((o) => o.id), ["b2", "a1", "c3"], "unknown sort falls back to newest");
  assert.deepEqual(filterOrgs(orgs, { q: "b2" }).map((o) => o.id), ["b2"], "an id prefix finds the org");
});

test("admin: grant state and time left", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  assert.equal(grantView({ status: "pending", expires_at: null }, now), "waiting");
  assert.equal(grantView({ status: "approved", expires_at: "2026-11-20T14:30:00Z" }, now), "active");
  assert.equal(grantView({ status: "approved", expires_at: "2026-11-20T11:00:00Z" }, now), "ended", "expired approvals have ended");
  assert.equal(grantView({ status: "revoked", expires_at: null }, now), "ended");
  assert.equal(timeLeft("2026-11-20T14:30:00Z", now), "2 h 30 min left");
  assert.equal(timeLeft("2026-11-20T12:20:00Z", now), "20 min left");
  assert.equal(timeLeft("2026-11-20T11:00:00Z", now), null);
});
