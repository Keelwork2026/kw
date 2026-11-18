import { test } from "node:test";
import assert from "node:assert/strict";
import { runTask, fingerprint, type TaskDeps } from "./core";

// Fake key shapes are assembled at runtime so the repository passes its own secret scan.
const FAKE_LIVE = ["sk", "live", "TOPSECRETVALUE1234"].join("_");

function deps(replies: string[], over: Partial<TaskDeps> = {}) {
  const log: { tool: string; decision: string; reason?: string; args: unknown; resultSummary?: string }[] = [];
  const approvals: { kind: string; summary: string; details: Record<string, unknown> }[] = [];
  const files = new Map<string, string>();
  const seen: string[] = [];
  let i = 0;
  const d: TaskDeps = {
    complete: async (_route, messages) => { seen.push(messages.map((m) => m.content).join("\n")); return replies[Math.min(i++, replies.length - 1)]!; },
    fs: { list: async () => "a\nb", read: async (p) => files.get(p) ?? "", write: async (p, c) => { files.set(p, c); }, remove: async (p) => { files.delete(p); } },
    exec: async (argv) => ({ exitCode: 0, stdout: `ran ${argv.join(" ")} with ${FAKE_LIVE}`, stderr: "", timedOut: false }),
    acquireLock: async () => true,
    logToolCall: async (e) => { log.push(e as never); },
    requestApproval: async (r) => { approvals.push(r); },
    search: async () => "results", fetchUrl: async () => "page", writeMigration: async () => "supabase/migrations/1.sql",
    deploy: async () => "queued", sendMessage: async () => {},
    secretValues: [FAKE_LIVE], policy: {}, approved: new Set(), providedSecrets: new Set(),
    ...over,
  };
  return { d, log, approvals, files, seen };
}
const input = { agent: "frontend" as const, route: "code" as const, backend: "supabase" as const, title: "Build Home", key: "fe.home", planSummary: "Bookings", turnsUsed: 0 };
const reply = (actions: unknown[], done = false, summary = "") => JSON.stringify({ thoughts: "", actions, done, summary });

test("a task writes files, runs commands and finishes with a summary", async () => {
  const { d, log, files } = deps([reply([{ tool: "fs.write", args: { path: "app/page.tsx", content: "x" } }, { tool: "shell.run", args: { argv: ["pnpm", "run", "test"] } }]), reply([], true, "Home page built; tests pass.")]);
  const out = await runTask(input, d);
  assert.deepEqual(out, { status: "done", summary: "Home page built; tests pass.", turns: 2 });
  assert.equal(files.get("app/page.tsx"), "x");
  assert.deepEqual(log.map((l) => l.decision), ["allow", "allow"]);
  assert.ok(!JSON.stringify(log).includes("TOPSECRET"), "secret values never reach the log");
});

test("known secret values are scrubbed from what the model sees", async () => {
  const { d, seen } = deps([reply([{ tool: "shell.run", args: { argv: ["pnpm", "run", "build"] } }]), reply([], true, "ok")]);
  await runTask(input, d);
  assert.ok(seen.every((s) => !s.includes(FAKE_LIVE)));
  assert.ok(seen[1]!.includes("[secret]"));
});

test("policy denials are logged and reported back to the agent", async () => {
  const { d, log, seen } = deps([reply([{ tool: "shell.run", args: { argv: ["rm", "-rf", "/"] } }]), reply([], true, "done")]);
  await runTask(input, d);
  assert.equal(log[0]!.decision, "deny");
  assert.match(seen[1]!, /Denied by policy/);
});

test("risky actions become approvals and the task waits", async () => {
  const action = { tool: "shell.run", args: { argv: ["pnpm", "add", "motion"] } };
  const { d, approvals } = deps([reply([action])]);
  const out = await runTask(input, d);
  assert.equal(out.status, "waiting_approval");
  assert.equal(approvals[0]!.kind, "install_package");
  assert.equal(approvals[0]!.details.fingerprint, fingerprint(action as never));
  // After a person approves, the same call runs.
  const again = deps([reply([action]), reply([], true, "installed")], { approved: new Set([fingerprint(action as never)]) });
  assert.equal((await runTask(input, again.d)).status, "done");
  assert.equal(again.log[0]!.decision, "require_approval");
  assert.equal(again.approvals.length, 0);
});

test("an approval whose arguments contain a secret is refused", async () => {
  const { d, approvals, seen } = deps([reply([{ tool: "message.send", args: { text: "my key is sk-abcdefghijklmnopqrstuvwxyz" } }]), reply([], true, "ok")]);
  await runTask(input, d);
  assert.equal(approvals.length, 0);
  assert.match(seen[1]!, /use secrets.request/);
});

test("secrets.request asks for a value once, then reports the name only", async () => {
  const req = { tool: "secrets.request", args: { name: "STRIPE_SECRET_KEY", reason: "Take card payments" } };
  const first = deps([reply([req])]);
  assert.equal((await runTask(input, first.d)).status, "waiting_approval");
  assert.equal(first.approvals[0]!.kind, "secret_request");
  const after = deps([reply([req]), reply([], true, "wired up")], { providedSecrets: new Set(["STRIPE_SECRET_KEY"]) });
  assert.equal((await runTask(input, after.d)).status, "done");
  assert.match(after.seen[1]!, /available in .env.local/);
});

test("a task that doesn't finish in 12 turns fails with that reason", async () => {
  const { d } = deps([reply([{ tool: "fs.list", args: {} }])]);
  const out = await runTask(input, d);
  assert.deepEqual(out, { status: "failed", error: "The task didn't finish within 12 turns.", turns: 12 });
  const resumed = await runTask({ ...input, turnsUsed: 11 }, deps([reply([{ tool: "fs.list", args: {} }])]).d);
  assert.equal(resumed.turns, 12);
});

test("locked files are not written", async () => {
  const { d, files, seen } = deps([reply([{ tool: "fs.write", args: { path: "app/page.tsx", content: "x" } }]), reply([], true, "ok")], { acquireLock: async () => false });
  await runTask(input, d);
  assert.equal(files.size, 0);
  assert.match(seen[1]!, /being edited by someone else/);
});
