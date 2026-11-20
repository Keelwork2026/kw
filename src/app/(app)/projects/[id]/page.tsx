import Link from "next/link";
import { loadProject } from "@/lib/project";
import { ActionForm } from "@/components/action-form";
import { StatusPill, Notice, timeAgo } from "@/components/page-header";
import { PlanView } from "@/components/builder/plan-view";
import { AutoRefresh } from "@/components/builder/auto-refresh";
import { PreviewPane } from "@/components/builder/preview-pane";
import { parsePlan } from "@/lib/ai/plan";
import { serverCatalog } from "@/lib/ai/server";
import { AGENTS } from "@/lib/agents/graph";
import { BACKENDS, DEPLOY_TARGETS } from "@/lib/stack/backends";
import { brokerConfig } from "@/lib/sandbox/client";
import { previewLinkFor } from "@/lib/preview/link";
import { NextSteps } from "@/components/project-journey";
import { loadJourneyState } from "@/lib/journey-state";
import { suggestions } from "@/lib/journey";
import { sendMessage, requestPlan, approvePlan, decideApproval, controlRun, setStack, startSandbox } from "./actions";

export const metadata = { title: "Builder" };

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, project, can, readOnly } = await loadProject(id);
  const writable = can("project.write");

  const { data: thread } = await supabase.from("threads").select("id").eq("project_id", project.id).order("created_at").limit(1).maybeSingle();
  const [messages, plans, runs, approvals, sandbox, anyRun] = await Promise.all([
    supabase.from("messages").select("id, role, content, created_at, metadata").eq("thread_id", thread?.id ?? "00000000-0000-0000-0000-000000000000").order("created_at").limit(100),
    supabase.from("plans").select("id, content, status, created_at").eq("project_id", project.id).order("created_at", { ascending: false }).limit(1),
    supabase.from("agent_runs").select("id, status, error, created_at, started_at, finished_at").eq("project_id", project.id).order("created_at", { ascending: false }).limit(1),
    supabase.from("approvals").select("id, kind, summary, details, requested_at, expires_at").eq("project_id", project.id).eq("status", "pending").order("requested_at"),
    supabase.from("sandboxes").select("status, error, updated_at").eq("project_id", project.id).maybeSingle(),
    supabase.from("agent_runs").select("id", { count: "exact", head: true }).eq("project_id", project.id),
  ]);
  const run = runs.data?.[0];
  const { data: tasks } = run ? await supabase.from("tasks").select("id, key, agent, title, status, summary, error, turns").eq("run_id", run.id).order("created_at") : { data: [] };
  const latestPlan = plans.data?.[0];
  const parsed = latestPlan ? parsePlan(JSON.stringify(latestPlan.content)) : null;
  const activeRun = run && ["queued", "running", "waiting_approval", "paused"].includes(run.status);
  const stackLocked = (anyRun.count ?? 0) > 0;
  const aiReady = serverCatalog().catalog !== null;
  const brokerReady = brokerConfig() !== null;
  const preview = sandbox.data?.status === "running" ? previewLinkFor(project.id) : null;
  const inspect = preview ? previewLinkFor(project.id, "/?kw-inspect=1") : null;
  const lastMsg = messages.data?.at(-1);
  const next = project.status === "archived" ? [] : suggestions(await loadJourneyState(supabase, project, writable));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <AutoRefresh active={Boolean(activeRun)} />
      {next.length || !readOnly ? <div className="xl:col-span-2"><NextSteps items={next} /></div> : null}
      <div className="grid content-start gap-6">
        {!aiReady ? <Notice>AI isn&apos;t configured on this installation (AI_MODEL_CATALOG), so the planner can&apos;t answer yet. Your messages are still saved.</Notice> : null}

        {!stackLocked && writable ? (
          <section className="panel p-5" aria-labelledby="stack">
            <h2 id="stack" className="text-lg">Stack</h2>
            <p className="text-sm text-muted">Choose before the first build. It can&apos;t change afterwards.</p>
            <ActionForm action={setStack} submitLabel="Save stack" submitClassName="btn btn-secondary" className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="projectId" value={project.id} />
              <fieldset><legend className="label">Backend</legend>
                {BACKENDS.map((b) => (
                  <label key={b.id} className="flex min-h-11 items-start gap-2 text-sm"><input type="radio" name="backend" value={b.id} defaultChecked={project.backend === b.id} className="mt-1" /><span><strong>{b.name}</strong> <span className="text-muted">— {b.summary}</span></span></label>
                ))}
              </fieldset>
              <fieldset><legend className="label">Deploy to</legend>
                {DEPLOY_TARGETS.map((d) => (
                  <label key={d.id} className="flex min-h-11 items-start gap-2 text-sm"><input type="radio" name="deployTarget" value={d.id} defaultChecked={project.deploy_target === d.id} className="mt-1" /><span><strong>{d.name}</strong> <span className="text-muted">— {d.summary}</span></span></label>
                ))}
              </fieldset>
            </ActionForm>
          </section>
        ) : (
          <p className="text-sm text-muted">Stack: <strong>{BACKENDS.find((b) => b.id === project.backend)?.name}</strong> · <strong>{DEPLOY_TARGETS.find((d) => d.id === project.deploy_target)?.name}</strong>{stackLocked ? " (fixed after the first build)" : ""}</p>
        )}

        <section className="panel flex max-h-[560px] flex-col" aria-labelledby="chat">
          <h2 id="chat" className="border-b border-border px-5 py-3 text-lg">Chat</h2>
          <ol className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
            {messages.data?.length ? messages.data.map((m) => (
              <li key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "ml-auto bg-brand text-brand-contrast" : m.role === "assistant" ? "bg-surface-2" : "border border-dashed border-border text-muted"}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={`mt-1 text-[11px] ${m.role === "user" ? "text-white/70" : "text-muted"}`}>{m.role === "assistant" ? "Software Architect" : m.role === "system" ? "Keelwork" : "You"} · {timeAgo(m.created_at)}</p>
              </li>
            )) : <li className="text-sm text-muted">Describe what you want to build. The Software Architect replies with a plan.</li>}
          </ol>
          {writable ? (
            <div className="border-t border-border p-4">
              {lastMsg?.role === "user" && !latestPlan && aiReady ? (
                <ActionForm action={requestPlan} submitLabel="Plan this idea" pendingLabel="Planning…" submitClassName="btn btn-gradient mb-3"><input type="hidden" name="projectId" value={project.id} /></ActionForm>
              ) : null}
              <ActionForm action={sendMessage} submitLabel="Send" pendingLabel="Planning…" submitClassName="btn btn-primary">
                <input type="hidden" name="projectId" value={project.id} />
                <label htmlFor="content" className="sr-only">Message</label>
                <textarea id="content" name="content" rows={3} maxLength={8000} required className="input" placeholder="Add a waitlist page with email confirmation" />
              </ActionForm>
            </div>
          ) : <p className="border-t border-border p-4 text-sm text-muted">{readOnly ? "This project is read-only for you." : ""}</p>}
        </section>

        {latestPlan && parsed?.ok ? (
          <section className="card" aria-labelledby="plan">
            <div className="flex items-center justify-between gap-2"><h2 id="plan" className="text-xl">Plan</h2><StatusPill status={latestPlan.status} /></div>
            <div className="mt-3"><PlanView plan={parsed.plan} /></div>
            {latestPlan.status === "draft" && writable ? (
              <ActionForm action={approvePlan} submitLabel="Approve and build" pendingLabel="Approving…" submitClassName="btn btn-gradient mt-2" className="mt-4">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="planId" value={latestPlan.id} />
              </ActionForm>
            ) : null}
          </section>
        ) : null}

        {approvals.data?.length ? (
          <section className="card border-[#f0d99a]" aria-labelledby="approvals">
            <h2 id="approvals" className="text-xl">Waiting for you</h2>
            <ul className="mt-3 grid gap-4">
              {approvals.data.map((a) => (
                <li key={a.id} className="rounded-2xl bg-surface-2 p-4">
                  <p className="font-semibold">{a.summary}</p>
                  <p className="text-xs text-muted">{a.kind.replace(/_/g, " ")} · expires {timeAgo(a.expires_at)}</p>
                  {writable ? (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <ActionForm action={decideApproval} submitLabel="Approve" submitClassName="btn btn-primary min-h-10" className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="approvalId" value={a.id} />
                        <input type="hidden" name="decision" value="approve" />
                        {a.kind === "secret_request" ? (
                          <div><label className="label" htmlFor={`sv-${a.id}`}>Value for {String((a.details as { name?: string }).name)}</label>
                            <input id={`sv-${a.id}`} name="secretValue" type="password" autoComplete="off" required className="input min-h-10 w-64" /></div>
                        ) : null}
                      </ActionForm>
                      <ActionForm action={decideApproval} submitLabel="Decline" submitClassName="btn btn-secondary min-h-10">
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="approvalId" value={a.id} />
                        <input type="hidden" name="decision" value="deny" />
                      </ActionForm>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div className="grid content-start gap-6">
        {run ? (
          <section className="panel p-5" aria-labelledby="board">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="board" className="text-lg">Build <StatusPill status={run.status} /></h2>
              {writable && activeRun ? (
                <div className="flex gap-2">
                  {run.status === "paused" ? <RunButton projectId={project.id} runId={run.id} action="resume" label="Resume" /> : <RunButton projectId={project.id} runId={run.id} action="pause" label="Pause" />}
                  <RunButton projectId={project.id} runId={run.id} action="cancel" label="Cancel" danger />
                </div>
              ) : null}
            </div>
            {run.status === "queued" ? <p className="mt-2 text-sm text-muted">Queued. The agent worker picks builds up within a few seconds when it&apos;s running; if nothing changes, the worker isn&apos;t deployed yet.</p> : null}
            {run.error ? <p role="alert" className="mt-2 text-sm text-danger">{run.error}</p> : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {AGENTS.map((agent) => {
                const mine = (tasks ?? []).filter((t) => t.agent === agent.id);
                if (!mine.length) return null;
                return (
                  <div key={agent.id} className="rounded-2xl border border-border p-3">
                    <p className="text-sm font-semibold">{agent.name}</p>
                    <ul className="mt-2 grid gap-1.5">
                      {mine.map((t) => (
                        <li key={t.id} className="text-sm">
                          <div className="flex items-center justify-between gap-2"><span className="truncate" title={t.title}>{t.title}</span><StatusPill status={t.status} /></div>
                          {t.error ? <p className="text-xs text-danger">{t.error}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="panel p-5" aria-labelledby="preview">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="preview" className="text-lg">Preview</h2>
            <div className="flex flex-wrap gap-2">
              {writable && brokerReady ? (
                <ActionForm action={startSandbox} submitLabel={sandbox.data?.status === "running" ? "Restart sandbox" : "Start sandbox"} pendingLabel="Starting…" submitClassName="btn btn-secondary min-h-10">
                  <input type="hidden" name="projectId" value={project.id} />
                  {sandbox.data?.status === "running" ? <input type="hidden" name="restart" value="1" /> : null}
                </ActionForm>
              ) : null}
              <Link href={`/projects/${project.id}/export`} className="btn btn-secondary min-h-10" prefetch={false}>Export ZIP</Link>
            </div>
          </div>
          <div className="mt-4">
            <PreviewPane
              projectId={project.id}
              brokerReady={brokerReady}
              sandboxStatus={sandbox.data?.status ?? null}
              sandboxError={sandbox.data?.error ?? null}
              previewUrl={preview?.url ?? null}
              previewInspectUrl={inspect?.url ?? null}
              previewOrigin={preview?.origin ?? null}
              canDesign={writable}
              designAvailable={Boolean(process.env.KW_APP_ORIGIN)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function RunButton({ projectId, runId, action, label, danger }: { projectId: string; runId: string; action: string; label: string; danger?: boolean }) {
  return (
    <ActionForm action={controlRun} submitLabel={label} submitClassName={`btn min-h-10 ${danger ? "btn-danger" : "btn-secondary"}`} confirm={action === "cancel" ? "Cancel this build? Unfinished tasks stop." : undefined}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="runId" value={runId} />
      <input type="hidden" name="action" value={action} />
    </ActionForm>
  );
}
