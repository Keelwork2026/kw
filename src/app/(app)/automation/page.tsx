import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState, StatusPill, timeAgo } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { WorkflowDiagram } from "@/components/automation/diagram";
import { WORKFLOW_TEMPLATES } from "@/lib/automation/templates";
import { connectorsUsed, describeTrigger, workflowHealth } from "@/lib/automation/describe";
import { INTEGRATIONS } from "@/lib/integrations/catalog";
import type { Definition } from "@/lib/automation/definition";
import { SectionPicker } from "@/components/section-picker";
import { createFromTemplate, runNow, setEnabled } from "../projects/[id]/automations/actions";

export const metadata = { title: "Automations" };

type View = "all" | "active" | "paused" | "attention";
const VIEWS: [View, string][] = [["all", "All"], ["active", "Active"], ["paused", "Paused"], ["attention", "Needs attention"]];

/** Every automation in the workspace: what's running, what's paused, what failed, what's next, and templates to start from. */
export default async function AutomationsHub({ searchParams }: { searchParams: Promise<{ view?: string; category?: string; to?: string; at?: string; q?: string }> }) {
  const sp = await searchParams;
  // Menu links to a project tab (e.g. the editor) come through here: choose the project first.
  if (sp.to) return <SectionPicker slug="automation" searchParams={sp} />;
  const view = (VIEWS.find(([v]) => v === sp.view)?.[0] ?? "all") as View;
  const { supabase, org, can } = await requireOrg();
  const { data: projects } = await supabase.from("projects").select("id, name").eq("org_id", org.id).neq("status", "archived").order("updated_at", { ascending: false });
  const ids = (projects ?? []).map((p) => p.id);
  const [{ data: workflows }, { data: runs }] = ids.length ? await Promise.all([
    supabase.from("workflows").select("id, project_id, name, trigger_kind, schedule, enabled, version, next_run_at, definition, updated_at").in("project_id", ids).order("updated_at", { ascending: false }),
    supabase.from("workflow_runs").select("id, project_id, workflow_id, status, trigger_kind, error, created_at, finished_at").in("project_id", ids).order("created_at", { ascending: false }).limit(200),
  ]) : [{ data: [] }, { data: [] }];
  const projectName = (id: string) => projects?.find((p) => p.id === id)?.name ?? "Project";
  const all = (workflows ?? []).map((w) => ({ ...w, ...workflowHealth(runs ?? [], w.id) }));
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const runsWeek = (runs ?? []).filter((r) => r.created_at >= weekAgo);
  const counts = { all: all.length, active: all.filter((w) => w.enabled).length, paused: all.filter((w) => !w.enabled).length, attention: all.filter((w) => w.health === "failing").length };
  const list = all.filter((w) => view === "all" || (view === "active" ? w.enabled : view === "paused" ? !w.enabled : w.health === "failing"));
  const upcoming = all.filter((w) => w.enabled && w.next_run_at).sort((a, b) => String(a.next_run_at).localeCompare(String(b.next_run_at))).slice(0, 5);
  const write = can("project.write"), manage = can("project.manage");
  const categories = [...new Set(WORKFLOW_TEMPLATES.map((t) => t.category))];
  const templates = WORKFLOW_TEMPLATES.filter((t) => !sp.category || t.category === sp.category);

  return (
    <>
      <PageHeader title="Automations" description="Workflows that run on a schedule, when a signed webhook arrives, or when you press Run — across all your projects." actions={projects?.length ? <a href="#templates" className="btn btn-primary">New automation</a> : null} />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Active", counts.active], ["Paused", counts.paused], ["Needs attention", counts.attention], ["Runs in the last 7 days", runsWeek.length]].map(([l, v]) => (
          <div key={String(l)} className="panel p-4"><dt className="text-sm text-muted">{l}</dt><dd className={`mt-1 text-2xl font-bold ${l === "Needs attention" && Number(v) > 0 ? "text-danger" : ""}`}>{v}</dd></div>
        ))}
      </dl>

      <section aria-labelledby="mine" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="mine" className="text-xl">My automations</h2>
          <nav aria-label="Filter automations" className="flex flex-wrap gap-1.5">
            {VIEWS.map(([v, l]) => <Link key={v} href={v === "all" ? "/automation" : `/automation?view=${v}`} aria-current={view === v ? "page" : undefined} className={`min-h-9 rounded-full border px-3 py-1.5 text-sm font-semibold ${view === v ? "border-accent bg-accent text-accent-contrast" : "border-border text-muted hover:text-text"}`}>{l} · {counts[v]}</Link>)}
          </nav>
        </div>
        {list.length ? (
          <ul className="mt-4 grid gap-4">
            {list.map((w) => (
              <li key={w.id} className="panel p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/projects/${w.project_id}/automations?edit=${w.id}#editor`} className="font-display text-lg font-bold hover:underline">{w.name}</Link>
                  <StatusPill status={w.enabled ? "live" : "paused"} />
                  {w.health === "failing" ? <span className="pill bg-[#fdecec] text-[#b42318]">Last run failed</span> : null}
                  <span className="text-xs text-muted">{projectName(w.project_id)} · {describeTrigger(w.trigger_kind, w.schedule)}{w.last ? ` · last run ${timeAgo(w.last.created_at)}` : " · never run"}</span>
                </div>
                <div className="mt-3 overflow-x-auto"><WorkflowDiagram trigger={w.trigger_kind} schedule={w.schedule} definition={w.definition as Definition} /></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/projects/${w.project_id}/automations?edit=${w.id}#editor`} className="btn btn-secondary min-h-10">Open</Link>
                  {manage ? (
                    <ActionForm action={setEnabled} submitLabel={w.enabled ? "Pause" : "Switch on"} submitClassName="btn btn-secondary min-h-10">
                      <input type="hidden" name="projectId" value={w.project_id} /><input type="hidden" name="workflowId" value={w.id} /><input type="hidden" name="enabled" value={w.enabled ? "0" : "1"} />
                    </ActionForm>
                  ) : null}
                  {write && w.trigger_kind !== "webhook" ? (
                    <ActionForm action={runNow} submitLabel="Run now" submitClassName="btn btn-secondary min-h-10">
                      <input type="hidden" name="projectId" value={w.project_id} /><input type="hidden" name="workflowId" value={w.id} />
                    </ActionForm>
                  ) : null}
                  <Link href={`/projects/${w.project_id}/automations#history`} className="btn btn-secondary min-h-10">History and logs</Link>
                </div>
              </li>
            ))}
          </ul>
        ) : all.length ? <p className="mt-4 text-sm text-muted">Nothing in this view. <Link className="font-semibold text-accent" href="/automation">Show all</Link></p>
          : <div className="mt-4"><EmptyState icon="workflow" title="No automations yet" action={projects?.length ? { label: "Start from a template", href: "#templates" } : { label: "Create a project first", href: "/new-project" }}>Automations do routine work for you: post new orders to Slack, email a weekly report, follow up a lead the next day. Each one has a trigger, steps, and optional conditions — and a log of every run.</EmptyState></div>}
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="upcoming" className="panel p-5">
          <h2 id="upcoming" className="text-lg">Coming up</h2>
          {upcoming.length ? (
            <ul className="mt-3 grid gap-2 text-sm">{upcoming.map((w) => <li key={w.id} className="flex justify-between gap-3"><span><strong>{w.name}</strong> <span className="text-muted">· {projectName(w.project_id)}</span></span><time dateTime={String(w.next_run_at)} className="shrink-0 text-muted">{String(w.next_run_at).slice(0, 16).replace("T", " ")} UTC</time></li>)}</ul>
          ) : <p className="mt-2 text-sm text-muted">No scheduled runs. Switch on an automation with a schedule to see its next run here.</p>}
        </section>
        <section aria-labelledby="history" className="panel p-5">
          <h2 id="history" className="text-lg">Recent runs</h2>
          {runs?.length ? (
            <ul className="mt-3 grid gap-2 text-sm">
              {runs.slice(0, 8).map((r) => (
                <li key={r.id} className="rounded-xl border border-border p-2.5">
                  <div className="flex flex-wrap items-center gap-2"><StatusPill status={r.status} /><span className="font-semibold">{all.find((w) => w.id === r.workflow_id)?.name ?? "Automation"}</span><span className="text-xs text-muted">{projectName(r.project_id)} · {r.trigger_kind} · {timeAgo(r.created_at)}</span>
                    <Link href={`/projects/${r.project_id}/automations#history`} className="ml-auto text-xs font-semibold text-accent">Logs</Link></div>
                  {r.error ? <p className="mt-1 text-xs text-danger">{r.error}</p> : null}
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-muted">No runs yet.</p>}
        </section>
      </div>

      <section id="templates" aria-labelledby="tpl" className="mt-10 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="tpl" className="text-xl">Start from a template</h2><p className="text-sm text-muted">Each one is saved as a draft in the project you choose. Edit the addresses and texts, then switch it on.</p></div>
          <nav aria-label="Template categories" className="flex flex-wrap gap-1.5">
            {["All", ...categories].map((c) => <Link key={c} href={c === "All" ? "/automation#templates" : `/automation?category=${encodeURIComponent(c)}#templates`} aria-current={(sp.category ?? "All") === c ? "page" : undefined} className={`min-h-9 rounded-full border px-3 py-1.5 text-sm font-semibold ${(sp.category ?? "All") === c ? "border-accent bg-accent text-accent-contrast" : "border-border text-muted hover:text-text"}`}>{c}</Link>)}
          </nav>
        </div>
        <ul className="mt-4 grid gap-4 lg:grid-cols-2">
          {templates.map((t) => {
            const needs = connectorsUsed(t.definition).map((id) => INTEGRATIONS.find((i) => i.id === id)!.name);
            return (
              <li key={t.key} className="panel flex flex-col p-5">
                <div className="flex items-start justify-between gap-2"><p className="font-semibold">{t.name}</p><span className="pill shrink-0 bg-surface-2 text-[11px]">{t.category}</span></div>
                <p className="mt-1 text-sm text-muted">{t.description}</p>
                <div className="mt-3 overflow-x-auto"><WorkflowDiagram trigger={t.trigger} schedule={t.schedule} definition={t.definition} compact /></div>
                <p className="mt-3 text-xs text-muted">{needs.length ? <>Needs: {needs.join(" and ")} — <Link href="/integrations" className="font-semibold text-accent">Connectors</Link></> : "No connectors needed."}</p>
                {write && projects?.length ? (
                  <ActionForm action={createFromTemplate} submitLabel="Add to project" submitClassName="btn btn-primary min-h-10" className="mt-auto flex flex-wrap items-end gap-2 pt-3 [&>div]:mt-0">
                    <input type="hidden" name="template" value={t.key} />
                    <label className="grid flex-1 gap-1 text-xs font-semibold text-muted">Project<select name="projectId" className="input min-h-10 text-sm font-normal text-text">{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                  </ActionForm>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
