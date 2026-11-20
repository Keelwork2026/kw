/**
 * QA orchestrator. Claims QA runs and executes them for real:
 *  1. discovery from the project's files (profile, routes, journeys, plan)
 *  2. the project's own checks (tests, types, lint, build, audit, secrets, review)
 *  3. probes against the running app inside the project's sandbox (pages,
 *     endpoints, headers, assets, optional load and authorised pentest)
 *  4. a headless-browser suite when a browser runtime can run in the sandbox
 *  5. AI-simulated personas when AI is configured (always labelled simulated)
 * Then it stores results, reconciles issues (new / reopened / verified),
 * scores the run, compares it with the last one and works out readiness.
 * Anything that couldn't run is recorded as blocked or not run, never passed.
 */
import fs from "node:fs";
import path from "node:path";
import type { WorkerContext } from "./worker";
import { readProjectFiles, processChecks } from "./checks";
import { sandboxIdFor } from "../../../src/lib/sandbox/client";
import { createGateway } from "../../../src/lib/ai/gateway";
import { loadCatalog } from "../../../src/lib/ai/catalog";
import { discover, profileJson, type SourceFile } from "../../../src/lib/qa/discover";
import { accessibility, businessRules, fromChecks, functionalLive, journeys, load, mk, pentest, performance, responsive, securityLive, staticCode, ux, type ApiSnap, type AssetSnap, type BrowserSnap, type CheckRow, type LoadSnap, type PageSnap, type PentestSnap } from "../../../src/lib/qa/analyze";
import { DEFAULT_PERSONAS, evaluateWalk, parseWalk, personaPrompt, siteMap, type Persona } from "../../../src/lib/qa/personas";
import { categoriesFor, compare, priorityOf, readiness, scores, type IssueLite } from "../../../src/lib/qa/score";
import { CATEGORY_INFO, normalizeSettings, OPEN_ISSUE, type Category, type IssueStatus, type Mode, type Profile, type Result, type Scope } from "../../../src/lib/qa/types";

type Run = { id: string; project_id: string; org_id: string; mode: Mode; categories: string[]; scope: Scope; requested_by: string | null; trigger: string };
const SCRIPTS = path.resolve(process.cwd(), "services/agent-worker/qa-scripts");
const BASE = "http://127.0.0.1:3000";
class Stopped extends Error {}

export async function processQa(ctx: WorkerContext) {
  const { data: claimed, error } = await ctx.db.rpc("claim_qa_runs", { p_worker: ctx.workerId, p_limit: 1 });
  if (error) throw error;
  for (const run of (claimed ?? []) as Run[]) {
    const log: string[] = [];
    const note = (s: string) => { log.push(`${new Date().toISOString().slice(11, 19)} ${s}`); };
    try {
      await execute(ctx, run, note);
    } catch (e) {
      const stopped = e instanceof Stopped;
      note(stopped ? "Stopped at your request." : `Error: ${(e as Error).message}`);
      await ctx.db.from("qa_runs").update({ status: stopped ? "stopped" : "error", error: stopped ? "Stopped at your request; results so far are kept." : (e as Error).message.slice(0, 2000), finished_at: new Date().toISOString(), log: log.join("\n").slice(-200000) }).eq("id", run.id);
      continue;
    }
    await ctx.db.from("qa_runs").update({ log: log.join("\n").slice(-200000) }).eq("id", run.id);
  }
}

