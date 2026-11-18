import Link from "next/link";
import { loadProject } from "@/lib/project";
import { ActionForm } from "@/components/action-form";
import { StatusPill, EmptyState, timeAgo } from "@/components/page-header";
import { requestChecks } from "../tests/actions";
import { acceptRisk, reopen } from "./actions";

export const metadata = { title: "Security" };
const SEVERITIES = ["critical", "high", "medium", "moderate", "low", "info"];
const TONE: Record<string, string> = { critical: "bg-[#fde8e4] text-[#a3281a]", high: "bg-[#fdeee0] text-[#9a3d00]", medium: "bg-[#fff6d6] text-[#8a6100]", moderate: "bg-[#fff6d6] text-[#8a6100]", low: "bg-[#e7f0ff] text-[#1d4ed8]", info: "bg-surface-2 text-text" };

export default async function SecurityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ severity?: string; status?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, project, can } = await loadProject(id);
  let q = supabase.from("security_findings").select("id, scanner, rule, severity, title, location, hint, is_credential, status, accepted_reason, last_seen").eq("project_id", project.id).order("last_seen", { ascending: false }).limit(200);
  if (sp.severity && SEVERITIES.includes(sp.severity)) q = q.eq("severity", sp.severity);
  q = q.eq("status", ["open", "accepted", "resolved"].includes(sp.status ?? "") ? sp.status! : "open");
  const [{ data: findings }, { data: scans }] = await Promise.all([q, supabase.from("check_runs").select("kind, status, created_at").eq("project_id", project.id).in("kind", ["secrets", "review", "audit"]).order("created_at", { ascending: false }).limit(6)]);
  const criticalOpen = (findings ?? []).some((f) => f.severity === "critical" && f.status === "open");
  const status = sp.status ?? "open";

  return (
    <div className="grid gap-6">
      {criticalOpen ? <p role="alert" className="notice">Open critical findings block every deployment — from people and agents — until they&apos;re fixed.</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {can("project.write") ? [["secrets", "Scan for secrets"], ["review", "Security review"], ["audit", "Dependency audit"]].map(([k, l]) => (
          <ActionForm key={k} action={requestChecks} submitLabel={l!} submitClassName="btn btn-secondary min-h-10"><input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="kind" value={k} /></ActionForm>
        )) : null}
        <span className="ml-auto text-xs text-muted">{scans?.map((s) => `${s.kind} ${s.status} ${timeAgo(s.created_at)}`).join(" · ")}</span>
      </div>
      <nav aria-label="Filters" className="flex flex-wrap gap-1.5 text-sm">
        {["open", "accepted", "resolved"].map((s) => <Link key={s} href={`?status=${s}${sp.severity ? `&severity=${sp.severity}` : ""}`} aria-current={status === s ? "page" : undefined} className={`pill min-h-9 px-3 ${status === s ? "bg-[#0b1f3a] text-white" : "border border-border"}`}>{s}</Link>)}
        <span className="mx-2 h-6 w-px bg-border" aria-hidden />
        <Link href={`?status=${status}`} className={`pill min-h-9 px-3 ${!sp.severity ? "bg-[#0b1f3a] text-white" : "border border-border"}`}>all severities</Link>
        {SEVERITIES.map((s) => <Link key={s} href={`?status=${status}&severity=${s}`} aria-current={sp.severity === s ? "page" : undefined} className={`pill min-h-9 px-3 ${sp.severity === s ? "bg-[#0b1f3a] text-white" : "border border-border"}`}>{s}</Link>)}
      </nav>
      {findings?.length ? (
        <ul className="grid gap-3">
          {findings.map((f) => (
            <li key={f.id} className="panel p-5">
              <div className="flex flex-wrap items-center gap-2"><span className={`pill ${TONE[f.severity]}`}>{f.severity}</span><strong>{f.title}</strong><StatusPill status={f.status} /><span className="text-xs text-muted">{f.scanner} · {f.rule}</span></div>
              {f.location ? <p className="mt-1 font-mono text-xs text-muted">{f.location}</p> : null}
              {f.hint ? <p className="mt-2 text-sm">{f.hint}</p> : null}
              {f.accepted_reason ? <p className="mt-1 text-sm text-muted">Accepted: {f.accepted_reason}</p> : null}
              {can("project.manage") ? (
                f.status === "open" ? (f.is_credential ? <p className="mt-2 text-xs text-muted">Committed credentials can&apos;t be accepted: rotate the key and remove it.</p> : (
                  <ActionForm action={acceptRisk} submitLabel="Accept risk" submitClassName="btn btn-secondary min-h-9" className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="findingId" value={f.id} />
                    <label className="sr-only" htmlFor={`r-${f.id}`}>Reason</label><input id={`r-${f.id}`} name="reason" minLength={10} required placeholder="Why is this acceptable?" className="input min-h-9 w-80" />
                  </ActionForm>
                )) : (
                  <ActionForm action={reopen} submitLabel="Reopen" submitClassName="btn btn-secondary min-h-9" className="mt-3"><input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="findingId" value={f.id} /></ActionForm>
                )
              ) : null}
            </li>
          ))}
        </ul>
      ) : <EmptyState title={`No ${status} findings`}>{status === "open" ? "Run a scan to check this project." : null}</EmptyState>}
    </div>
  );
}
