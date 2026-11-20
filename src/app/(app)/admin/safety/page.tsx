import Link from "next/link";
import { requireStaff } from "@/lib/admin/server";
import { REPORT_CATEGORIES } from "@/lib/admin/staff";
import { PageHeader, EmptyState, StatusPill, timeAgo } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { linkReport, updateReport } from "../actions";

export const metadata = { title: "Trust & safety · back office" };

const VIEWS = [["open", "Open"], ["investigating", "Investigating"], ["closed", "Closed"]] as const;

/** Abuse reports from the public form, plus recent refusals by the policy engine. */
export default async function AdminSafety({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "open" } = await searchParams;
  const { supabase } = await requireStaff("safety");
  const statuses = view === "closed" ? ["actioned", "dismissed"] : view === "investigating" ? ["investigating"] : ["open"];
  const [{ data: reports }, { data: refusals }, counts] = await Promise.all([
    supabase.from("abuse_reports").select("id, category, url, details, contact_email, org_id, status, resolution, assigned_to, created_at, updated_at").in("status", statuses).order("created_at", { ascending: view !== "closed" }).limit(100),
    supabase.from("policy_events").select("id, org_id, level, rules, summary, excerpt, status, created_at").gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()).order("created_at", { ascending: false }).limit(20),
    Promise.all(VIEWS.map(([v]) => supabase.from("abuse_reports").select("id", { count: "exact", head: true }).in("status", v === "closed" ? ["actioned", "dismissed"] : [v]).then((r) => r.count ?? 0))),
  ]);
  const label = (c: string) => REPORT_CATEGORIES.find((x) => x.id === c)?.label ?? c;

  return (
    <>
      <PageHeader title="Trust & safety" description="Reports from the public report page (/report) and what the policy engine refused this week. Judge what the software does, not its topic or opinions." />
      <nav aria-label="Report status" className="flex flex-wrap gap-1.5">
        {VIEWS.map(([v, l], i) => <Link key={v} href={`/admin/safety?view=${v}`} aria-current={view === v ? "page" : undefined} className={`min-h-9 rounded-full border px-3 py-1.5 text-sm font-semibold ${view === v ? "border-accent bg-accent text-accent-contrast" : "border-border text-muted hover:text-text"}`}>{l} · {counts[i]}</Link>)}
      </nav>

      {reports?.length ? (
        <ul className="mt-4 grid gap-4">
          {reports.map((r) => (
            <li key={r.id} className="panel p-5">
              <div className="flex flex-wrap items-center gap-2"><StatusPill status={r.status} /><span className="font-semibold">{label(r.category)}</span><span className="text-xs text-muted">reported {timeAgo(r.created_at)}</span>{r.org_id ? <Link className="text-xs font-semibold text-accent" href={`/admin/orgs/${r.org_id}`}>Linked workspace →</Link> : null}</div>
              {r.url ? <p className="mt-2 break-all font-mono text-sm">{r.url}</p> : null}
              <p className="mt-2 whitespace-pre-wrap text-sm">{r.details}</p>
              {r.contact_email ? <p className="mt-1 text-xs text-muted">Reporter: {r.contact_email}</p> : null}
              {r.resolution ? <p className="mt-2 text-sm"><span className="font-semibold">Resolution:</span> {r.resolution}</p> : null}
              {view !== "closed" ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {r.status === "open" ? (
                    <ActionForm action={updateReport} submitLabel="Take it" submitClassName="btn btn-secondary min-h-10">
                      <input type="hidden" name="reportId" value={r.id} /><input type="hidden" name="status" value="investigating" /><input type="hidden" name="assign" value="yes" />
                    </ActionForm>
                  ) : null}
                  {!r.org_id ? (
                    <ActionForm action={linkReport} submitLabel="Link" submitClassName="btn btn-secondary min-h-10" className="flex flex-wrap items-end gap-2 [&>div]:mt-0">
                      <input type="hidden" name="reportId" value={r.id} />
                      <label className="sr-only" htmlFor={`o-${r.id}`}>Workspace id</label><input id={`o-${r.id}`} name="orgId" placeholder="Workspace id" className="input min-h-10 w-48 font-mono text-xs" />
                    </ActionForm>
                  ) : null}
                  <ActionForm action={updateReport} submitLabel="Close" submitClassName="btn btn-primary min-h-10" className="grid gap-2 lg:col-span-3">
                    <input type="hidden" name="reportId" value={r.id} />
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-1.5 text-sm"><input type="radio" name="status" value="actioned" defaultChecked /> Actioned</label>
                      <label className="flex items-center gap-1.5 text-sm"><input type="radio" name="status" value="dismissed" /> Dismissed</label>
                    </div>
                    <label className="sr-only" htmlFor={`res-${r.id}`}>What was done</label>
                    <input id={`res-${r.id}`} name="resolution" required minLength={5} maxLength={1000} placeholder="What was done (e.g. workspace suspended, page removed, not a violation)" className="input" />
                  </ActionForm>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <div className="mt-4"><EmptyState icon="shield" title={view === "closed" ? "No closed reports" : "Nothing waiting"}>Reports people send from the public report page appear here. Suspensions are made from a workspace&apos;s page.</EmptyState></div>}

      <section className="mt-10" aria-labelledby="ref">
        <h2 id="ref" className="text-lg">Refusals this week</h2>
        <p className="text-sm text-muted">What the policy engine declined. Appeals are on the Policy appeals tab.</p>
        {refusals?.length ? (
          <ul className="mt-3 grid gap-2 text-sm">{refusals.map((e) => (
            <li key={e.id} className="rounded-xl border border-border p-3"><div className="flex flex-wrap items-center gap-2"><span className="pill bg-surface-2">level {e.level}</span><span className="font-semibold">{(e.rules as string[]).join(", ")}</span><StatusPill status={e.status} /><span className="text-xs text-muted">{timeAgo(e.created_at)}</span><Link className="ml-auto text-xs font-semibold text-accent" href={`/admin/orgs/${e.org_id}`}>Workspace →</Link></div><p className="mt-1 text-muted">“{e.excerpt}”</p></li>
          ))}</ul>
        ) : <p className="mt-3 text-sm text-muted">None this week.</p>}
      </section>
    </>
  );
}
