import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCron, nextRun } from "./cron";
import { validateDefinition, secretNamesUsed } from "./definition";
import { WORKFLOW_TEMPLATES } from "./templates";
import { runWorkflow, TemporaryError, type Executors, type PriorAttempt } from "./engine";
import { signWebhook, verifyWebhook, webhookSecretName } from "./webhook";
import { extractRefs, render } from "./template";

test("cron: parsing, minimum interval and next run", () => {
  assert.deepEqual(parseCron("0 7 * * 1-5").weekdays, [1, 2, 3, 4, 5]);
  assert.deepEqual(parseCron("*/15 * * * *").minutes, [0, 15, 30, 45]);
  assert.throws(() => parseCron("* * * * *"), /every 5 minutes/);
  assert.throws(() => parseCron("*/2 * * * *"), /every 5 minutes/);
  assert.throws(() => parseCron("58,1 * * * *"), /every 5 minutes/, "wrapping across the hour counts");
  assert.throws(() => parseCron("0 7 * *"), /5 fields/);
  assert.throws(() => parseCron("61 7 * * *"), /out of range/);
  // Friday 2026-11-20 08:00 UTC → next weekday 07:00 is Monday the 23rd.
  assert.equal(nextRun("0 7 * * 1-5", new Date("2026-11-20T08:00:00Z")).toISOString(), "2026-11-23T07:00:00.000Z");
  assert.equal(nextRun("30 9 1 * *", new Date("2026-11-19T00:00:00Z")).toISOString(), "2026-12-01T09:30:00.000Z");
  assert.equal(nextRun("0 7 * * MON-FRI", new Date("2026-11-19T06:59:30Z")).toISOString(), "2026-11-19T07:00:00.000Z");
});

test("every starter template validates", () => {
  for (const t of WORKFLOW_TEMPLATES) {
    const r = validateDefinition(t.definition);
    assert.ok(r.ok, `${t.key}: ${!r.ok ? r.errors.join("; ") : ""}`);
    if (t.schedule) parseCron(t.schedule);
  }
  assert.equal(WORKFLOW_TEMPLATES.length, 7);
  assert.equal(new Set(WORKFLOW_TEMPLATES.map((t) => t.key)).size, 7);
  assert.deepEqual(secretNamesUsed(WORKFLOW_TEMPLATES[2]!.definition), ["CRM_API_KEY"]);
});

test("definitions: limits, ids, dependencies and references", () => {
  const bad = (def: unknown) => { const r = validateDefinition(def); assert.equal(r.ok, false); return r.ok ? "" : r.errors.join(" | "); };
  assert.match(bad({ steps: Array.from({ length: 26 }, (_, i) => ({ id: `s${i}`, type: "slack", text: "x" })) }), /at most 25/);
  assert.match(bad({ steps: [{ id: "Bad-Id", type: "slack", text: "x" }] }), /id must match/);
  assert.match(bad({ steps: [{ id: "a", type: "slack", text: "x".repeat(4001) }] }), /longer than 4000/);
  assert.match(bad({ steps: [{ id: "a", type: "delay", seconds: 86_401 }] }), /seconds must be/);
  assert.match(bad({ steps: [{ id: "a", type: "http", url: "https://x.example", retries: { max: 6 } }] }), /retries.max/);
  assert.match(bad({ steps: [{ id: "a", type: "slack", text: "x", dependsOn: ["ghost"] }] }), /unknown step ghost/);
  assert.match(bad({ steps: [{ id: "a", type: "slack", text: "x", dependsOn: ["b"] }, { id: "b", type: "slack", text: "y", dependsOn: ["a"] }] }), /cycle/);
  assert.match(bad({ steps: [{ id: "a", type: "slack", text: "x" }, { id: "b", type: "slack", text: "{{steps.a.output.y}}" }] }), /must be a step it depends on/);
  assert.match(bad({ steps: [{ id: "a", type: "slack", text: "key {{secrets.API_KEY}}" }] }), /only be used in HTTP headers and bodies/);
  assert.match(bad({ steps: [{ id: "a", type: "http", url: "https://x.example/?k={{secrets.API_KEY}}" }] }), /only be used in HTTP/);
  assert.match(bad({ steps: [{ id: "a", type: "http", url: "http://x.example" }] }), /https/);
  assert.match(bad({ steps: [{ id: "a", type: "slack", text: "{{env.HOME}}" }] }), /unknown reference/);
  assert.ok(validateDefinition({ steps: [{ id: "a", type: "http", url: "https://x.example", headers: { Authorization: "Bearer {{secrets.API_KEY}}" } }, { id: "b", type: "slack", dependsOn: ["a"], text: "{{steps.a.output.json.n}}" }, { id: "c", type: "slack", dependsOn: ["b"], text: "{{steps.a.output.status}}" }] }).ok, "transitive dependencies may be referenced");
});

