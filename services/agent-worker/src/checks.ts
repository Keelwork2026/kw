/**
 * Runs checks claimed with claim_check_runs inside the project's sandbox and
 * stores the real exit code and output (secrets scrubbed, size capped).
 * Secrets, review and audit results are reconciled into security_findings.
 */
import type { WorkerContext } from "./worker";
import { commandFor, verdict, capOutput, type CheckKind } from "../../../src/lib/checks/plan";
import { parseTestSummary, parseTsc, parseEslint } from "../../../src/lib/checks/parsers";
import { scanFiles } from "../../../src/lib/checks/secret-scan";
import { parseAudit } from "../../../src/lib/checks/audit";
import { reviewDatabase, reviewRoutes, reconcile } from "../../../src/lib/checks/review";
import { buildSchema } from "../../../src/lib/db/schema";
import { analyzeSource, candidateFiles, type RouteReport } from "../../../src/lib/backend/routes";
import { parseEntries } from "../../../src/lib/code/tree";
import { lsFilesArgs } from "../../../src/lib/code/git";
import { sandboxIdFor } from "../../../src/lib/sandbox/client";
import { loadMasterKeys } from "../../../src/lib/secrets/vault";
import { decryptProjectSecrets } from "../../../src/lib/secrets/load";
import { redactSecrets } from "../../../src/lib/secrets/redact";
import { migrationsDirFor, isBackend } from "../../../src/lib/stack/backends";
import { buildGraph, selectTests, selectiveCommand, isTestFile } from "../../../src/lib/testselect/graph";

type Finding = { fingerprint: string; scanner: "secrets" | "review" | "audit"; rule: string; severity: string; title: string; location: string; hint: string; is_credential: boolean };

export async function readProjectFiles(ctx: WorkerContext, projectId: string, limit = 2000, maxBytes = 300_000) {
  const sb = sandboxIdFor(projectId);
  const ls = await ctx.broker.exec(sb, lsFilesArgs());
  const paths = parseEntries(ls.stdout).slice(0, limit);
  const files: { path: string; content: string }[] = [];
  for (const p of paths) {
    if (/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|mp4|mp3|zip|gz|pdf|glb|gltf|wasm)$/i.test(p)) continue;
    const content = await ctx.broker.readFile(sb, p).catch(() => null);
    if (content !== null && content.length <= maxBytes) files.push({ path: p, content });
  }
  return { paths, files };
}

async function storeFindings(ctx: WorkerContext, project: { id: string; org_id: string }, scanner: Finding["scanner"], found: Finding[]) {
  const { data: existing } = await ctx.db.from("security_findings").select("fingerprint, status").eq("project_id", project.id).eq("scanner", scanner);
  const plan = reconcile((existing ?? []) as never, found);
  const byFp = new Map(found.map((f) => [f.fingerprint, f]));
  if (plan.insert.length) await ctx.db.from("security_findings").insert(plan.insert.map((fp) => ({ project_id: project.id, org_id: project.org_id, ...byFp.get(fp)! })));
  if (plan.resolve.length) await ctx.db.from("security_findings").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("project_id", project.id).in("fingerprint", plan.resolve);
  if (plan.reopen.length) await ctx.db.from("security_findings").update({ status: "open", resolved_at: null }).eq("project_id", project.id).in("fingerprint", plan.reopen);
  if (plan.touch.length) await ctx.db.from("security_findings").update({ last_seen: new Date().toISOString() }).eq("project_id", project.id).in("fingerprint", plan.touch);
}

