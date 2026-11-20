import { loadProject } from "@/lib/project";
import { WORKFLOW_TEMPLATES } from "@/lib/automation/templates";
import { ActionForm } from "@/components/action-form";
import { EmptyState, Notice, StatusPill, timeAgo } from "@/components/page-header";
import { saveWorkflow, createFromTemplate, setEnabled, runNow, cancelRun, rotateWebhookSecret } from "./actions";

export const metadata = { title: "Automations" };

export default async function AutomationsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { id } = await params;
  const { edit } = await searchParams;
  const { supabase, project, can } = await loadProject(id);
  const [{ data: workflows }, { data: runs }, { data: endpoints }] = await Promise.all([
    supabase.from("workflows").select("id, name, trigger_kind, schedule, enabled, version, next_run_at, definition, updated_at").eq("project_id", project.id).order("created_at"),
    supabase.from("workflow_runs").select("id, workflow_id, status, trigger_kind, error, created_at, finished_at, attempts").eq("project_id", project.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("webhook_endpoints").select("id, workflow_id, rotated_at").eq("project_id", project.id),
  ]);
  const runIds = (runs ?? []).map((r) => r.id);
  const { data: steps } = runIds.length ? await supabase.from("workflow_run_steps").select("run_id, step_id, attempt, status, error, finished_at").in("run_id", runIds).order("id") : { data: [] };
  const editing = workflows?.find((w) => w.id === edit);
  const write = can("project.write"), manage = can("project.manage");
  const stuck = (runs ?? []).some((r) => r.status === "queued" && Date.now() - new Date(r.created_at).getTime() > 120_000);

  return (
    <div className="grid gap-6">
      {stuck ? <Notice>Some runs have been queued for more than two minutes. The automation runner (pnpm runner) may not be deployed yet; runs wait until it is.</Notice> : null}
      {write ? (
        <section className="panel p-5" aria-labelledby="starters">
          <h2 id="starters" className="text-lg">Start from a template</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {WORKFLOW_TEMPLATES.map((t) => (
              <ActionForm key={t.key} action={createFromTemplate} submitLabel="Use template" submitClassName="btn btn-secondary min-h-10" className="rounded-2xl border border-border p-4">
                <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="template" value={t.key} />
                <p className="font-semibold">{t.name}</p><p className="mt-1 text-sm text-muted">{t.description}</p>
              </ActionForm>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="wfs">
        <h2 id="wfs" className="mb-3 text-xl">Automations</h2>
        {workflows?.length ? (
          <ul className="grid gap-4">
            {workflows.map((w) => {
              const ep = endpoints?.find((e) => e.workflow_id === w.id);
              return (
                <li key={w.id} className="panel p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-bold">{w.name}</p>
                    <span className="pill bg-surface-2">{w.trigger_kind}{w.schedule ? ` · ${w.schedule} UTC` : ""}</span>
                    <StatusPill status={w.enabled ? "live" : "paused"} /><span className="sr-only">{w.enabled ? "on" : "off"}</span>
                    <span className="text-xs text-muted">v{w.version}{w.next_run_at ? ` · next ${new Date(w.next_run_at).toISOString().slice(0, 16).replace("T", " ")} UTC` : ""}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {write ? <a href={`?edit=${w.id}#editor`} className="btn btn-secondary min-h-10">Edit</a> : null}
                    {manage ? (
                      <ActionForm action={setEnabled} submitLabel={w.enabled ? "Switch off" : "Switch on"} submitClassName="btn btn-secondary min-h-10">
                        <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="workflowId" value={w.id} /><input type="hidden" name="enabled" value={w.enabled ? "0" : "1"} />
                      </ActionForm>
                    ) : null}
                    {write ? (
                      <ActionForm action={runNow} submitLabel="Run now" submitClassName="btn btn-primary min-h-10" className="flex items-end gap-2">
                        <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="workflowId" value={w.id} />
                        <label className="sr-only" htmlFor={`in-${w.id}`}>Test input (JSON)</label>
                        <input id={`in-${w.id}`} name="input" placeholder='Test body, e.g. {"order_id": 1}' className="input min-h-10 w-64 font-mono text-xs" />
                      </ActionForm>
                    ) : null}
                    {w.trigger_kind === "webhook" && manage ? (
                      <ActionForm action={rotateWebhookSecret} submitLabel={ep ? "Rotate signing secret" : "Create webhook URL"} submitClassName="btn btn-secondary min-h-10" confirm={ep ? "Senders using the old secret will be refused. Rotate?" : undefined}>
                        <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="workflowId" value={w.id} />
                      </ActionForm>
                    ) : null}
                  </div>
                  {ep ? <p className="mt-2 text-xs text-muted">Webhook URL: <code className="break-all">{`${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/api/hooks/${ep.id}`}</code> · secret rotated {timeAgo(ep.rotated_at)}</p> : null}
                </li>
              );
            })}
          </ul>
        ) : <EmptyState icon="workflow" title="No automations yet" action={{ label: "Start from a template", href: "#starters" }} secondary={{ label: "Write your own", href: "#editor" }}>Automations run on a schedule or a webhook — send a weekly report, sync records, or clean up old data — with a history of every run.</EmptyState>}
      </section>

      {write ? (
        <section id="editor" className="card" aria-labelledby="ed">
          <h2 id="ed" className="text-xl">{editing ? `Edit ${editing.name}` : "New automation"}</h2>
          <p className="mt-1 text-sm text-muted">Steps: http, email, slack, transform, delay. References: {"{{trigger.body.x}}"}, {"{{steps.id.output.y}}"}, {"{{secrets.NAME}}"} (secrets only in HTTP headers and bodies). Saving makes a draft.</p>
          <ActionForm action={saveWorkflow} submitLabel="Save draft" className="mt-4 grid gap-3">
            <input type="hidden" name="projectId" value={project.id} />
            {editing ? <input type="hidden" name="workflowId" value={editing.id} /> : null}
            <div className="grid gap-3 md:grid-cols-3">
              <div><label className="label" htmlFor="wf-name">Name</label><input id="wf-name" name="name" required maxLength={80} defaultValue={editing?.name ?? ""} className="input" /></div>
              <div><label className="label" htmlFor="wf-trigger">Trigger</label><select id="wf-trigger" name="trigger" defaultValue={editing?.trigger_kind ?? "manual"} className="input"><option value="manual">Manual</option><option value="webhook">Signed webhook</option><option value="schedule">Schedule</option></select></div>
              <div><label className="label" htmlFor="wf-schedule">Schedule (cron, UTC)</label><input id="wf-schedule" name="schedule" defaultValue={editing?.schedule ?? ""} placeholder="0 7 * * 1-5" className="input font-mono" /></div>
            </div>
            <div><label className="label" htmlFor="wf-def">Steps (JSON)</label>
              <textarea id="wf-def" name="definition" rows={14} spellCheck={false} className="input font-mono text-xs" defaultValue={JSON.stringify(editing?.definition ?? { steps: [{ id: "notify", type: "slack", text: "Hello from Keelwork" }] }, null, 2)} /></div>
          </ActionForm>
        </section>
      ) : null}

      <section className="panel p-5" aria-labelledby="history">
        <h2 id="history" className="text-lg">Run history</h2>
        {runs?.length ? (
          <ul className="mt-3 grid gap-3">
            {runs.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2"><StatusPill status={r.status} /><span>{workflows?.find((w) => w.id === r.workflow_id)?.name}</span><span className="text-muted">· {r.trigger_kind} · {timeAgo(r.created_at)}</span>
                  {write && ["queued", "running", "waiting"].includes(r.status) ? (
                    <ActionForm action={cancelRun} submitLabel="Cancel" submitClassName="btn btn-secondary min-h-8 px-3 text-xs"><input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="runId" value={r.id} /></ActionForm>
                  ) : null}</div>
                {r.error ? <p className="mt-1 text-danger">{r.error}</p> : null}
                <ol className="mt-2 grid gap-1 text-xs">
                  {(steps ?? []).filter((s) => s.run_id === r.id).map((s, i) => <li key={i}><code>{s.step_id}</code> attempt {s.attempt}: <strong>{s.status}</strong>{s.error ? ` — ${s.error}` : ""}</li>)}
                </ol>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-muted">No runs yet.</p>}
      </section>
    </div>
  );
}
