/**
 * Keelwork agent worker (`pnpm worker`).
 *
 * Polls every 3 seconds. For each leased build it seeds the starter
 * template into the project's sandbox, builds the task graph from the
 * approved plan and runs ready tasks (WORKER_CONCURRENCY at a time) through
 * gateway → protocol → policy → broker. It commits a Git checkpoint after
 * every finished task. The same process runs checks (checks.ts) and
 * deployments (deploy.ts).
 *
 * Needs: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * SANDBOX_BROKER_URL, SANDBOX_BROKER_TOKEN, AI_MODEL_CATALOG (+ its keys),
 * SECRETS_MASTER_KEYS, BRAVE_SEARCH_API_KEY, BRAVE_SEARCH_COST_MICROS.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createGateway } from "../../../src/lib/ai/gateway";
import { loadCatalog, routeFor } from "../../../src/lib/ai/catalog";
import { buildTaskGraph, newlyReady, AGENTS, type AgentId } from "../../../src/lib/agents/graph";
import { parsePlan } from "../../../src/lib/ai/plan";
import { brokerConfig, createBrokerClient, sandboxIdFor, type BrokerClient } from "../../../src/lib/sandbox/client";
import { loadTemplate } from "../../../src/lib/templates/load";
import { adaptTemplate } from "../../../src/lib/stack/adapt";
import { isBackend, isDeployTarget, migrationsDirFor, type BackendId } from "../../../src/lib/stack/backends";
import { loadMasterKeys } from "../../../src/lib/secrets/vault";
import { decryptProjectSecrets } from "../../../src/lib/secrets/load";
import { toDotenv } from "../../../src/lib/secrets/vault";
import { braveSearch, braveConfig, formatResultsForModel } from "../../../src/lib/research/brave";
import { safeRequest } from "../../../src/lib/import/safe-fetch";
import { runTask, type TaskDeps } from "./core";
import { processChecks } from "./checks";
import { processDeployments } from "./deploy";

const WORKER_ID = `worker-${randomUUID().slice(0, 8)}`;
const CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.WORKER_CONCURRENCY ?? 3) || 3));
const POLL_MS = 3000;
const GIT_AUTHOR = ["-c", "user.name=Keelwork Agents", "-c", "user.email=agents@keelwork.invalid"];

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export type WorkerContext = { db: SupabaseClient; broker: BrokerClient; workerId: string };

async function main() {
  const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const cfg = brokerConfig();
  if (!cfg) throw new Error("SANDBOX_BROKER_URL and SANDBOX_BROKER_TOKEN must be set");
  const broker = createBrokerClient(cfg);
  const ctx: WorkerContext = { db, broker, workerId: WORKER_ID };
  console.log(`[${WORKER_ID}] started; concurrency ${CONCURRENCY}`);

  let stopping = false;
  process.on("SIGTERM", () => { stopping = true; });
  process.on("SIGINT", () => { stopping = true; });

  while (!stopping) {
    try {
      const { data: runs, error } = await db.rpc("claim_agent_runs", { p_worker: WORKER_ID, p_limit: 1 });
      if (error) throw error;
      for (const run of runs ?? []) await processRun(ctx, run).catch((e) => failRun(db, run.id, e));
      await processChecks(ctx).catch((e) => console.error(`[${WORKER_ID}] checks:`, (e as Error).message));
      await processDeployments(ctx).catch((e) => console.error(`[${WORKER_ID}] deployments:`, (e as Error).message));
    } catch (e) {
      console.error(`[${WORKER_ID}] poll failed:`, (e as Error).message);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

async function failRun(db: SupabaseClient, runId: string, e: unknown) {
  const message = (e as Error)?.message ?? String(e);
  console.error(`[${WORKER_ID}] run ${runId} failed:`, message);
  await db.from("agent_runs").update({ status: "failed", error: message.slice(0, 1000), finished_at: new Date().toISOString(), worker: null }).eq("id", runId).eq("status", "running");
  await db.rpc("release_file_locks", { p_run: runId, p_task: null });
}

type RunRow = { id: string; project_id: string; org_id: string; plan_id: string | null; started_by: string | null };

async function processRun(ctx: WorkerContext, run: RunRow) {
  const { db, broker } = ctx;
  const { data: project } = await db.from("projects").select("id, org_id, name, backend, deploy_target, template_key").eq("id", run.project_id).single();
  if (!project) throw new Error("project not found");
  const backend: BackendId = isBackend(project.backend) ? project.backend : "supabase";
  const { data: planRow } = await db.from("plans").select("content").eq("id", run.plan_id).single();
  const parsed = parsePlan(JSON.stringify(planRow?.content ?? {}));
  if (!parsed.ok) throw new Error(`the approved plan is invalid: ${parsed.error}`);
  const sandbox = sandboxIdFor(project.id);

  // First visit: seed the template and create the task graph.
  const { count } = await db.from("tasks").select("id", { count: "exact", head: true }).eq("run_id", run.id);
  if (!count) {
    await broker.create(project.id);
    await db.from("sandboxes").upsert({ project_id: project.id, org_id: project.org_id, status: "running", container: sandbox }, { onConflict: "project_id" });
    const hasGit = await broker.exec(sandbox, ["git", "rev-parse", "--is-inside-work-tree"]).then((r) => r.exitCode === 0).catch(() => false);
    if (!hasGit) {
      const files = adaptTemplate(await loadTemplate("next-supabase"), {
        backend, deployTarget: isDeployTarget(project.deploy_target) ? project.deploy_target : "cloudflare", projectName: project.name,
      });
      for (const [path, content] of files) await broker.writeFile(sandbox, path, content);
      await broker.exec(sandbox, ["git", "init"]);
      await broker.exec(sandbox, ["git", "add", "-A"]);
      await broker.exec(sandbox, ["git", ...GIT_AUTHOR, "commit", "-m", "Keelwork starter template"]);
    }
    const graph = buildTaskGraph(parsed.plan);
    const { data: inserted, error } = await db.from("tasks").insert(graph.map((t) => ({
      run_id: run.id, org_id: run.org_id, project_id: run.project_id, key: t.key, agent: t.agent, title: t.title, status: t.deps.length ? "blocked" : "ready",
    }))).select("id, key");
    if (error) throw error;
    const idOf = new Map((inserted ?? []).map((r) => [r.key as string, r.id as string]));
    const edges = graph.flatMap((t) => t.deps.map((d) => ({ run_id: run.id, org_id: run.org_id, from_task: idOf.get(d), to_task: idOf.get(t.key) })));
    if (edges.length) await db.from("task_edges").insert(edges);
  }

  const catalog = loadCatalog();
  if (!catalog) throw new Error("AI isn't configured (AI_MODEL_CATALOG is empty)");
  const keys = loadMasterKeys(process.env.SECRETS_MASTER_KEYS);

  for (;;) {
    const { data: state } = await db.from("agent_runs").select("status").eq("id", run.id).single();
    if (state?.status !== "running") return; // paused or cancelled by a person

    const { data: tasks } = await db.from("tasks").select("id, key, agent, title, status, turns").eq("run_id", run.id);
    const { data: edges } = await db.from("task_edges").select("from_task, to_task").eq("run_id", run.id);
    const keyOf = new Map((tasks ?? []).map((t) => [t.id as string, t.key as string]));
    const deps = new Map<string, string[]>();
    for (const e of edges ?? []) deps.set(keyOf.get(e.to_task)!, [...(deps.get(keyOf.get(e.to_task)!) ?? []), keyOf.get(e.from_task)!]);
    const promote = newlyReady((tasks ?? []).map((t) => ({ key: t.key, status: t.status, deps: deps.get(t.key) ?? [] })));
    if (promote.length) await db.from("tasks").update({ status: "ready" }).eq("run_id", run.id).in("key", promote).eq("status", "blocked");

    const all = (tasks ?? []).map((t) => (promote.includes(t.key) ? { ...t, status: "ready" } : t));
    if (all.some((t) => t.status === "failed")) {
      await db.from("agent_runs").update({ status: "failed", error: "A task failed; see the task board.", finished_at: new Date().toISOString(), worker: null }).eq("id", run.id);
      await db.rpc("release_file_locks", { p_run: run.id, p_task: null });
      return;
    }
    if (all.length && all.every((t) => t.status === "done")) {
      await db.from("agent_runs").update({ status: "succeeded", finished_at: new Date().toISOString(), worker: null }).eq("id", run.id);
      await db.from("projects").update({ status: "draft" }).eq("id", run.project_id).eq("status", "building");
      await db.rpc("release_file_locks", { p_run: run.id, p_task: null });
      return;
    }
    const ready = all.filter((t) => t.status === "ready").slice(0, CONCURRENCY);
    if (ready.length === 0) {
      if (all.some((t) => t.status === "waiting_approval")) {
        await db.from("agent_runs").update({ status: "waiting_approval", worker: null }).eq("id", run.id).eq("status", "running");
      }
      return;
    }

    // Secrets for this project: decrypted only inside the worker, written to the
    // sandbox's .env.local, and scrubbed from everything the model and logs see.
    const secrets = keys ? await decryptProjectSecrets(db, project.id, "development", keys) : {};
    if (Object.keys(secrets).length) await broker.putEnv(sandbox, secrets);
    const secretValues = Object.values(secrets);

    await Promise.all(ready.map(async (task) => {
      await db.from("tasks").update({ status: "running" }).eq("id", task.id).eq("status", "ready");
      const agent = AGENTS.find((a) => a.id === task.agent)!;
      const { data: approvals } = await db.from("approvals").select("kind, details, status").eq("task_id", task.id);
      const approved = new Set((approvals ?? []).filter((a) => a.status === "approved").map((a) => String((a.details as { fingerprint?: string }).fingerprint ?? "")));
      const approvedPackages = new Set((approvals ?? []).filter((a) => a.status === "approved" && a.kind === "install_package").flatMap((a) => ((a.details as { packages?: string[] }).packages ?? [])));
      const approvedHosts = new Set((approvals ?? []).filter((a) => a.status === "approved" && a.kind === "fetch_host").map((a) => String((a.details as { host?: string }).host)));

      const gateway = createGateway({
        catalog, env: process.env,
        assertCanSpend: async (estimate) => {
          const { error } = await db.rpc("assert_can_spend", { p_org: run.org_id, p_estimate_micros: estimate });
          if (error) throw new Error(`Spending stopped: ${error.message}`);
        },
        meter: async (u) => {
          await db.from("usage_events").insert({ org_id: run.org_id, project_id: run.project_id, kind: "ai", route: u.route, model: u.model, input_tokens: u.inputTokens, output_tokens: u.outputTokens, cost_micros: u.costMicros, reference: `task:${task.id}` });
        },
      });

      const taskDeps: TaskDeps = {
        complete: async (route, messages) => (await gateway.complete({ route, messages, json: true, maxOutputTokens: routeFor(catalog, route)[0]?.maxOutputTokens })).text,
        fs: {
          list: async (p) => (await broker.list(sandbox, p)).entries.map((e) => `${e.type === "dir" ? "d" : "f"} ${e.name}`).join("\n"),
          read: (p) => broker.readFile(sandbox, p),
          write: async (p, c) => { await broker.writeFile(sandbox, p, c); },
          remove: async (p) => { await broker.deleteFile(sandbox, p, true); },
        },
        exec: (argv, approvedNow) => broker.exec(sandbox, argv, approvedNow),
        acquireLock: async (path) => (await db.rpc("acquire_file_lock", { p_project: project.id, p_path: path, p_run: run.id, p_task: task.id, p_holder: `${WORKER_ID}:${task.key}` })).data === true,
        logToolCall: async (e) => {
          await db.from("tool_calls").insert({ org_id: run.org_id, project_id: run.project_id, run_id: run.id, task_id: task.id, agent: task.agent, tool: e.tool, args: e.args, decision: e.decision, reason: e.reason ?? null, result_summary: e.resultSummary ?? null });
        },
        requestApproval: async (r) => {
          await db.from("approvals").insert({ org_id: run.org_id, project_id: run.project_id, run_id: run.id, task_id: task.id, kind: r.kind, summary: r.summary, details: r.details });
        },
        search: async (query) => {
          const cfg = braveConfig(process.env);
          if (!cfg) return "Web search isn't configured on this installation.";
          const { error } = await db.rpc("assert_can_spend", { p_org: run.org_id, p_estimate_micros: cfg.costMicros });
          if (error) return `Search refused: ${error.message}`;
          const results = await braveSearch(cfg, { q: query });
          await db.from("usage_events").insert({ org_id: run.org_id, project_id: run.project_id, kind: "search", route: "web.search", model: "brave", cost_micros: cfg.costMicros, reference: `task:${task.id}` });
          return formatResultsForModel(results);
        },
        fetchUrl: async (url) => {
          const res = await safeRequest(url, { maxBytes: 2_000_000, timeoutMs: 15_000, accept: /^(text\/|application\/(json|xml))/ });
          return res.body.toString("utf8").slice(0, 60_000);
        },
        writeMigration: async (sql) => {
          const dir = migrationsDirFor(backend);
          if (!dir) throw new Error(`The ${backend} backend has no SQL migrations; describe collections in code instead.`);
          const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
          const path = `${dir}/${stamp}_${task.key.replace(/[^a-z0-9]+/g, "_")}.sql`;
          await broker.writeFile(sandbox, path, sql.endsWith("\n") ? sql : `${sql}\n`);
          return path;
        },
        deploy: async (environment) => {
          const { error } = await db.rpc("queue_deployment", { p_project: project.id, p_environment: environment, p_task: task.id });
          return error ? `Deployment refused: ${error.message}` : `A ${environment} deployment is queued.`;
        },
        sendMessage: async (text) => {
          const { data: thread } = await db.from("threads").select("id").eq("project_id", project.id).order("created_at").limit(1).single();
          if (thread) await db.from("messages").insert({ thread_id: thread.id, org_id: run.org_id, role: "assistant", content: text.slice(0, 4000), metadata: { agent: task.agent } });
        },
        secretValues,
        policy: { approvedPackages, approvedHosts },
        approved,
        providedSecrets: new Set(Object.keys(secrets)),
      };

      const outcome = await runTask({
        agent: task.agent as AgentId, route: agent.route, backend, title: task.title, key: task.key, planSummary: parsed.plan.summary, turnsUsed: task.turns ?? 0,
      }, taskDeps).catch((e) => ({ status: "failed" as const, error: (e as Error).message.slice(0, 1000), turns: task.turns ?? 0 }));

      if (outcome.status === "done") {
        await broker.exec(sandbox, ["git", "add", "-A"]);
        await broker.exec(sandbox, ["git", ...GIT_AUTHOR, "commit", "--allow-empty", "-m", `${task.key}: ${task.title}`.slice(0, 200)]);
        await db.from("tasks").update({ status: "done", summary: outcome.summary.slice(0, 4000), turns: outcome.turns }).eq("id", task.id);
      } else if (outcome.status === "waiting_approval") {
        await db.from("tasks").update({ status: "waiting_approval", turns: outcome.turns }).eq("id", task.id);
      } else {
        await db.from("tasks").update({ status: "failed", error: outcome.error, turns: outcome.turns }).eq("id", task.id);
      }
      await db.rpc("release_file_locks", { p_run: run.id, p_task: task.id });
    }));
  }
}

if (process.argv[1] && /worker\.ts$/.test(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
