import Link from "next/link";
import { loadProject } from "@/lib/project";
import { normalizeSettings, type Result, type ReleaseStatus } from "@/lib/qa/types";
import { AutoRefresh } from "@/components/qa/auto-refresh";
import { Overview, PlanView, TestsView, IssuesView, IssueDetail, JourneysView, PersonasView, ResponsiveView, HistoryView, ReportsView, ReadinessView, SettingsView, LogView, type RunRow, type IssueRow, type Ctx } from "./views";

export const metadata = { title: "Quality Assurance" };

const VIEWS = [
  ["overview", "Overview"], ["plan", "Test plan"], ["tests", "Results"], ["issues", "Issues"], ["journeys", "Journeys"], ["personas", "Personas"],
  ["responsive", "Devices"], ["history", "History"], ["readiness", "Release"], ["reports", "Reports"], ["settings", "Settings"],
] as const;

type SP = { view?: string; category?: string; status?: string; severity?: string; q?: string; sort?: string; issue?: string; run?: string; a?: string; b?: string; group?: string };

export default async function QaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;
  const view = VIEWS.some(([k]) => k === sp.view) || sp.view === "log" ? sp.view! : "overview";
  const { supabase, project, can } = await loadProject(id);
  const [{ data: runs }, { data: issues }, { data: st }, { data: personas }, { data: sandbox }] = await Promise.all([
    supabase.from("qa_runs").select("id, mode, status, trigger, categories, scope, progress, scores, readiness, comparison, commit, error, created_at, started_at, finished_at, approved_at, approval_note, stop_requested").eq("project_id", project.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("qa_issues").select("id, ref, fingerprint, title, category, rule, test_key, severity, priority, confidence, status, description, impact, recommendation, verify, target, wcag, evidence, history, accepted_reason, accepted_expires, accepted_at, first_run, last_run, last_seen, created_at, updated_at").eq("project_id", project.id).order("ref", { ascending: false }).limit(1000),
    supabase.from("qa_settings").select("settings, updated_at").eq("project_id", project.id).maybeSingle(),
    supabase.from("qa_personas").select("id, name, description, goal, created_at").eq("project_id", project.id).order("created_at"),
    supabase.from("sandboxes").select("status").eq("project_id", project.id).maybeSingle(),
  ]);
  const allRuns = (runs ?? []) as RunRow[];
  const active = allRuns.find((r) => r.status === "queued" || r.status === "running") ?? null;
  const latest = allRuns.find((r) => r.status === "completed") ?? allRuns.find((r) => r.status !== "queued" && r.status !== "running") ?? null;
  const selectedRunId = sp.run && allRuns.some((r) => r.id === sp.run) ? sp.run : latest?.id;
  const needResults = ["overview", "tests", "responsive", "readiness", "plan", "personas", "journeys"].includes(view);
  const { data: results } = needResults && selectedRunId ? await supabase.from("qa_results").select("key, name, category, method, objective, steps, expected, actual, status, severity, target, evidence, issue_id").eq("run_id", selectedRunId).limit(3000) : { data: [] };
  const { data: detailRun } = selectedRunId && ["overview", "plan", "journeys", "responsive", "log", "readiness"].includes(view) ? await supabase.from("qa_runs").select("id, profile, outcomes, log").eq("id", selectedRunId).maybeSingle() : { data: null };
  const settings = normalizeSettings(st?.settings);
  const ctx: Ctx = {
    project: { id: project.id, name: project.name }, can: { write: can("project.write"), manage: can("project.manage") },
    runs: allRuns, active, latest, selectedRunId: selectedRunId ?? null,
    results: (results ?? []) as (Result & { issue_id: string | null })[], issues: (issues ?? []) as IssueRow[], settings,
    personas: (personas ?? []) as { id: string; name: string; description: string; goal: string }[],
    detail: detailRun as { id: string; profile: unknown; outcomes: unknown; log: string | null } | null,
    sandboxRunning: sandbox?.status === "running", sp,
  };
  const release = ((active ? { status: "in_progress" } : latest?.readiness) as { status?: ReleaseStatus } | null)?.status ?? "not_tested";
  const base = `/projects/${project.id}/qa`;
  const openCount = ctx.issues.filter((i) => ["new", "confirmed", "in_progress", "awaiting_review", "fixed", "awaiting_retest", "reopened"].includes(i.status)).length;

  return (
    <div className="grid gap-6">
      <AutoRefresh active={!!active} />
      <nav aria-label="Quality assurance" className="-mx-1 overflow-x-auto">
        <ul className="flex w-max gap-1 px-1">
          {VIEWS.map(([k, label]) => (
            <li key={k}>
              <Link href={k === "overview" ? base : `${base}?view=${k}`} aria-current={view === k ? "page" : undefined} className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ${view === k ? "bg-surface-2 text-text" : "text-muted hover:text-text"}`}>
                {label}{k === "issues" && openCount ? <span className="rounded-full bg-danger/15 px-1.5 text-[11px] text-danger">{openCount}</span> : null}{k === "readiness" ? <span className="sr-only"> (status: {release})</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {view === "overview" && <Overview ctx={ctx} />}
      {view === "plan" && <PlanView ctx={ctx} />}
      {view === "tests" && <TestsView ctx={ctx} />}
      {view === "issues" && (sp.issue ? <IssueDetail ctx={ctx} id={sp.issue} /> : <IssuesView ctx={ctx} />)}
      {view === "journeys" && <JourneysView ctx={ctx} />}
      {view === "personas" && <PersonasView ctx={ctx} />}
      {view === "responsive" && <ResponsiveView ctx={ctx} />}
      {view === "history" && <HistoryView ctx={ctx} />}
      {view === "readiness" && <ReadinessView ctx={ctx} />}
      {view === "reports" && <ReportsView ctx={ctx} />}
      {view === "settings" && <SettingsView ctx={ctx} />}
      {view === "log" && <LogView ctx={ctx} />}
    </div>
  );
}
