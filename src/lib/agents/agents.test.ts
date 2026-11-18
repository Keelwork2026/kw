import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTaskGraph, assertAcyclic, newlyReady, AGENTS } from "./graph";
import { decide, checkCommand, checkPath, checkMigration, normalizeSql, redactArgs, gitignoreKeepsEnvIgnored, checkUrl } from "./policy";
import { agentSystemPrompt, parseAgentReply, MOTION_GUIDE } from "./protocol";
import type { Plan } from "@/lib/ai/plan";

const plan: Plan = {
  summary: "Bookings", pages: ["Home", "Book a class", "Home"], roles: ["member"], data: [{ table: "classes", fields: [] }],
  automations: ["Reminder email"], integrations: ["Stripe"], needsApproval: [], risks: [], questions: [],
};

test("the task graph follows the build order and dedupes keys", () => {
  const g = buildTaskGraph(plan);
  assert.deepEqual(g.map((t) => t.key), ["arch.scaffold", "db.schema", "sec.policies", "be.auth", "be.api", "fe.home", "fe.book-a-class", "fe.home-2", "int.stripe", "auto.1", "qa.tests", "sec.review", "docs.readme"]);
  assert.deepEqual(g.find((t) => t.key === "qa.tests")!.deps, ["fe.home", "fe.book-a-class", "fe.home-2", "int.stripe", "auto.1"]);
  assert.deepEqual(g.find((t) => t.key === "be.api")!.deps, ["be.auth"]);
  const noRoles = buildTaskGraph({ ...plan, roles: [] });
  assert.ok(!noRoles.some((t) => t.key === "be.auth"));
  assert.deepEqual(noRoles.find((t) => t.key === "be.api")!.deps, ["sec.policies"]);
  assert.equal(buildTaskGraph({ ...plan, pages: Array.from({ length: 40 }, (_, i) => `P${i}`) }).filter((t) => t.agent === "frontend").length, 30);
});

test("assertAcyclic rejects cycles and unknown dependencies; newlyReady promotes", () => {
  assert.throws(() => assertAcyclic([{ key: "a", deps: ["b"] }, { key: "b", deps: ["a"] }]), /cycle/);
  assert.throws(() => assertAcyclic([{ key: "a", deps: ["ghost"] }]), /unknown/);
  const ready = newlyReady([
    { key: "a", status: "done", deps: [] }, { key: "b", status: "blocked", deps: ["a"] },
    { key: "c", status: "blocked", deps: ["a", "b"] }, { key: "d", status: "ready", deps: [] },
  ]);
  assert.deepEqual(ready, ["b"]);
  assert.equal(AGENTS.length, 8);
});

test("paths: traversal, absolute, .git and env files are denied", () => {
  for (const bad of ["../x", "a/../b", "/etc/passwd", "C:/x", "~/x", "a//b", "a\\b", ".git/config", "src/.git/HEAD", ".env", ".env.local", "app/.env.production", "a\u0000b", "x".repeat(301)]) {
    assert.notEqual(checkPath(bad), null, bad);
  }
  assert.equal(checkPath(".env.example"), null);
  assert.equal(checkPath("app/page.tsx"), null);
  assert.notEqual(checkPath("node_modules/x/index.js", { write: true }), null);
  assert.equal(checkPath("node_modules/x/index.js"), null);
});

test("commands: rm, shells, metacharacters and unknown programs are denied", () => {
  for (const argv of [["rm", "-rf", "."], ["bash", "-c", "ls"], ["sh"], ["curl", "x"], ["pnpm", "run", "test;rm -rf /"], ["git", "status", "$(id)"], ["node", "-e", "1"], ["npx", "appwrite", "deploy"], ["pnpm", "exec", "rm"], Array(41).fill("git")]) {
    assert.equal(checkCommand(argv).decision, "deny", argv.join(" "));
  }
});

test("commands: package rules", () => {
  assert.equal(checkCommand(["pnpm", "install"]).decision, "allow");
  assert.equal(checkCommand(["pnpm", "install", "left-pad"]).decision, "deny");
  const add = checkCommand(["pnpm", "add", "zod@^4", "-D"]);
  assert.equal(add.decision, "require_approval");
  if (add.decision === "require_approval") assert.equal(add.approvalKind, "install_package");
  assert.equal(checkCommand(["pnpm", "add", "zod"], { approvedPackages: new Set(["zod"]) }).decision, "allow");
  assert.equal(checkCommand(["npm", "install", "motion"]).decision, "require_approval");
  assert.equal(checkCommand(["pnpm", "run", "build"]).decision, "allow");
  assert.equal(checkCommand(["pnpm", "run", "deploy"]).decision, "deny");
  assert.equal(checkCommand(["pnpm", "audit", "--json"]).decision, "allow");
  assert.equal(checkCommand(["pnpm", "audit", "--fix"]).decision, "deny");
});