async function execute(ctx: WorkerContext, run: Run, note: (s: string) => void) {
  const db = ctx.db;
  const sb = sandboxIdFor(run.project_id);
  const cats = new Set<Category>((run.categories.length ? run.categories : categoriesFor(run.mode)) as Category[]);
  const want = (...c: Category[]) => c.some((x) => cats.has(x));
  const phases = ["Discovering the app", "Running project checks", "Starting the app", "Probing pages and endpoints", "Browser suite", "AI personas", "Analysing results", "Saving results"];
  let done = 0;
  const progress = async (current: string, extra: Record<string, unknown> = {}) => {
    const { data } = await db.from("qa_runs").select("stop_requested").eq("id", run.id).single();
    if (data?.stop_requested) throw new Stopped();
    await db.from("qa_runs").update({ progress: { phase: current, done, total: phases.length, ...extra } }).eq("id", run.id);
    note(current);
  };

  const { data: project } = await db.from("projects").select("id, org_id, name, description, backend").eq("id", run.project_id).single();
  if (!project) throw new Error("project not found");
  const { data: st } = await db.from("qa_settings").select("settings").eq("project_id", project.id).maybeSingle();
  const settings = normalizeSettings(st?.settings);

  // 1. Discovery
  await progress(phases[0]!);
  await ctx.broker.create(project.id).catch(() => undefined);
  const { files } = await readProjectFiles(ctx, project.id).catch(() => ({ files: [] as SourceFile[] }));
  if (!files.length) throw new Error("The project's sandbox has no files yet. Build the app first, then run QA.");
  const profile: Profile = discover(files, { backend: project.backend, description: `${project.name} ${project.description ?? ""}` });
  const commit = (await ctx.broker.exec(sb, ["git", "rev-parse", "HEAD"]).catch(() => null))?.stdout.trim() || null;
  await db.from("qa_runs").update({ profile: profileJson(profile), commit }).eq("id", run.id);
  note(`Profile: ${profile.appType} (${profile.framework}), ${profile.routes.length} routes, ${profile.forms.length} forms`);

  // Scope: only what changed since the last completed run.
  let changed: string[] | null = null;
  if (run.scope.changedOnly) {
    const { data: prev } = await db.from("qa_runs").select("commit").eq("project_id", project.id).eq("status", "completed").not("commit", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (prev?.commit && commit && prev.commit !== commit) {
      const diff = await ctx.broker.exec(sb, ["git", "diff", "--name-only", prev.commit, commit]).catch(() => null);
      if (diff?.exitCode === 0) changed = diff.stdout.split("\n").filter(Boolean);
      note(`Changed since last run: ${changed?.length ?? "unknown"} file(s)`);
    }
  }
  done++;

  // 2. Project checks (run inline by the same worker)
  await progress(phases[1]!);
  const kinds = [...(want("build") ? ["tests", "typecheck", "lint", "build"] : []), ...(want("security") ? ["secrets", "review", "audit"] : []), ...(want("regression") && changed?.length ? ["affected_tests"] : [])];
  const since = new Date().toISOString();
  if (kinds.length) {
    for (const k of kinds) {
      const { data: active } = await db.from("check_runs").select("id").eq("project_id", project.id).eq("kind", k).in("status", ["queued", "running"]).maybeSingle();
      if (!active) await db.from("check_runs").insert({ project_id: project.id, org_id: project.org_id, kind: k, requested_by: run.requested_by, requested_by_agent: false });
    }
    const deadline = Date.now() + 25 * 60_000;
    while (Date.now() < deadline) {
      await processChecks(ctx).catch((e) => note(`checks: ${(e as Error).message}`));
      const { data: pending } = await db.from("check_runs").select("id").eq("project_id", project.id).in("kind", kinds).in("status", ["queued", "running"]);
      if (!pending?.length) break;
      await progress(phases[1]!, { waiting: pending.length });
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  const { data: checkRows } = kinds.length ? await db.from("check_runs").select("kind, status, exit_code, summary, output, finished_at, created_at").eq("project_id", project.id).in("kind", kinds).gte("created_at", since).order("created_at", { ascending: false }) : { data: [] };
  const latest = new Map<string, CheckRow>();
  for (const r of (checkRows ?? []) as (CheckRow & { created_at: string })[]) if (!latest.has(r.kind)) latest.set(r.kind, r);
  done++;

  // 3. Start the app and probe it
  await progress(phases[2]!);
  let live = false;
  let liveReason = "";
  try {
    await ctx.broker.serve(sb).catch(() => undefined);
    // QA files live in .keelwork/, which ignores itself so they're never committed.
    await ctx.broker.writeFile(sb, ".keelwork/.gitignore", "*\n");
    await ctx.broker.writeFile(sb, ".keelwork/qa/wait.mjs", `for (let i = 0; i < 60; i++) { try { const r = await fetch(${JSON.stringify(BASE)}, { signal: AbortSignal.timeout(5000) }); if (r.status < 600) process.exit(0); } catch {} await new Promise((r) => setTimeout(r, 2000)); } process.exit(1);\n`);
    const wait = await ctx.broker.exec(sb, ["node", ".keelwork/qa/wait.mjs"]);
    live = wait.exitCode === 0;
    if (!live) liveReason = "The app's dev server didn't respond within 2 minutes. Open the project, start the sandbox and check the build log.";
  } catch (e) {
    liveReason = `The sandbox isn't available: ${(e as Error).message}`;
  }
  done++;

  await progress(phases[3]!);
  let probe: { pages: PageSnap[]; apis: ApiSnap[]; assets: AssetSnap[]; notFound: PageSnap | null; load: LoadSnap | null; pentest?: PentestSnap } = { pages: [], apis: [], assets: [], notFound: null, load: null };
  const changedRoutes = changed ? profile.routes.filter((r) => changed!.includes(r.file)) : null;
  const pagePaths = ["/", ...profile.routes.filter((r) => r.kind === "page" && !r.dynamic && (!changedRoutes || changedRoutes.some((c) => c.path === r.path))).map((r) => r.path), ...(run.scope.pages ?? [])];
  const endpoints = profile.routes.filter((r) => r.kind === "api" && r.methods?.length && (!run.scope.endpoints?.length || run.scope.endpoints.includes(r.path)) && (!changedRoutes || changedRoutes.some((c) => c.path === r.path))).map((r) => ({ path: r.path, methods: r.methods! }));
  const pentestOn = want("pentest") && !!settings.pentestAuthorized;
  if (live) {
    const config = {
      base: BASE, paths: [...new Set(pagePaths)], follow: !run.scope.pages?.length, maxPages: settings.maxPages, timeoutMs: 20_000,
      excluded: [...settings.excludedRoutes, ...settings.excludedEndpoints], endpoints: want("api", "security", "performance") ? endpoints : [],
      active: settings.activeSecurity, pentest: pentestOn,
      load: want("load") && settings.load.enabled ? { concurrency: settings.load.concurrency, seconds: settings.load.seconds } : null,
      browserPaths: [...new Set(pagePaths)].slice(0, 6), viewports: settings.viewports,
    };
    await ctx.broker.writeFile(sb, ".keelwork/qa/config.json", JSON.stringify(config));
    await ctx.broker.writeFile(sb, ".keelwork/qa/probe.mjs", fs.readFileSync(path.join(SCRIPTS, "probe.mjs"), "utf8"));
    const r = await ctx.broker.exec(sb, ["node", ".keelwork/qa/probe.mjs"]);
    note(r.stdout.trim().slice(-300) || r.stderr.trim().slice(-300));
    if (r.exitCode === 0) probe = JSON.parse(await ctx.broker.readFile(sb, ".keelwork/qa/out.json"));
    else { live = false; liveReason = `The probe couldn't run: ${r.stderr.trim().split("\n").at(-1)?.slice(0, 200) ?? "unknown error"}`; }
  }
  done++;

  // 4. Browser suite (needs the browser sandbox image; never installed silently)
  await progress(phases[4]!);
  let browser: BrowserSnap = { available: false, reason: live ? "Browser checks weren't selected for this run." : liveReason, pages: [] };
  if (live && want("browser", "responsive", "crossbrowser", "performance", "accessibility")) {
    await ctx.broker.writeFile(sb, ".keelwork/qa/browser.mjs", fs.readFileSync(path.join(SCRIPTS, "browser.mjs"), "utf8"));
    const r = await ctx.broker.exec(sb, ["node", ".keelwork/qa/browser.mjs"]).catch((e) => ({ exitCode: 1, stdout: "", stderr: String((e as Error).message), timedOut: false }));
    note(r.stdout.trim().slice(-300) || r.stderr.trim().slice(-300));
    try { browser = JSON.parse(await ctx.broker.readFile(sb, ".keelwork/qa/browser.json")); } catch { browser = { available: false, reason: `The browser suite didn't produce results (${r.stderr.trim().split("\n").at(-1)?.slice(0, 160) ?? "no output"}).`, pages: [] }; }
  }
  done++;

  // 5. AI personas
  await progress(phases[5]!);
  const personaResults: Result[] = [];
  if (want("personas")) {
    const catalog = loadCatalog();
    if (!catalog) personaResults.push(mk({ key: "personas:ai", name: "AI persona testing", category: "personas", method: "simulated", objective: "Simulated people try to reach goals through the real pages.", expected: "Personas run", actual: "AI isn't configured on this Keelwork installation, so no personas ran.", status: "blocked", severity: "info" }));
    else if (!live || !probe.pages.length) personaResults.push(mk({ key: "personas:ai", name: "AI persona testing", category: "personas", method: "simulated", objective: "Simulated people try to reach goals through the real pages.", expected: "Personas run", actual: `No pages to walk through: ${liveReason || "nothing was crawled"}`, status: "blocked", severity: "info" }));
    else {
      const gateway = createGateway({
        catalog, env: process.env,
        assertCanSpend: async (estimate) => { const { error } = await db.rpc("assert_can_spend", { p_org: run.org_id, p_estimate_micros: estimate }); if (error) throw new Error(`Spending stopped: ${error.message}`); },
        meter: async (u) => { await db.from("usage_events").insert({ org_id: run.org_id, project_id: run.project_id, kind: "ai", route: u.route, model: u.model, input_tokens: u.inputTokens, output_tokens: u.outputTokens, cost_micros: u.costMicros, reference: `qa:${run.id}` }); },
      });
      const { data: custom } = await db.from("qa_personas").select("name, description, goal").eq("project_id", project.id).limit(5);
      const personas: Persona[] = [...((custom ?? []) as Persona[]), ...DEFAULT_PERSONAS].slice(0, 5);
      const map = siteMap(probe.pages);
      for (const p of personas) {
        const prompt = personaPrompt(p, map, project.name);
        try {
          const res = await gateway.complete({ route: "chat", json: true, temperature: 0.4, maxOutputTokens: 1200, messages: [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }] });
          personaResults.push(evaluateWalk(p, parseWalk(res.text), map));
        } catch (e) {
          personaResults.push(mk({ key: `persona:${p.name}`, name: `Persona: ${p.name}`, category: "personas", method: "simulated", objective: p.goal, expected: "Reaches the goal", actual: `The AI call failed: ${(e as Error).message.slice(0, 200)}`, status: "blocked", severity: "info" }));
        }
      }
    }
  }
  done++;

  // 6. Analyse
  await progress(phases[6]!);
  const blocked = (category: Category, why: string) => mk({ key: `blocked:${category}`, name: `${CATEGORY_INFO[category].label} checks`, category, method: "automated", objective: CATEGORY_INFO[category].about, expected: "Checks run against the running app", actual: why, status: "blocked", severity: "info" });
  const all: Result[] = [];
  if (want("build", "security", "regression")) all.push(...fromChecks([...latest.values()]));
  all.push(...staticCode(files, profile).filter((r) => cats.has(r.category)));
  if (want("logic")) all.push(...businessRules(profile));
  if (live) {
    if (want("functional", "errors")) all.push(...functionalLive(probe.pages, profile.routes, probe.notFound ?? undefined).filter((r) => cats.has(r.category)));
    if (want("accessibility")) all.push(...accessibility(probe.pages));
    if (want("security", "api", "performance")) all.push(...securityLive(probe.pages, probe.apis, profile.routes, BASE.startsWith("https")).filter((r) => cats.has(r.category)));
    if (want("performance")) all.push(...performance(probe.pages, probe.assets, browser));
    if (want("load")) all.push(...load(probe.load, settings.load.enabled ? "The load test didn't produce measurements." : "Load testing is off in this project's QA settings."));
    if (want("responsive", "crossbrowser", "browser", "accessibility")) all.push(...responsive(probe.pages, browser).filter((r) => cats.has(r.category)));
    if (want("ux", "content")) all.push(...ux(probe.pages, profile).filter((r) => cats.has(r.category)));
    if (want("pentest")) all.push(...pentest(probe.pentest ?? null, settings.pentestAuthorized));
  } else {
    for (const c of ["functional", "accessibility", "performance", "responsive", "ux", "api", "errors", "browser", "crossbrowser", "load", "pentest", "journeys", "content"] as Category[]) if (cats.has(c)) all.push(blocked(c, liveReason));
  }
  const journeyOut = live && want("journeys") ? journeys(profile, probe.pages) : { results: [], outcomes: [] };
  all.push(...journeyOut.results, ...personaResults);
  for (const c of cats) if (!all.some((r) => r.category === c)) all.push(mk({ key: `none:${c}`, name: `${CATEGORY_INFO[c].label} checks`, category: c, method: "automated", objective: CATEGORY_INFO[c].about, expected: "Applicable checks", actual: c === "regression" && !changed ? "No earlier run with a different version to compare against." : c === "integration" ? "No third-party integrations were found in this project." : c === "database" ? "No database migrations were found." : "No checks apply to this app for this category.", status: "skipped", severity: "info" }));
  done++;

  // 7. Save results and reconcile issues
  await progress(phases[7]!, { results: all.length });
  const { data: existing } = await db.from("qa_issues").select("id, ref, fingerprint, status, test_key, history").eq("project_id", project.id);
  const byFp = new Map((existing ?? []).map((i) => [i.fingerprint as string, i]));
  let nextRef = Math.max(0, ...(existing ?? []).map((i) => i.ref as number)) + 1;
  const journeyCritical = new Set(journeyOut.outcomes.flatMap((o) => o.steps.map((s) => s.page).filter(Boolean)) as string[]);
  const now = new Date().toISOString();
  const issueIdForKey = new Map<string, string>();
  for (const r of all.filter((x) => x.issue)) {
    const f = r.issue!;
    const prior = byFp.get(f.fingerprint);
    const fields = { title: f.title.slice(0, 300), category: f.category, rule: f.rule, test_key: r.key, severity: f.severity, priority: priorityOf(f.severity, f.confidence, !!f.target && journeyCritical.has(f.target)), confidence: f.confidence, description: f.description.slice(0, 2000), impact: f.impact.slice(0, 1000), recommendation: f.recommendation.slice(0, 2000), verify: f.verify.slice(0, 1000), target: f.target?.slice(0, 400) ?? null, wcag: f.wcag ?? null, evidence: f.evidence, last_run: run.id, last_seen: now, updated_at: now };
    if (!prior) {
      const { data } = await db.from("qa_issues").insert({ ...fields, ref: nextRef++, project_id: project.id, org_id: project.org_id, fingerprint: f.fingerprint, first_run: run.id, status: "new" }).select("id").single();
      if (data) issueIdForKey.set(r.key, data.id as string);
    } else {
      const regress = ["verified", "fixed", "awaiting_retest"].includes(prior.status as string);
      const status: IssueStatus = regress ? "reopened" : (prior.status as IssueStatus);
      await db.from("qa_issues").update({ ...fields, status, history: regress ? [...(prior.history as unknown[]), { at: now, by: null, from: prior.status, to: "reopened", note: `Failed again in QA run ${run.id.slice(0, 8)}` }] : prior.history }).eq("id", prior.id);
      issueIdForKey.set(r.key, prior.id as string);
    }
  }
  // Open issues whose check ran and now passes are verified by this run.
  const passedKeys = new Set(all.filter((r) => r.status === "passed").map((r) => r.key));
  for (const i of existing ?? []) {
    if (OPEN_ISSUE.includes(i.status as IssueStatus) && i.test_key && passedKeys.has(i.test_key as string)) {
      await db.from("qa_issues").update({ status: "verified", updated_at: now, last_run: run.id, history: [...(i.history as unknown[]), { at: now, by: null, from: i.status, to: "verified", note: `Check passed in QA run ${run.id.slice(0, 8)}` }] }).eq("id", i.id);
    }
  }
  const rows = all.map((r) => ({ run_id: run.id, project_id: project.id, org_id: project.org_id, key: r.key.slice(0, 400), name: r.name.slice(0, 400), category: r.category, method: r.method, objective: r.objective, steps: r.steps, expected: r.expected, actual: r.actual.slice(0, 4000), status: r.status, severity: r.severity, target: r.target ?? null, evidence: r.evidence, duration_ms: r.durationMs ?? null, issue_id: issueIdForKey.get(r.key) ?? null }));
  const seen = new Set<string>();
  const unique = rows.filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true)));
  for (let i = 0; i < unique.length; i += 200) {
    const { error } = await db.from("qa_results").insert(unique.slice(i, i + 200));
    if (error) throw new Error(`couldn't save results: ${error.message}`);
  }

  // 8. Score, compare, readiness
  const sc = scores(all, profile.appType, settings);
  const { data: prevRun } = await db.from("qa_runs").select("id, scores").eq("project_id", project.id).eq("status", "completed").neq("id", run.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  let comparison = null;
  if (prevRun) {
    const { data: prevResults } = await db.from("qa_results").select("key, name, category, method, status, severity, actual").eq("run_id", prevRun.id);
    const c = compare((prevResults ?? []) as unknown as Result[], all, (prevRun.scores as { overall?: { value: number | null } } | null)?.overall?.value ?? null, sc.overall.value);
    const brief = (rs: Result[]) => rs.slice(0, 50).map((r) => ({ key: r.key, name: r.name, category: r.category, severity: r.severity }));
    comparison = { previousRun: prevRun.id, newFailures: brief(c.newFailures), fixed: brief(c.fixed), stillFailing: brief(c.stillFailing), newTests: c.newTests.length, removed: c.removed.length, scoreDelta: c.scoreDelta };
  }
  const { data: issuesNow } = await db.from("qa_issues").select("title, severity, status, category, accepted_expires").eq("project_id", project.id);
  const rd = readiness({ runStatus: "completed", results: all, issues: (issuesNow ?? []) as IssueLite[], settings, overall: sc.overall.value });
  const counts = Object.fromEntries(["passed", "failed", "blocked", "skipped", "not_run"].map((s) => [s, all.filter((r) => r.status === s).length]));
  await db.from("qa_runs").update({
    status: "completed", finished_at: new Date().toISOString(), scores: { ...sc, counts }, readiness: rd, comparison,
    outcomes: { journeys: journeyOut.outcomes, browser: { available: browser.available, engine: browser.engine ?? null, reason: browser.reason ?? null, shots: browser.pages.filter((p) => p.screenshot).map((p) => ({ path: p.path, viewport: p.viewport, screenshot: p.screenshot })) }, live: { ok: live, reason: liveReason || null, pages: probe.pages.length, endpoints: probe.apis.length } },
    progress: { phase: "Done", done: phases.length, total: phases.length, results: all.length },
  }).eq("id", run.id);
  note(`Done: ${counts.passed} passed, ${counts.failed} failed, ${(counts.blocked ?? 0) + (counts.not_run ?? 0) + (counts.skipped ?? 0)} not run. Release status: ${rd.status}.`);
}
