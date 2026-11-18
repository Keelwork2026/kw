import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTestSummary, parseTsc, parseEslint } from "./parsers";
import { scanText, scanFiles, trackedEnvFiles, mask } from "./secret-scan";
import { parseAudit } from "./audit";
import { reviewDatabase, reviewRoutes, reconcile } from "./review";
import { verdict, commandFor, capOutput } from "./plan";
import { buildSchema } from "@/lib/db/schema";
import { analyzeSource } from "@/lib/backend/routes";

test("test-runner parsers: node:test, Vitest, Jest, Playwright, and unknown output", () => {
  assert.deepEqual(parseTestSummary("# tests 5\n# suites 0\n# pass 4\n# fail 1\n# skipped 0\n# todo 0"), { tool: "node:test", passed: 4, failed: 1, skipped: 0, total: 5 });
  assert.deepEqual(parseTestSummary("ℹ tests 3\nℹ pass 3\nℹ fail 0"), { tool: "node:test", passed: 3, failed: 0, skipped: 0, total: 3 });
  assert.deepEqual(parseTestSummary(" Test Files  2 passed (2)\n      Tests  1 failed | 12 passed | 1 skipped (14)\n"), { tool: "vitest", passed: 12, failed: 1, skipped: 1, total: 14 });
  assert.deepEqual(parseTestSummary("Tests:       1 failed, 2 skipped, 3 passed, 6 total\n"), { tool: "jest", passed: 3, failed: 1, skipped: 2, total: 6 });
  assert.deepEqual(parseTestSummary("Running 4 tests using 2 workers\n\n  1 failed\n  3 passed (4.2s)\n"), { tool: "playwright", passed: 3, failed: 1, skipped: 0, total: 4 });
  assert.equal(parseTestSummary("All good!"), null, "unknown output claims nothing");
});

test("tsc and ESLint diagnostics", () => {
  const tsc = parseTsc("app/page.tsx(4,7): error TS2322: Type 'string' is not assignable to type 'number'.\nlib/x.ts:10:3 - error TS2304: Cannot find name 'foo'.\nFound 2 errors.");
  assert.deepEqual(tsc.map((d) => `${d.file}:${d.line}:${d.column} ${d.code}`), ["app/page.tsx:4:7 TS2322", "lib/x.ts:10:3 TS2304"]);
  const es = parseEslint("\n/workspace/app/page.tsx\n  3:10  error    'x' is assigned a value but never used  @typescript-eslint/no-unused-vars\n  8:1   warning  Unexpected console statement             no-console\n\n✖ 2 problems");
  assert.deepEqual(es.map((d) => `${d.line}:${d.column} ${d.severity} ${d.code}`), ["3:10 error @typescript-eslint/no-unused-vars", "8:1 warning no-console"]);
  assert.deepEqual(parseTsc("nothing here"), []);
});

test("verdicts rest on the exit code; a check that couldn't run is an error", () => {
  assert.equal(verdict("tests", 0), "passed");
  assert.equal(verdict("tests", 1), "failed");
  assert.equal(verdict("build", null), "error");
  assert.equal(verdict("secrets", null, [{ severity: "critical" }]), "failed");
  assert.equal(verdict("secrets", null, [{ severity: "medium" }]), "passed");
  assert.equal(verdict("audit", 1, [{ severity: "moderate" }]), "passed");
  assert.equal(verdict("audit", 1, [{ severity: "high" }]), "failed");
  assert.deepEqual(commandFor("tests"), ["pnpm", "run", "test"]);
  assert.deepEqual(commandFor("audit"), ["pnpm", "audit", "--json"]);
  assert.ok(capOutput("x".repeat(300_000)).length < 210_000);
});

