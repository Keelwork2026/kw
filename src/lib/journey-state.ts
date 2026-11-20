import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JourneyState } from "./journey";

const OPEN_QA = ["new", "confirmed", "in_progress", "awaiting_review", "fixed", "awaiting_retest", "reopened"];
const LIVE = ["live", "done"];

/** Reads the real state a project's journey is computed from (all reads are RLS-scoped to the caller). */
export async function loadJourneyState(db: SupabaseClient, project: { id: string; description: string | null }, canWrite: boolean): Promise<JourneyState> {
  const id = project.id;
  const [thread, plan, run, sandbox, approvals, incidents, qaRun, qaIssues, deploys] = await Promise.all([
    db.from("threads").select("id").eq("project_id", id).order("created_at").limit(1).maybeSingle(),
    db.from("plans").select("status").eq("project_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("agent_runs").select("status, finished_at").eq("project_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("sandboxes").select("status").eq("project_id", id).maybeSingle(),
    db.from("approvals").select("id", { count: "exact", head: true }).eq("project_id", id).eq("status", "pending"),
    db.from("incidents").select("id", { count: "exact", head: true }).eq("project_id", id).in("status", ["open", "fix_proposed"]),
    db.from("qa_runs").select("finished_at, readiness").eq("project_id", id).eq("status", "completed").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("qa_issues").select("severity").eq("project_id", id).in("status", OPEN_QA).limit(500),
    db.from("deployments").select("environment, status, url").eq("project_id", id).in("status", LIVE).limit(20),
  ]);
  const userMessages = thread.data
    ? (await db.from("messages").select("id", { count: "exact", head: true }).eq("thread_id", thread.data.id).eq("role", "user")).count ?? 0
    : 0;
  const planStatus = plan.data?.status as string | undefined;
  const runStatus = run.data?.status as string | undefined;
  const sev = (qaIssues.data ?? []).map((r) => r.severity as string);
  const prod = (deploys.data ?? []).find((d) => d.environment === "production");
  return {
    projectId: id,
    described: Boolean(project.description?.trim()) || userMessages > 0,
    plan: planStatus === "approved" ? "approved" : planStatus === "draft" ? "draft" : "none",
    run: !runStatus ? "none" : ["queued", "running", "paused"].includes(runStatus) ? "active" : (runStatus as JourneyState["run"]),
    runFinishedAt: (run.data?.finished_at as string | null) ?? null,
    sandbox: (sandbox.data?.status as JourneyState["sandbox"] | undefined) ?? "none",
    pendingApprovals: approvals.count ?? 0,
    openIncidents: incidents.count ?? 0,
    qa: {
      lastRunAt: (qaRun.data?.finished_at as string | null) ?? null,
      release: ((qaRun.data?.readiness as { status?: string } | null)?.status) ?? null,
      openBlocking: sev.filter((s) => s === "critical" || s === "high").length,
      openOther: sev.filter((s) => s === "medium" || s === "low").length,
    },
    deploy: { preview: (deploys.data ?? []).some((d) => d.environment === "preview"), production: Boolean(prod), productionUrl: (prod?.url as string | null) ?? null },
    canWrite,
  };
}
