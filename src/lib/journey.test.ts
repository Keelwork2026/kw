import { test } from "node:test";
import assert from "node:assert/strict";
import { stages, suggestions, type JourneyState } from "./journey";

const P = "0aa0609a-3374-4b3e-84f9-635548dcff7a";
const base = (o: Partial<JourneyState> = {}): JourneyState => ({
  projectId: P, described: true, plan: "none", run: "none", runFinishedAt: null, sandbox: "none", pendingApprovals: 0, openIncidents: 0,
  qa: { lastRunAt: null, release: null, openBlocking: 0, openOther: 0 }, deploy: { preview: false, production: false, productionUrl: null }, canWrite: true, ...o,
});

test("journey: stages reflect real state, one current step", () => {
  const s = stages(base({ plan: "approved", run: "succeeded", sandbox: "running" }));
  assert.deepEqual(s.map((x) => x.status), ["done", "done", "done", "done", "current", "upcoming"]);
  assert.equal(s.find((x) => x.key === "test")!.href, `/projects/${P}/qa`);
  assert.equal(stages(base({ described: false }))[0]!.status, "current");
  assert.ok(stages(base({ plan: "approved", run: "succeeded", sandbox: "running", qa: { lastRunAt: "x", release: "ready", openBlocking: 0, openOther: 0 }, deploy: { preview: true, production: true, productionUrl: "https://a.b" } })).every((x) => x.status === "done"));
});

test("journey: things waiting on you come before the next step", () => {
  const s = suggestions(base({ plan: "approved", run: "waiting_approval", pendingApprovals: 2 }));
  assert.equal(s[0]!.key, "approvals");
  assert.match(s[0]!.title, /2 requests/);
  assert.equal(s[1]!.key, "watch");
});

test("journey: next step follows the build", () => {
  assert.equal(suggestions(base())[0]!.key, "plan");
  assert.equal(suggestions(base({ described: false }))[0]!.key, "describe");
  assert.equal(suggestions(base({ plan: "draft" }))[0]!.key, "approve");
  assert.equal(suggestions(base({ plan: "approved", run: "succeeded", sandbox: "stopped" }))[0]!.key, "preview");
});

test("journey: QA is introduced once there's something to test, and re-suggested after changes", () => {
  const running = { plan: "approved" as const, run: "succeeded" as const, sandbox: "running" as const, runFinishedAt: "2026-11-20T08:00:00Z" };
  assert.equal(suggestions(base(running))[0]!.key, "qa");
  assert.equal(suggestions(base({ plan: "draft" })).some((x) => x.key === "qa"), false, "no QA suggestion before there is an app");
  const stale = suggestions(base({ ...running, qa: { lastRunAt: "2026-11-20T07:00:00Z", release: "ready", openBlocking: 0, openOther: 0 } }));
  assert.equal(stale[0]!.key, "qa-again");
});

test("journey: deploy only when QA isn't blocking; blocking issues come first", () => {
  const ready = base({ plan: "approved", run: "succeeded", sandbox: "running", runFinishedAt: "2026-11-20T07:00:00Z", qa: { lastRunAt: "2026-11-20T08:00:00Z", release: "ready", openBlocking: 0, openOther: 0 } });
  assert.equal(suggestions(ready)[0]!.key, "deploy");
  const blocked = suggestions({ ...ready, qa: { ...ready.qa, release: "critical", openBlocking: 3 } });
  assert.equal(blocked[0]!.key, "qa-blocking");
  assert.ok(!blocked.some((x) => x.key === "deploy"));
});

test("journey: once live, introduces analytics and automations; never more than the limit", () => {
  const live = suggestions(base({ plan: "approved", run: "succeeded", sandbox: "running", runFinishedAt: "2026-11-20T07:00:00Z", qa: { lastRunAt: "2026-11-20T08:00:00Z", release: "ready", openBlocking: 0, openOther: 4 }, deploy: { preview: true, production: true, productionUrl: "https://x.y" } }));
  assert.deepEqual(live.map((x) => x.key), ["analytics", "automations", "qa-other"]);
  assert.equal(suggestions(base({ pendingApprovals: 1, openIncidents: 1, run: "failed", plan: "approved", qa: { lastRunAt: "x", release: "critical", openBlocking: 2, openOther: 0 } }), 3).length, 3);
});

test("journey: read-only members don't get suggestions to change things", () => {
  const s = suggestions(base({ canWrite: false, plan: "draft" }));
  assert.ok(!s.some((x) => x.key === "approve"));
});