test("template rendering", () => {
  const ctx = { trigger: { body: { n: 3, who: { name: "Ana" } } }, steps: { a: { json: { total: 9 } } }, secrets: { K: "s3cret" } };
  assert.equal(render("{{trigger.body.n}}", ctx), 3);
  assert.equal(render("Hi {{trigger.body.who.name}}, total {{steps.a.json.total}}", ctx), "Hi Ana, total ");
  assert.equal(render("Hi {{trigger.body.who.name}}, total {{steps.a.output.json.total}}", ctx), "Hi Ana, total 9");
  assert.equal(extractRefs("{{secrets.API_KEY}} {{nope}}").errors.length, 1);
});

function exec(over: Partial<Executors> = {}) {
  const calls: string[] = [];
  const ex: Executors = {
    http: async (r) => { calls.push(`http ${r.method} ${r.url} ${JSON.stringify(r.headers)} ${r.body ?? ""}`); return { status: 200, json: { orders: 4 } }; },
    email: async (m) => { calls.push(`email ${m.to} ${m.subject}`); return { sent: 1 }; },
    slack: async (m) => { calls.push(`slack ${m.text}`); return { posted: true }; },
    ...over,
  };
  return { ex, calls };
}

test("engine: dependency order, outputs, conditions and secret scrubbing", async () => {
  const { ex, calls } = exec();
  const def = validateDefinition(WORKFLOW_TEMPLATES[1]!.definition);
  assert.ok(def.ok);
  if (!def.ok) return;
  const out = await runWorkflow({ definition: def.definition, trigger: {}, secrets: { STATS_API_TOKEN: "tok_live_123456" }, prior: [], executors: exec({ http: async (r) => { calls.push(r.headers.Authorization!); return { status: 200, json: { orders: 4, revenue: 100 }, echoed: r.headers.Authorization }; } }).ex, now: 0 });
  assert.equal(out.status, "succeeded");
  assert.deepEqual(out.records.map((r) => `${r.stepId}:${r.status}`), ["fetch_stats:succeeded", "send:succeeded"]);
  assert.ok(!JSON.stringify(out.records).includes("tok_live_123456"), "secrets are scrubbed from stored outputs");
  assert.ok(calls.includes("Bearer tok_live_123456"), "the real value is sent to the server");
  const skip = await runWorkflow({ definition: (validateDefinition(WORKFLOW_TEMPLATES[2]!.definition) as unknown as { definition: never }).definition, trigger: { body: { email: "a@gmail.com", is_business_email: false } }, secrets: {}, prior: [], executors: ex, now: 0 });
  assert.deepEqual(skip.records.map((r) => `${r.stepId}:${r.status}`), ["shape:succeeded", "forward:skipped"]);
});

test("engine: temporary failures retry with doubling backoff, then fail", async () => {
  const def = (validateDefinition({ steps: [{ id: "call", type: "http", url: "https://x.example", retries: { max: 2, backoffSeconds: 10 } }] }) as unknown as { definition: never }).definition;
  const failing = exec({ http: async () => { throw new TemporaryError("503"); } }).ex;
  const prior: PriorAttempt[] = [];
  let now = 1_000_000;
  const first = await runWorkflow({ definition: def, trigger: {}, secrets: {}, prior, executors: failing, now });
  assert.equal(first.status, "waiting");
  assert.equal(first.nextAttemptAt, now + 10_000);
  prior.push({ ...first.records[0]!, finishedAt: now });
  const tooSoon = await runWorkflow({ definition: def, trigger: {}, secrets: {}, prior, executors: failing, now: now + 5000 });
  assert.equal(tooSoon.records.length, 0, "no attempt before the backoff elapses");
  now += 10_000;
  const second = await runWorkflow({ definition: def, trigger: {}, secrets: {}, prior, executors: failing, now });
  assert.equal(second.nextAttemptAt, now + 20_000, "the backoff doubles");
  prior.push({ ...second.records[0]!, finishedAt: now });
  now += 20_000;
  const third = await runWorkflow({ definition: def, trigger: {}, secrets: {}, prior, executors: failing, now });
  assert.equal(third.status, "failed");
  assert.equal(third.records[0]!.attempt, 3);
  const permanent = await runWorkflow({ definition: def, trigger: {}, secrets: {}, prior: [], executors: exec({ http: async () => { throw new Error("400 bad request"); } }).ex, now: 0 });
  assert.equal(permanent.status, "failed", "non-temporary errors fail at once");
});

