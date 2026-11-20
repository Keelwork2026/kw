import { test } from "node:test";
import assert from "node:assert/strict";
import { buildActivity, unreadCount, type ActivityRaw } from "./activity";

const P = "11111111-1111-4111-8111-111111111111";
const raw = (o: Partial<ActivityRaw> = {}): ActivityRaw => ({ projects: [{ id: P, name: "Bakery" }], approvals: [], plans: [], incidents: [], runs: [], qa: [], deploys: [], ...o });

test("activity: things waiting on you come first, then newest first", () => {
  const items = buildActivity(raw({
    runs: [{ id: "r1", project_id: P, status: "succeeded", finished_at: "2026-11-20T10:00:00Z", error: null }],
    approvals: [{ id: "a1", project_id: P, summary: "Run a migration", requested_at: "2026-11-19T09:00:00Z" }],
    qa: [{ id: "q1", project_id: P, mode: "quick", finished_at: "2026-11-20T11:00:00Z", readiness: { status: "conditional" } }],
  }));
  assert.deepEqual(items.map((i) => i.id), ["a-a1", "q-q1", "r-r1"]);
  assert.equal(items[0]!.href, `/projects/${P}#approvals`);
  assert.match(items[1]!.detail, /conditional pass/);
  assert.match(items[0]!.title, /^Bakery:/);
});

test("activity: only finished things appear; failures say what to look at", () => {
  const items = buildActivity(raw({
    runs: [{ id: "r1", project_id: P, status: "running", finished_at: null, error: null }, { id: "r2", project_id: P, status: "failed", finished_at: "2026-11-20T10:00:00Z", error: "Typecheck failed" }],
    deploys: [{ id: "d1", project_id: P, environment: "production", status: "building", url: null, created_at: "2026-11-20T10:00:00Z", live_at: null, error: null }, { id: "d2", project_id: P, environment: "preview", status: "live", url: "https://p.example", created_at: "2026-11-20T09:00:00Z", live_at: "2026-11-20T09:05:00Z", error: null }],
  }));
  assert.deepEqual(items.map((i) => i.id), ["r-r2", "d-d2"]);
  assert.equal(items[0]!.tone, "failure");
  assert.equal(items[0]!.detail, "Typecheck failed");
  assert.equal(items[1]!.at, "2026-11-20T09:05:00Z");
});

test("activity: unread is relative to when you last looked", () => {
  const items = buildActivity(raw({ runs: [{ id: "r1", project_id: P, status: "succeeded", finished_at: "2026-11-20T10:00:00Z", error: null }, { id: "r2", project_id: P, status: "succeeded", finished_at: "2026-11-18T10:00:00Z", error: null }] }));
  assert.equal(unreadCount(items, null), 2);
  assert.equal(unreadCount(items, "2026-11-19T00:00:00Z"), 1);
  assert.equal(buildActivity(raw()).length, 0);
});