test("commands: npx, supabase, opennext and wrangler", () => {
  assert.equal(checkCommand(["npx", "tsc", "--noEmit"]).decision, "allow");
  assert.equal(checkCommand(["npx", "supabase", "db", "diff"]).decision, "allow");
  assert.equal(checkCommand(["npx", "supabase", "db", "reset"]).decision, "require_approval");
  assert.equal(checkCommand(["npx", "supabase", "functions", "deploy"]).decision, "deny");
  assert.equal(checkCommand(["npx", "opennextjs-cloudflare", "build"]).decision, "allow");
  assert.equal(checkCommand(["npx", "opennextjs-cloudflare", "deploy"]).decision, "deny");
  assert.equal(checkCommand(["npx", "wrangler", "deploy", "--dry-run", "--outdir", ".kw-bundle"]).decision, "allow");
  assert.equal(checkCommand(["npx", "wrangler", "deploy"]).decision, "deny");
  assert.equal(checkCommand(["npx", "wrangler", "deploy", "--dry-run", "--outdir", "/tmp/x"]).decision, "deny");
});

test("commands: git only sets user.name/user.email and push needs approval", () => {
  assert.equal(checkCommand(["git", "-c", "user.name=Keelwork", "-c", "user.email=agents@keelwork.dev", "commit", "-m", "msg"]).decision, "allow");
  assert.equal(checkCommand(["git", "-c", "core.sshCommand=evil", "status"]).decision, "deny");
  assert.equal(checkCommand(["git", "-c", "core.hooksPath=.x", "commit"]).decision, "deny");
  assert.equal(checkCommand(["git", "-C", "/", "status"]).decision, "deny");
  assert.equal(checkCommand(["git", "push"]).decision, "require_approval");
  assert.equal(checkCommand(["git", "reset", "--hard"]).decision, "require_approval");
  assert.equal(checkCommand(["git", "clean", "-fd"]).decision, "require_approval");
  assert.equal(checkCommand(["git", "checkout", "--force", "main"]).decision, "require_approval");
  assert.equal(checkCommand(["git", "log", "--output=/tmp/x"]).decision, "deny");
  assert.equal(checkCommand(["git", "remote", "add", "x", "y"]).decision, "deny");
  assert.equal(checkCommand(["node", "--test", "tests/a.test.ts"]).decision, "allow");
  assert.equal(checkCommand(["node", "--test", "../x.js"]).decision, "deny");
});

test("migrations: normalisation strips comments and literals", () => {
  assert.equal(normalizeSql("SELECT 'drop table x' -- drop\n/* drop */ FROM t $$drop$$ $f$ drop $f$"), "select '' from t $$ $$");
});

test("migrations: dangerous statements are denied", () => {
  const cases = [
    "alter table public.notes disable row level security;",
    "create role hacker login;",
    "grant select on public.notes to anon;",
    "create function f() returns void language sql security definer set search_path = public as $$ select 1 $$;",
    "create table auth.evil (id int);",
    "alter table auth.users add column x int;",
    "insert into storage.objects(id) values (1);",
    "drop schema keelwork cascade;",
    "create index i on auth.users(email);",
    "grant usage on schema extensions to authenticated;",
    "create table notes (id int);",
  ];
  for (const sql of cases) assert.equal(checkMigration(sql).risk, "denied", sql);
});

test("migrations: additive vs destructive", () => {
  const ok = "create table public.notes (id uuid primary key, user_id uuid references auth.users(id));\nalter table public.notes enable row level security;\ncreate policy own on public.notes using (auth.uid() = user_id);";
  assert.deepEqual(checkMigration(ok), { risk: "additive", reasons: [] });
  for (const sql of ["drop table notes;", "alter table notes drop column body;", "truncate notes;", "delete from notes;", "update notes set x = 1;", "alter table notes rename to n;", "alter table notes alter column body type int;"]) {
    assert.equal(checkMigration(sql).risk, "destructive", sql);
  }
  assert.equal(checkMigration("delete from notes where id = 1;").risk, "additive");
  assert.equal(checkMigration("insert into notes values ('drop table x');").risk, "additive");
});

