import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { PageHeader, timeAgo, StatusPill, EmptyState } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { filterOrgs, grantView, timeLeft, ORG_SORTS, type AdminOrg } from "@/lib/admin-view";
import { reviewItem } from "./actions";

export const metadata = { title: "Platform admin" };

type SP = { q?: string; plan?: string; sort?: string };

/** Staff see organization metadata only — never code, secrets or data. */
export default async function AdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await requireOrg();
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) notFound();
  const { data: reviewer } = await supabase.rpc("is_platform_admin", { p_roles: ["reviewer", "superadmin"] });
  const [{ data: orgData }, { data: queue }, { data: grants }] = await Promise.all([
    supabase.rpc("admin_list_orgs"),
    reviewer ? supabase.from("marketplace_items").select("id, title, description, category, blocking_findings, created_at").eq("status", "pending_review").order("created_at") : Promise.resolve({ data: [] }),
    supabase.from("support_access_grants").select("id, org_id, status, reason, expires_at, created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  const all = (orgData ?? []) as AdminOrg[];
  const orgs = filterOrgs(all, sp);
  const names = new Map(all.map((o) => [o.id, o.name]));
  const plans = [...new Set(all.map((o) => o.plan_key))].sort();
  const now = new Date();
  const byView = { active: [] as NonNullable<typeof grants>, waiting: [] as NonNullable<typeof grants>, ended: [] as NonNullable<typeof grants> };
  for (const g of grants ?? []) byView[grantView(g, now)].push(g);
  const stats = [
    { label: "Organizations", value: all.length, href: "#orgs" },
    { label: "Active projects", value: all.reduce((n, o) => n + Number(o.project_count), 0), href: "#orgs" },
    { label: "Your active access", value: byView.active.length, href: "#mine" },
    ...(reviewer ? [{ label: "Waiting for review", value: queue?.length ?? 0, href: "#queue" }] : []),
  ];
  const filtered = Boolean(sp.q || sp.plan);

  return (
    <>
      <PageHeader title="Platform admin" description="Organization metadata only. To look inside an organization, request support access; an owner must approve it, it's read-only and time-limited, and every step is in their audit log." />

      <nav aria-label="Admin sections" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-xs text-muted">Jump to</span>
        <a href="#orgs" className="pill bg-surface-2 text-text hover:ring-1 hover:ring-accent">Organizations</a>
        <a href="#mine" className="pill bg-surface-2 text-text hover:ring-1 hover:ring-accent">Support access</a>
        {reviewer ? <a href="#queue" className="pill bg-surface-2 text-text hover:ring-1 hover:ring-accent">Review queue{queue?.length ? ` (${queue.length})` : ""}</a> : null}
      </nav>

      <ul className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Overview">
        {stats.map((s) => (
          <li key={s.label}><a href={s.href} className="panel block p-5 hover:border-accent"><span className="block text-sm text-muted">{s.label}</span><span className="mt-1 block font-display text-3xl font-bold">{s.value}</span></a></li>
        ))}
      </ul>

      <section className="panel overflow-x-auto" aria-labelledby="orgs">
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-4">
          <h2 id="orgs" className="text-lg">Organizations <span className="text-sm font-normal text-muted">{filtered ? `${orgs.length} of ${all.length}` : all.length}</span></h2>
          <form method="get" action="/admin#orgs" className="flex flex-wrap items-end gap-2" role="search" aria-label="Filter organizations">
            <div><label htmlFor="q" className="sr-only">Search by name or id</label><input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="Search name or id" maxLength={100} className="input min-h-10 w-56 py-0 text-sm" /></div>
            <div><label htmlFor="plan" className="sr-only">Plan</label>
              <select id="plan" name="plan" defaultValue={sp.plan ?? ""} className="input min-h-10 w-36 py-0 text-sm"><option value="">All plans</option>{plans.map((p) => <option key={p} value={p}>{p}</option>)}</select>
            </div>
            <div><label htmlFor="sort" className="sr-only">Sort</label>
              <select id="sort" name="sort" defaultValue={sp.sort ?? "newest"} className="input min-h-10 w-40 py-0 text-sm">{ORG_SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
            </div>
            <button className="btn btn-primary min-h-10">Apply</button>
            {filtered ? <Link href="/admin#orgs" className="btn btn-secondary min-h-10">Clear</Link> : null}
          </form>
        </div>
        {orgs.length ? (
          <table className="mt-3 w-full min-w-[720px] text-left text-sm">
            <thead className="text-muted"><tr><th scope="col" className="px-5 py-2">Name</th><th scope="col" className="px-5 py-2">Plan</th><th scope="col" className="px-5 py-2">Members</th><th scope="col" className="px-5 py-2">Projects</th><th scope="col" className="px-5 py-2">Created</th><th scope="col" className="px-5 py-2"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{orgs.map((o) => (
              <tr key={o.id} className="border-t border-border hover:bg-surface-2/60">
                <td className="px-5 py-2"><Link className="font-semibold text-accent" href={`/admin/orgs/${o.id}`}>{o.name}</Link><span className="block font-mono text-[11px] text-muted">{o.id.slice(0, 8)}</span></td>
                <td className="px-5 py-2"><span className="pill bg-surface-2">{o.plan_key}</span></td>
                <td className="px-5 py-2">{o.member_count}</td>
                <td className="px-5 py-2">{o.project_count}</td>
                <td className="px-5 py-2 text-muted">{timeAgo(o.created_at)}</td>
                <td className="px-5 py-2 text-right"><Link href={`/admin/orgs/${o.id}`} className="text-xs font-semibold text-accent">Details / request access →</Link></td>
              </tr>
            ))}</tbody>
          </table>
        ) : <div className="p-5"><EmptyState icon="search" title="No organizations match">Try a different name, or clear the filters.</EmptyState></div>}
      </section>

      <section className="mt-8" aria-labelledby="mine">
        <h2 id="mine" className="text-lg">Your support access</h2>
        <p className="text-sm text-muted">Request access from an organization&apos;s page. Owners approve it for 1–72 hours; you can end it early.</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          {([["active", "Active now"], ["waiting", "Waiting for the owner"], ["ended", "Ended"]] as const).map(([k, title]) => (
            <div key={k} className="panel p-4">
              <h3 className="text-base">{title} <span className="text-sm font-normal text-muted">{byView[k].length}</span></h3>
              {byView[k].length ? (
                <ul className="mt-2 grid gap-2 text-sm">{byView[k].slice(0, 10).map((g) => (
                  <li key={g.id} className="rounded-xl bg-surface-2 p-2.5">
                    <div className="flex flex-wrap items-center gap-2"><Link className="font-semibold text-accent" href={`/admin/orgs/${g.org_id}`}>{names.get(g.org_id) ?? g.org_id.slice(0, 8)}</Link><StatusPill status={g.status} /></div>
                    <p className="mt-1 text-muted">{g.reason}</p>
                    <p className="text-xs text-muted">{k === "active" ? timeLeft(g.expires_at, now) : `requested ${timeAgo(g.created_at)}`}</p>
                  </li>
                ))}</ul>
              ) : <p className="mt-2 text-sm text-muted">None.</p>}
            </div>
          ))}
        </div>
      </section>

      {reviewer ? (
        <section className="mt-8" aria-labelledby="queue">
          <h2 id="queue" className="mb-1 text-xl">Marketplace review queue <span className="text-sm font-normal text-muted">{queue?.length ?? 0}</span></h2>
          <p className="mb-3 text-sm text-muted">Oldest first. Items with blocking security findings can&apos;t be approved.</p>
          {queue?.length ? queue.map((i) => (
            <article key={i.id} className="panel mb-3 p-5">
              <p className="font-semibold">{i.title} <span className="text-xs text-muted">· {i.category} · submitted {timeAgo(i.created_at)}</span></p><p className="text-sm text-muted">{i.description}</p>
              {i.blocking_findings ? <p className="mt-1 text-sm text-danger">{i.blocking_findings} blocking finding(s): can&apos;t be approved.</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {(["approve", "reject"] as const).filter((d) => d === "reject" || !i.blocking_findings).map((d) => (
                  <ActionForm key={d} action={reviewItem} submitLabel={d === "approve" ? "Approve" : "Reject"} submitClassName={`btn min-h-10 ${d === "approve" ? "btn-primary" : "btn-secondary"}`} className="flex items-end gap-2">
                    <input type="hidden" name="itemId" value={i.id} /><input type="hidden" name="decision" value={d} />
                    {d === "reject" ? <><label htmlFor={`n-${i.id}`} className="sr-only">Note for the publisher</label><input id={`n-${i.id}`} name="note" placeholder="Note for the publisher" className="input min-h-10 w-64" /></> : null}
                  </ActionForm>
                ))}
              </div>
            </article>
          )) : <EmptyState icon="success" title="Nothing waiting for review">Templates and listings submitted to the marketplace appear here for review.</EmptyState>}
        </section>
      ) : null}
    </>
  );
}