test("engine: delays wait, and a resumed run continues after its last finished step", async () => {
  const def = (validateDefinition({ steps: [{ id: "first", type: "slack", text: "1" }, { id: "pause", type: "delay", seconds: 60, dependsOn: ["first"] }, { id: "second", type: "slack", text: "2", dependsOn: ["pause"] }] }) as unknown as { definition: never }).definition;
  const { ex, calls } = exec();
  const a = await runWorkflow({ definition: def, trigger: {}, secrets: {}, prior: [], executors: ex, now: 0 });
  assert.equal(a.status, "waiting");
  assert.equal(a.nextAttemptAt, 60_000);
  const prior = a.records.map((r) => ({ ...r, finishedAt: 0 }));
  const early = await runWorkflow({ definition: def, trigger: {}, secrets: {}, prior, executors: ex, now: 30_000 });
  assert.equal(early.status, "waiting");
  assert.equal(early.records.length, 0);
  const b = await runWorkflow({ definition: def, trigger: {}, secrets: {}, prior, executors: ex, now: 60_000 });
  assert.equal(b.status, "succeeded");
  assert.deepEqual(calls, ["slack 1", "slack 2"], "the first step is not repeated on resume");
});

test("webhook signatures: valid, tampered, wrong secret, stale and replay hash", () => {
  const now = 1_800_000_000;
  const body = '{"order_id":7}';
  const h = signWebhook("whsec_abc", body, now);
  const ok = verifyWebhook("whsec_abc", h, body, now + 10);
  assert.ok(ok.ok);
  assert.equal(verifyWebhook("whsec_abc", h, body + " ", now).ok, false);
  assert.equal(verifyWebhook("whsec_other", h, body, now).ok, false);
  const stale = verifyWebhook("whsec_abc", h, body, now + 301);
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.match(stale.reason, /tolerance/);
  assert.equal(verifyWebhook("whsec_abc", signWebhook("whsec_abc", body, now - 400), body, now).ok, false, "old timestamps can't be replayed later");
  assert.equal(verifyWebhook("whsec_abc", null, body, now).ok, false);
  const again = verifyWebhook("whsec_abc", h, body, now);
  assert.ok(ok.ok && again.ok && ok.signatureHash === again.signatureHash, "the same delivery has the same replay hash");
  assert.match(webhookSecretName("3f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f"), /^WEBHOOK_[0-9A-F]{32}$/);
});

test("describe: schedules, steps, conditions and the diagram in plain words", async () => {
  const { describeSchedule, diagram, connectorsUsed, workflowHealth } = await import("./describe");
  assert.equal(describeSchedule("0 7 * * 1-5"), "Weekdays at 07:00 UTC");
  assert.equal(describeSchedule("0 8 * * 1"), "Every Monday at 08:00 UTC");
  assert.equal(describeSchedule("*/15 * * * *"), "Every 15 minutes");
  assert.equal(describeSchedule("30 9 1 * *"), "On day 1 of each month at 09:30 UTC");
  assert.equal(describeSchedule("5 4 * 2 *"), "Schedule 5 4 * 2 * (UTC)");
  const t = WORKFLOW_TEMPLATES.find((x) => x.key === "lead-follow-up")!;
  const d = diagram(t.trigger, t.schedule, t.definition);
  assert.deepEqual(d.map((n) => n.kind), ["trigger", "delay", "email"]);
  assert.equal(d[1]!.detail, "1 day");
  assert.equal(d[2]!.condition, "only if email is filled in");
  assert.deepEqual(d[2]!.after, ["wait"]);
  assert.deepEqual(connectorsUsed(WORKFLOW_TEMPLATES.find((x) => x.key === "payment-received")!.definition), ["resend", "slack"]);
  const now = new Date().toISOString();
  assert.equal(workflowHealth([{ workflow_id: "w", status: "failed", created_at: now }], "w").health, "failing");
  assert.equal(workflowHealth([{ workflow_id: "w", status: "queued", created_at: now }], "w").health, "idle");
  assert.equal(workflowHealth([], "w").health, "idle");
});