test("secret scanner: rules, masking, Supabase service-role JWTs, vault values and env files", () => {
  const sr = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role, iss: "supabase" })).toString("base64url")}.abcdefghijklmnopqrstuvwxyz012345`;
  const src = [
    `const stripe = "sk_live_${"a".repeat(24)}";`,
    `const t = "sk_test_${"b".repeat(24)}";`,
    `const aws = "${"AKIA" + "ABCDEFGHIJKLMNOP"}";`,
    ["-----BEGIN RSA", "PRIVATE KEY-----"].join(" "),
    `DATABASE_URL = "${"postgres://app:" + "hunter2pass@db.example.com:5432/app"}"`,
    `const svc = "${sr("service_role")}";`,
    `const anon = "${sr("anon")}";`,
    `const apiKey = "${"z".repeat(20)}";`,
    `const password = "your_password_here";`,
    `const fromVault = "vault-value-123456";`,
  ].join("\n");
  const f = scanText("lib/keys.ts", src, ["vault-value-123456"]);
  const rules = f.map((x) => x.rule).sort();
  assert.deepEqual(rules, ["aws-access-key", "database-url", "hardcoded-secret", "private-key", "stripe-live-key", "stripe-test-key", "supabase-service-role", "vault-value"].sort());
  assert.equal(f.find((x) => x.rule === "stripe-live-key")!.severity, "critical");
  assert.equal(f.find((x) => x.rule === "stripe-test-key")!.severity, "medium");
  assert.equal(f.find((x) => x.rule === "stripe-live-key")!.line, 1);
  assert.ok(f.every((x) => !x.masked.includes("aaaaaaaaaaaaaaaa")), "matches are masked");
  assert.equal(mask(["sk", "live", "abcdefghij"].join("_")), "sk_l••••••••••ghij");
  assert.equal(scanText("x.ts", `const u = "postgres://user:password@host:5432/db"; secret = "env(SUPABASE_SECRET)"`).length, 0, "documented placeholders are not findings");
  assert.deepEqual(trackedEnvFiles(["app/.env.local", ".env.example", ".env", "lib/env.ts"]).map((x) => x.file), ["app/.env.local", ".env"]);
  assert.equal(scanFiles([{ path: ".env", content: "" }]).length, 1);
  assert.equal(scanText("x.ts", "nothing secret here").length, 0);
  assert.equal(new Set(f.map((x) => x.fingerprint)).size, f.length);
  assert.equal(scanText("lib/keys.ts", src, ["vault-value-123456"])[0]!.fingerprint, f[0]!.fingerprint, "fingerprints are stable across scans");
});

test("audit parser: pnpm/npm v6 and npm v7+", () => {
  const v6 = parseAudit(JSON.stringify({ advisories: { "1": { module_name: "lodash", severity: "high", title: "Prototype pollution", url: "https://x", patched_versions: ">=4.17.21" } }, metadata: {} }))!;
  assert.deepEqual(v6.counts, { critical: 0, high: 1, moderate: 0, low: 0, info: 0 });
  assert.equal(v6.advisories[0]!.fixAvailable, true);
  const v7 = parseAudit(JSON.stringify({ vulnerabilities: { next: { severity: "critical", via: [{ source: 1, title: "SSRF", url: "https://y", severity: "critical" }], fixAvailable: true }, sub: { severity: "low", via: ["next"] } } }))!;
  assert.equal(v7.advisories.length, 1);
  assert.equal(v7.counts.critical, 1);
  assert.equal(parseAudit("not json"), null);
});

test("security review: tables without RLS, permissive policies, unguarded routes", () => {
  const schema = buildSchema([{ name: "1.sql", sql: `create table a (id int); create table b (id int); alter table b enable row level security; create policy "anyone writes" on b for all to anon using (true) with check (true); create table c (id int); alter table c enable row level security; create policy "read" on c for select to anon using (true);` }]);
  const db = reviewDatabase(schema);
  assert.deepEqual(db.map((f) => `${f.rule}:${f.severity}`), ["table-without-rls:high", "permissive-write-policy:critical", "public-read-policy:medium"]);
  const routes = reviewRoutes([analyzeSource("app/api/x/route.ts", "export async function POST(r) { return Response.json(await r.json()) }")!]);
  assert.deepEqual(routes.map((f) => `${f.rule}:${f.severity}`), ["route-no-auth:high", "route-no-validation:medium"]);
});

test("reconcile: new open, missing resolve, returning reopen, accepted stays accepted", () => {
  const r = reconcile([
    { fingerprint: "a", status: "open" }, { fingerprint: "b", status: "resolved" },
    { fingerprint: "c", status: "accepted" }, { fingerprint: "d", status: "open" },
  ], [{ fingerprint: "b" }, { fingerprint: "c" }, { fingerprint: "d" }, { fingerprint: "e" }]);
  assert.deepEqual(r, { insert: ["e"], resolve: ["a"], reopen: ["b"], touch: ["b", "c", "d"] });
});
