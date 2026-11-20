import Link from "next/link";
import { requireStaff } from "@/lib/admin/server";
import { PageHeader, timeAgo, StatusPill, EmptyState } from "@/components/page-header";
import { filterOrgs, grantView, timeLeft, ORG_SORTS, type AdminOrg } from "@/lib/admin-view";

export const metadata = { title: "Organizations · back office" };

type SP = { q?: string; plan?: string; sort?: string; state?: string };

/** Organization metadata only — never code, secrets or data. */
export default async function AdminOrgs({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireStaff("orgs");
  const [{ data: orgData }, { data: grants }] = await Promise.all([
    supabase.rpc("admin_list_orgs"),
    supabase.from("support_access_grants").select("id, org_id, status, reason, expires_at, created_at").eq("requested_by", user.id).order("created_at", { ascending: false }).limit(50),
  ]);
  const all = (orgData ?? []) as AdminOrg[];
  const orgs = filterOrgs(all, sp);
  const names = new Map(all.map((o) => [o.id, o.name]));
  const plans = [...new Set(all.map((o) => o.plan_key))].sort();
  const now = new Date();
  const byView = { active: [] as NonNullable<typeof grants>, waiting: [] as NonNullable<typeof grants>, ended: [] as NonNullable<typeof grants> };
  for (const g of grants ?? []) byView[grantView(g, now)].push(g);
  const filtered = Boolean(sp.q || sp.plan || sp.state);

  return (
    <>
      <PageHeader title="Organizations" description="Metadata only. To look inside one, request support access from its page: an owner must approve it, it's read-only and time-limited, and every step is in their audit log." />
      <section className="panel overflow-x-auto" aria-labelledby="orgs">
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-4">
          <h2 id="orgs" className="text-lg">Organizations <span className="text-sm font-normal text-muted">{filtered ? `${orgs.length} of ${all.length}` : all.length}</span></h2>
          <form method="get" action="/admin/orgs" className="flex flex-wrap items-end gap-2" role="search" aria-label="Filter organizations">
            <div><label htmlFor="q" className="sr-only">Search by name or id</label><input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="Search name or id" maxLength={100} className="input min-h-10 w-56 py-0 text-sm" /></div>
            <div><label htmlFor="plan" className="sr-only">Plan</label>
              <select id="plan" name="plan" defaultValue={sp.plan ?? ""} className="input min-h-10 w-36 py-0 text-sm"><option value="">All plans</option>{plans.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label htmlFor="state" className="sr-only">State</label>
              <select id="state" name="state" defaultValue={sp.state ?? ""} className="input min-h-10 w-36 py-0 text-sm"><option value="">Any state</option><option value="active">Active</option><option value="suspended">Suspended</option></select></div>
            <div><label htmlFor="sort" className="sr-only">Sort</label>
              <select id="sort" name="sort" defaultValue={sp.sort ?? "newest"} className="input min-h-10 w-40 py-0 text-sm">{ORG_SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
            <button className="btn btn-primary min-h-10">Apply</button>
            {filtered ? <Link href="/admin/orgs" className="btn btn-secondary min-h-10">Clear</Link> : null}
          </form>
        </div>
        {orgs.length ? (
          <table className="mt-3 w-full min-w-[760px] text-left text-sm">
            <thead className="text-muted"><tr><th scope="col" className="px-5 py-2">Name</th><th scope="col" className="px-5 py-2">Plan</th><th scope="col" className="px-5 py-2">Members</th><th scope="col" className="px-5 py-2">Projects</th><th scope="col" className="px-5 py-2">Last active</th><th scope="col" className="px-5 py-2">Created</th></tr></thead>
            <tbody>{orgs.map((o) => (
              <tr key={o.id} className="border-t border-border hover:bg-surface-2/60">
                <td className="px-5 py-2"><Link className="font-semibold text-accent" href={`/admin/orgs/${o.id}`}>{o.name}</Link>{o.suspended_at ? <span className="ml-2 pill bg-[#fde8e4] text-[#a3281a]">suspended</span> : null}<span className="block font-mono text-[11px] text-muted">{o.id.slice(0, 8)}</span></td>
                <td className="px-5 py-2"><span className="pill bg-surface-2">{o.plan_key}</span></td>
                <td className="px-5 py-2">{o.member_count}</td>
                <td className="px-5 py-2">{o.project_count}</td>
                <td className="px-5 py-2 text-muted">{o.last_active ? timeAgo(o.last_active) : "—"}</td>
                <td className="px-5 py-2 text-muted">{timeAgo(o.created_at)}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <div className="p-5"><EmptyState icon="search" title="No organizations match">Try a different name, or clear the filters.</EmptyState></div>}
      </section>

      <section className="mt-8" aria-labelledby="mine">
        <h2 id="mine" className="text-lg">Your support access</h2>
        <p className="text-sm text-muted">Owners approve it for 1–72 hours; you can end it early from the organization&apos;s page.</p>
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
    </>
  );
}
