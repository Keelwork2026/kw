/**
 * Keelwork automation runner (`pnpm runner`).
 *
 * Leases runs with claim_workflow_runs (FOR UPDATE SKIP LOCKED), uses each
 * run's definition snapshot and resumes after its last finished step. Every
 * attempt is stored in workflow_run_steps with secrets scrubbed. On an
 * internal error it waits 60 s and retries. Housekeeping runs alongside:
 * scheduled runs, expire_support_grants, cleanup_rate_limits and analytics
 * salt rotation.
 *
 * Needs: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SECRETS_MASTER_KEYS.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { validateDefinition } from "../../src/lib/automation/definition";
import { runWorkflow, type PriorAttempt } from "../../src/lib/automation/engine";
import { nextRun } from "../../src/lib/automation/cron";
import { loadMasterKeys, type MasterKeys } from "../../src/lib/secrets/vault";
import { decryptProjectSecrets } from "../../src/lib/secrets/load";
import { createExecutors } from "./executors";

const RUNNER = `runner-${randomUUID().slice(0, 8)}`;
const POLL_MS = 2000;

async function enqueueScheduled(db: SupabaseClient) {
  const { data } = await db.from("workflows").select("id, project_id, org_id, definition, version, schedule, next_run_at")
    .eq("enabled", true).eq("trigger_kind", "schedule").lte("next_run_at", new Date().toISOString()).limit(50);
  for (const w of data ?? []) {
    let next: Date;
    try { next = nextRun(String(w.schedule), new Date()); } catch { await db.from("workflows").update({ enabled: false }).eq("id", w.id); continue; }
    // Move next_run_at first so two runners can't both enqueue the same slot.
    const { data: moved } = await db.from("workflows").update({ next_run_at: next.toISOString() }).eq("id", w.id).eq("next_run_at", w.next_run_at).select("id");
    if (!moved?.length) continue;
    await db.from("workflow_runs").insert({ workflow_id: w.id, project_id: w.project_id, org_id: w.org_id, trigger_kind: "schedule", input: { scheduled_for: w.next_run_at }, definition: w.definition, workflow_version: w.version });
  }
}

async function processRun(db: SupabaseClient, keys: MasterKeys | null, run: { id: string; project_id: string; definition: unknown; input: { body?: unknown } }) {
  const parsed = validateDefinition(run.definition);
  if (!parsed.ok) {
    await db.from("workflow_runs").update({ status: "failed", error: `invalid definition: ${parsed.errors[0]}`, finished_at: new Date().toISOString(), lease_owner: null }).eq("id", run.id);
    return;
  }
  const secrets = keys ? await decryptProjectSecrets(db, run.project_id, "production", keys) : {};
  const { data: prior } = await db.from("workflow_run_steps").select("step_id, attempt, status, output, error, finished_at").eq("run_id", run.id).order("id");
  const outcome = await runWorkflow({
    definition: parsed.definition,
    trigger: run.input,
    secrets,
    prior: (prior ?? []).map((p): PriorAttempt => ({ stepId: p.step_id, attempt: p.attempt, status: p.status, output: p.output, error: p.error ?? undefined, finishedAt: new Date(p.finished_at).getTime() })),
    executors: createExecutors(secrets),
    now: Date.now(),
  });
  if (outcome.records.length) {
    await db.from("workflow_run_steps").insert(outcome.records.map((r) => ({ run_id: run.id, step_id: r.stepId, attempt: r.attempt, status: r.status, output: r.output ?? null, error: r.error ?? null })));
  }
  const patch = outcome.status === "waiting"
    ? { status: "waiting", next_attempt_at: new Date(outcome.nextAttemptAt ?? Date.now() + 30_000).toISOString(), lease_owner: null, lease_expires_at: null }
    : { status: outcome.status, error: outcome.error ?? null, finished_at: new Date().toISOString(), lease_owner: null, lease_expires_at: null };
  await db.from("workflow_runs").update(patch).eq("id", run.id).eq("lease_owner", RUNNER);
}

let lastHousekeeping = 0;
async function housekeeping(db: SupabaseClient) {
  if (Date.now() - lastHousekeeping < 60_000) return;
  lastHousekeeping = Date.now();
  await db.rpc("expire_support_grants");
  await db.rpc("cleanup_rate_limits");
  await db.rpc("analytics_salt_for", { p_day: new Date().toISOString().slice(0, 10) });
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const keys = loadMasterKeys(process.env.SECRETS_MASTER_KEYS);
  console.log(`[${RUNNER}] started${keys ? "" : " (no SECRETS_MASTER_KEYS: steps that need secrets will fail)"}`);
  for (;;) {
    try {
      await housekeeping(db);
      await enqueueScheduled(db);
      const { data: runs, error } = await db.rpc("claim_workflow_runs", { p_worker: RUNNER, p_limit: 5, p_lease_seconds: 120 });
      if (error) throw error;
      for (const run of runs ?? []) {
        await processRun(db, keys, run).catch(async (e) => {
          console.error(`[${RUNNER}] run ${run.id}:`, (e as Error).message);
          // Internal error: hand the run back to be retried in 60 s.
          await db.from("workflow_runs").update({ status: "waiting", next_attempt_at: new Date(Date.now() + 60_000).toISOString(), lease_owner: null, lease_expires_at: null }).eq("id", run.id);
        });
      }
    } catch (e) {
      console.error(`[${RUNNER}] poll failed:`, (e as Error).message);
      await new Promise((r) => setTimeout(r, 60_000));
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

if (process.argv[1] && /automation-runner\/runner\.ts$/.test(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