export async function processChecks(ctx: WorkerContext) {
  const { data: claimed, error } = await ctx.db.rpc("claim_check_runs", { p_worker: ctx.workerId, p_limit: 2 });
  if (error) throw error;
  for (const run of claimed ?? []) {
    const started = Date.now();
    const finish = (patch: Record<string, unknown>) => ctx.db.from("check_runs").update({ ...patch, duration_ms: Date.now() - started, finished_at: new Date().toISOString() }).eq("id", run.id);
    try {
      const { data: project } = await ctx.db.from("projects").select("id, org_id, backend").eq("id", run.project_id).single();
      if (!project) throw new Error("project not found");
      const sb = sandboxIdFor(project.id);
      const keys = loadMasterKeys(process.env.SECRETS_MASTER_KEYS);
      const secretValues = keys ? Object.values(await decryptProjectSecrets(ctx.db, project.id, "development", keys)) : [];
      const scrub = (s: string) => capOutput(redactSecrets(s, secretValues));
      const kind = run.kind as CheckKind;

      if (kind === "secrets") {
        const { files } = await readProjectFiles(ctx, project.id);
        const all = keys ? [...new Set([...secretValues, ...Object.values(await decryptProjectSecrets(ctx.db, project.id, "production", keys)), ...Object.values(await decryptProjectSecrets(ctx.db, project.id, "preview", keys))])] : [];
        const found = scanFiles(files, all);
        await storeFindings(ctx, project, "secrets", found.map((f) => ({ fingerprint: f.fingerprint, scanner: "secrets", rule: f.rule, severity: f.severity, title: f.title, location: `${f.file}:${f.line} (${f.masked})`, hint: f.hint, is_credential: true })));
        await finish({ status: verdict(kind, null, found), summary: { findings: found.length, critical: found.filter((f) => f.severity === "critical").length }, output: `${found.length} potential secret(s) found in ${files.length} files.` });
        continue;
      }
      if (kind === "review") {
        const { files } = await readProjectFiles(ctx, project.id);
        const dir = isBackend(project.backend) ? migrationsDirFor(project.backend) : null;
        const schema = dir ? buildSchema(files.filter((f) => f.path.startsWith(`${dir}/`) && f.path.endsWith(".sql")).map((f) => ({ name: f.path, sql: f.content }))) : { tables: [] };
        const cand = new Set(candidateFiles(files.map((f) => f.path)));
        const reports = files.filter((f) => cand.has(f.path) || /["']use client["']/.test(f.content.slice(0, 200))).map((f) => analyzeSource(f.path, f.content)).filter((r): r is RouteReport => r !== null);
        const found = [...(project.backend === "supabase" ? reviewDatabase(schema) : []), ...reviewRoutes(reports)];
        await storeFindings(ctx, project, "review", found.map((f) => ({ fingerprint: f.fingerprint, scanner: "review", rule: f.rule, severity: f.severity, title: f.title, location: f.location, hint: f.hint, is_credential: false })));
        await finish({ status: verdict(kind, null, found), summary: { findings: found.length, tables: schema.tables.length, routes: reports.length }, output: found.map((f) => `[${f.severity}] ${f.title} — ${f.location}`).join("\n") || "No issues found." });
        continue;
      }

      let argv = commandFor(kind);
      let selection: unknown = null;
      if (kind === "affected_tests") {
        const { data: lastPass } = await ctx.db.from("check_runs").select("summary").eq("project_id", project.id).in("kind", ["tests"]).eq("status", "passed").order("finished_at", { ascending: false }).limit(1).maybeSingle();
        const since = (lastPass?.summary as { commit?: string } | null)?.commit;
        const changed = since ? (await ctx.broker.exec(sb, ["git", "diff", "--name-only", since])).stdout.split("\n").filter(Boolean) : null;
        const { files } = await readProjectFiles(ctx, project.id);
        const sel = selectTests(buildGraph(files.filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f.path))), changed ?? files.map((f) => f.path));
        selection = sel;
        if (sel.kind === "none") {
          await finish({ status: "passed", selection, summary: { selective: true, ran: 0 }, exit_code: 0, output: `No tests needed: ${sel.reason}.` });
          continue;
        }
        const pkg = files.find((f) => f.path === "package.json");
        const testScript = pkg ? (JSON.parse(pkg.content).scripts?.test as string | undefined) : undefined;
        argv = sel.kind === "all" ? ["pnpm", "run", "test"] : selectiveCommand(testScript, sel.tests.map((t) => t.file).filter(isTestFile));
      }
      if (!argv) throw new Error(`no command for ${kind}`);
      const res = await ctx.broker.exec(sb, argv);
      const output = scrub(`$ ${argv.join(" ")}\n${res.stdout}\n${res.stderr}`);
      const summary: Record<string, unknown> = { timedOut: res.timedOut, selective: kind === "affected_tests" };
      if (kind === "tests" || kind === "affected_tests") summary.tests = parseTestSummary(output);
      if (kind === "typecheck") summary.diagnostics = parseTsc(output).slice(0, 200);
      if (kind === "lint") summary.diagnostics = parseEslint(output).slice(0, 200);
      let findings: { severity: string }[] = [];
      if (kind === "audit") {
        const audit = parseAudit(res.stdout);
        summary.audit = audit?.counts ?? null;
        if (audit) {
          findings = audit.advisories;
          await storeFindings(ctx, project, "audit", audit.advisories.map((a) => ({ fingerprint: createFp(`audit|${a.module}|${a.id}`), scanner: "audit", rule: `advisory:${a.id}`.slice(0, 120), severity: a.severity, title: `${a.module}: ${a.title}`.slice(0, 300), location: a.module, hint: a.fixAvailable ? "Update the package (pnpm update)." : a.url ?? "No fix is available yet.", is_credential: false })));
        }
      }
      if (kind === "tests") {
        const head = await ctx.broker.exec(sb, ["git", "rev-parse", "HEAD"]).catch(() => null);
        if (head?.exitCode === 0) summary.commit = head.stdout.trim();
      }
      await finish({ status: res.timedOut ? "error" : verdict(kind, res.exitCode, findings), exit_code: res.exitCode, summary, output, selection });
    } catch (e) {
      await finish({ status: "error", summary: { error: (e as Error).message.slice(0, 500) }, output: `The check couldn't run: ${(e as Error).message}` });
    }
  }
}

import { createHash } from "node:crypto";
function createFp(s: string): string { return createHash("sha256").update(s).digest("hex").slice(0, 32); }
