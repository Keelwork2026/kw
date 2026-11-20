import Link from "next/link";
import { loadProject } from "@/lib/project";
import { ActionForm } from "@/components/action-form";
import { EmptyState, StatusPill, timeAgo } from "@/components/page-header";
import { proposeFix, dismiss } from "./actions";

export const metadata = { title: "Incidents" };

export default async function IncidentsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ all?: string }> }) {
  const { id } = await params;
  const all = (await searchParams).all === "1";
  const { supabase, project, can } = await loadProject(id);
  let q = supabase.from("incidents").select("id, source, signature, title, detail, status, count, first_seen, last_seen, dismissed_reason").eq("project_id", project.id).order("last_seen", { ascending: false }).limit(50);
  if (!all) q = q.in("status", ["open", "fix_proposed"]);
  const { data } = await q;
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">Failed checks, deployments and automations open incidents automatically. They close themselves when the same thing later succeeds.</p>
        <Link href={all ? "?" : "?all=1"} className="btn btn-secondary min-h-10">{all ? "Open only" : "Show closed"}</Link>
      </div>
      {data?.length ? data.map((i) => {
        const d = i.detail as { error?: string; output_tail?: string };
        return (
          <article key={i.id} className="panel p-5">
            <div className="flex flex-wrap items-center gap-2"><StatusPill status={i.status} /><strong>{i.title}</strong><span className="text-sm text-muted">× {i.count} · {i.source} · last {timeAgo(i.last_seen)}</span></div>
            {d.error || d.output_tail ? <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-surface-2 p-3 font-mono text-xs">{String(d.error ?? d.output_tail).slice(-2000)}</pre> : null}
            {i.dismissed_reason ? <p className="mt-2 text-sm text-muted">Dismissed: {i.dismissed_reason}</p> : null}
            {can("project.write") && ["open", "fix_proposed"].includes(i.status) ? (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                {i.status === "open" ? (
                  <ActionForm action={proposeFix} submitLabel="Propose a fix" pendingLabel="Diagnosing…" submitClassName="btn btn-gradient min-h-10"><input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="incidentId" value={i.id} /></ActionForm>
                ) : <Link href={`/projects/${project.id}`} className="btn btn-secondary min-h-10">See the fix plan</Link>}
                <ActionForm action={dismiss} submitLabel="Dismiss" submitClassName="btn btn-secondary min-h-10" className="flex items-end gap-2">
                  <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="incidentId" value={i.id} />
                  <label className="sr-only" htmlFor={`dr-${i.id}`}>Reason</label><input id={`dr-${i.id}`} name="reason" required minLength={5} placeholder="Why dismiss it?" className="input min-h-10 w-56" />
                </ActionForm>
              </div>
            ) : null}
          </article>
        );
      }) : <EmptyState icon={all ? "inbox" : "success"} title={all ? "No incidents yet" : "Nothing is failing"}>Failed checks, deployments and automations open an incident here, with what failed and a proposed fix.</EmptyState>}
    </div>
  );
}
