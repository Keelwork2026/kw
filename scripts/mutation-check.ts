/**
 * Mutation checks: proves the test suites catch real breaks. Each mutation
 * applies one deliberate weakening, runs the relevant suite, expects it to
 * FAIL, then reverts the file.
 *   pnpm tsx scripts/mutation-check.ts            # all 25
 *   pnpm tsx scripts/mutation-check.ts 4 17       # only these numbers
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
type Mutation = { name: string; file: string; find: string; replace: string; suite: "db" | "unit" };
const M = (name: string, suite: Mutation["suite"], file: string, find: string, replace: string): Mutation => ({ name, suite, file, find, replace });

export const MUTATIONS: Mutation[] = [
  M("Weaken member suspension", "db", "supabase/migrations/20261107001200_phase12_platform.sql", "m.status = 'active' and rp.permission = p_perm", "rp.permission = p_perm"),
  M("Let clients write AI messages", "db", "supabase/migrations/20261107000200_phase2_projects.sql", "    if new.role <> 'user' then", "    if false then"),
  M("Drop the plan-approval permission check", "db", "supabase/migrations/20261107000300_phase3_agents.sql", "  perform public._require(pl.org_id, 'project.write');\n", ""),
  M("Let the policy allow rm", "unit", "src/lib/agents/policy.ts", "    default:\n      return deny(`${cmd} is not an allowed command`);", "    case \"rm\":\n      return allow();\n    default:\n      return deny(`${cmd} is not an allowed command`);"),
  M("Forget the cloud-metadata IP range", "unit", "src/lib/import/safe-fetch.ts", "\"169.254.0.0/16\", ", ""),
  M("Skip the preview token check", "unit", "services/preview-proxy/proxy.ts", "      if (!auth.ok) return page(res, 401, auth.reason === \"expired\" ? EXPIRED : \"Open this preview from Keelwork.\", frame);\n", ""),
  M("Allow any git -c setting", "unit", "src/lib/agents/policy.ts", "if (!/^user\\.(name|email)=[^\\n]{0,200}$/.test(setting))", "if (false)"),
  M("Allow //host preview redirects", "unit", "src/lib/preview/token.ts", "if (!next.startsWith(\"/\") || next.startsWith(\"//\") || next.startsWith(\"/\\\\\")) return \"/\";", "if (!next.startsWith(\"/\")) return \"/\";"),
  M("Drop the vault's name binding", "unit", "src/lib/secrets/vault.ts", "${ctx.projectId}:${ctx.name}:${ctx.environment}", "${ctx.projectId}::${ctx.environment}"),
  M("Check only the first DNS answer", "unit", "src/lib/import/safe-fetch.ts", "  for (const a of addrs) {", "  for (const a of addrs.slice(0, 1)) {"),
  M("Grant clients the ciphertext column", "db", "supabase/migrations/20261107000600_phase6_data.sql", "grant select (id, project_id, org_id, name, environment, key_version", "grant select (id, project_id, org_id, name, environment, ciphertext, key_version"),
  M("Drop the webhook timestamp window", "unit", "src/lib/automation/webhook.ts", "  if (Math.abs(now - t) > tolerance) return { ok: false, reason: \"timestamp outside the tolerance window\" };\n", ""),
  M("Allow secrets outside HTTP headers and bodies", "unit", "src/lib/automation/definition.ts", "if (r.kind === \"secrets\" && !secretsAllowed)", "if (false)"),
  M("Drop the switch-on permission check", "db", "supabase/migrations/20261107000700_phase7_automation.sql", "  perform public._require(w.org_id, 'project.manage');\n  if p_enabled", "  if p_enabled"),
  M("Reopen accepted risks on rescan", "unit", "src/lib/checks/review.ts", "existing.filter((e) => e.status === \"resolved\" && now.has(e.fingerprint))", "existing.filter((e) => (e.status === \"resolved\" || e.status === \"accepted\") && now.has(e.fingerprint))"),
  M("Allow committed credentials to be accepted", "db", "supabase/migrations/20261107000800_phase8_quality.sql", "  if new.status = 'accepted' and new.is_credential then", "  if false then"),
  M("Ship env files in deployments", "unit", "src/lib/export/collect.ts", "  if (base.startsWith(\".env\") && base !== \".env.example\") return false;\n", ""),
  M("Skip the health gate", "unit", "src/lib/deploy/health.ts", "  let last = \"no answer\";", "  return { ok: true, path: \"/api/health\", status: 200, attempts: 0 };\n  let last = \"no answer\";"),
  M("Drop the Stripe timestamp window", "unit", "src/lib/billing/stripe.ts", "  if (Math.abs(now - t) > tolerance) return { ok: false, reason: \"timestamp outside the tolerance window\" };\n", ""),
  M("Disconnect usage from the ledger", "db", "supabase/migrations/20261107001000_phase10_billing.sql", "create trigger usage_events_to_ledger after insert on public.usage_events for each row execute function public._usage_to_ledger();", "-- trigger removed by mutation"),
  M("Follow only direct imports", "unit", "src/lib/testselect/graph.ts", "        queue.push({ f: importer, via: path ?? (importer !== file ? importer : null) });\n", ""),
  M("Let a selective run close incidents", "db", "supabase/migrations/20261107001100_phase11_heal.sql", "and new.kind <> 'affected_tests' then", "then"),
  M("Let a support grant cover write permissions", "db", "supabase/migrations/20261107001200_phase12_platform.sql", "    p_perm in ('org.read', 'project.read') and exists (", "    exists ("),
  M("Skip the Cloudflare preview check", "unit", "services/agent-worker/src/deploy-cloudflare.ts", "  if (!preview.ok) throw new DeployFailed(", "  if (false) throw new DeployFailed("),
  M("Build with secrets on disk", "unit", "services/agent-worker/src/deploy-cloudflare.ts", "    if (envBackup !== null) await sandbox.writeFile(\".env.local\", \"\");\n", ""),
];

function runSuite(suite: Mutation["suite"]): { failed: boolean; tail: string } {
  const r = suite === "db"
    ? spawnSync("bash", ["scripts/test-db.sh"], { cwd: ROOT, encoding: "utf8" })
    : spawnSync("tsx", ["--test", "src/**/*.test.ts", "services/**/*.test.ts", "scripts/env-vars.test.ts"], { cwd: ROOT, encoding: "utf8" });
  const out = `${r.stdout}\n${r.stderr}`;
  const failedLines = out.split("\n").filter((l) => /^FAILED:|^not ok|^# fail [1-9]/.test(l.trim())).slice(0, 3).join(" | ");
  return { failed: r.status !== 0, tail: failedLines || out.trim().split("\n").slice(-2).join(" | ") };
}

if (process.argv[1] && /mutation-check\.ts$/.test(process.argv[1])) {
  const only = process.argv.slice(2).map(Number).filter(Boolean);
  let caught = 0, total = 0;
  for (const [i, m] of MUTATIONS.entries()) {
    if (only.length && !only.includes(i + 1)) continue;
    total++;
    const path = join(ROOT, m.file);
    const original = readFileSync(path, "utf8");
    const count = original.split(m.find).length - 1;
    if (count !== 1) { console.log(`${String(i + 1).padStart(2)}. ${m.name}: SETUP ERROR (pattern found ${count} times)`); continue; }
    writeFileSync(path, original.replace(m.find, m.replace));
    try {
      const r = runSuite(m.suite);
      if (r.failed) caught++;
      console.log(`${String(i + 1).padStart(2)}. ${m.name}: ${r.failed ? "caught" : "NOT CAUGHT"} (${m.suite}) — ${r.tail.slice(0, 160)}`);
    } finally {
      writeFileSync(path, original);
    }
  }
  console.log(`\nMutation checks: ${caught}/${total} caught.`);
  process.exit(caught === total ? 0 : 1);
}