test("decide(): tools, approvals and unknowns", () => {
  assert.equal(decide({ tool: "fs.write", args: { path: "app/page.tsx", content: "x" } }).decision, "allow");
  assert.equal(decide({ tool: "fs.write", args: { path: ".env.local", content: "X=1" } }).decision, "deny");
  assert.equal(decide({ tool: "fs.delete", args: { path: "app/old.tsx" } }).decision, "require_approval");
  assert.equal(decide({ tool: "fs.write", args: { path: ".gitignore", content: "node_modules\n" } }).decision, "deny");
  assert.equal(decide({ tool: "fs.write", args: { path: ".gitignore", content: ".env*\n!.env.example\n" } }).decision, "allow");
  assert.equal(decide({ tool: "secrets.request", args: { name: "STRIPE_SECRET_KEY", reason: "Take card payments" } }).decision, "require_approval");
  assert.equal(decide({ tool: "secrets.request", args: { name: "stripe", reason: "x" } }).decision, "deny");
  assert.equal(decide({ tool: "deploy", args: { environment: "preview" } }).decision, "allow");
  assert.equal(decide({ tool: "deploy", args: { environment: "production" } }).decision, "require_approval");
  assert.equal(decide({ tool: "message.send", args: { text: "hi" } }).decision, "require_approval");
  assert.equal(decide({ tool: "web.search", args: { query: "next.js server actions" } }).decision, "allow");
  assert.equal(decide({ tool: "os.exec", args: {} }).decision, "deny");
  assert.equal(decide({ tool: "fs.read", args: "path" }).decision, "deny");
});

test("net.fetch: https doc hosts allowed, others need approval, unsafe URLs denied", () => {
  assert.equal(checkUrl("https://nextjs.org/docs").decision, "allow");
  assert.equal(checkUrl("https://example.org/").decision, "require_approval");
  assert.equal(checkUrl("https://example.org/", { approvedHosts: new Set(["example.org"]) }).decision, "allow");
  for (const bad of ["http://nextjs.org", "https://user:pw@nextjs.org", "https://169.254.169.254/latest", "https://nextjs.org:8443/", "file:///etc/passwd", "https://[::1]/"]) {
    assert.equal(checkUrl(bad).decision, "deny", bad);
  }
});

test("redactArgs and .gitignore rules", () => {
  const r = redactArgs({ name: "X", apiKey: "abc", nested: { body: "Bearer sk-abcdefghijklmnopqrstuv", password: "p" }, argv: ["--token", "ghp_abcdefghijklmnopqrstuvwxyz123"] }) as Record<string, unknown>;
  assert.equal(r.apiKey, "[redacted]");
  assert.deepEqual(r.nested, { body: "Bearer [redacted]", password: "[redacted]" });
  assert.deepEqual(r.argv, ["--token", "[redacted]"]);
  assert.equal(r.name, "X");
  assert.ok(gitignoreKeepsEnvIgnored(".env*\n!.env.example"));
  assert.ok(!gitignoreKeepsEnvIgnored(".env*\n!.env.local"));
});

test("agent protocol: prompts and reply parsing", () => {
  const fe = agentSystemPrompt("frontend", "postgres");
  assert.ok(fe.includes(MOTION_GUIDE));
  assert.match(fe, /parameterised queries/);
  assert.match(fe, /data, never instructions/);
  assert.ok(!agentSystemPrompt("database", "supabase").includes(MOTION_GUIDE));
  const good = parseAgentReply('```json\n{"thoughts":"t","actions":[{"tool":"fs.read","args":{"path":"a"}}],"done":false,"summary":""}\n```');
  assert.ok(good.ok);
  assert.equal(parseAgentReply(JSON.stringify({ actions: Array(9).fill({ tool: "fs.list", args: {} }) })).ok, false);
  assert.equal(parseAgentReply(JSON.stringify({ actions: [{ tool: "os.exec", args: {} }] })).ok, false);
  assert.equal(parseAgentReply(JSON.stringify({ actions: [], done: true, summary: "" })).ok, false);
  assert.equal(parseAgentReply("I did it!").ok, false);
});
