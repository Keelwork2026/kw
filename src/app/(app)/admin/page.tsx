import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { PageHeader, timeAgo, StatusPill } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { reviewItem } from "./actions";

export const metadata = { title: "Platform admin" };

/** Staff see organization metadata only — never code, secrets or data. */
export default async function AdminPage() {
  const { supabase } = await requireOrg();
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) notFound();
  const { data: reviewer } = await supabase.rpc("is_platform_admin", { p_roles: ["reviewer", "superadmin"] });
  const [{ data: orgs }, { data: queue }, { data: grants }] = await Promise.all([
    supabase.rpc("admin_list_orgs"),
    reviewer ? supabase.from("marketplace_items").select("id, title, description, category, blocking_findings, created_at").eq("status", "pending_review").order("created_at") : Promise.resolve({ data: [] }),
    supabase.from("support_access_grants").select("id, org_id, status, reason, expires_at, created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  return (
    <>
      <PageHeader title="Platform admin" description="Organization metadata only. To look inside an organization, request support access; an owner must approve it." />
      <section className="panel overflow-x-auto" aria-labelledby="orgs">
        <h2 id="orgs" className="px-5 pt-4 text-lg">Organizations</h2>
        <table className="mt-2 w-full min-w-[640px] text-left text-sm">
          <thead className="text-muted"><tr><th className="px-5 py-2">Name</th><th className="px-5 py-2">Plan</th><th className="px-5 py-2">Members</th><th className="px-5 py-2">Projects</th><th className="px-5 py-2">Created</th></tr></thead>
          <tbody>{((orgs ?? []) as { id: string; name: string; plan_key: string; member_count: number; project_count: number; created_at: string }[]).map((o) => (
            <tr key={o.id} className="border-t border-border"><td className="px-5 py-2"><Link className="font-semibold text-accent" href={`/admin/orgs/${o.id}`}>{o.name}</Link></td><td className="px-5 py-2">{o.plan_key}</td><td className="px-5 py-2">{o.member_count}</td><td className="px-5 py-2">{o.project_count}</td><td className="px-5 py-2 text-muted">{timeAgo(o.created_at)}</td></tr>
          ))}</tbody>
        </table>
      </section>
      <section className="panel mt-6 p-5" aria-labelledby="mine"><h2 id="mine" className="text-lg">Your support requests</h2>
        <ul className="mt-2 grid gap-2 text-sm">{(grants ?? []).map((g) => <li key={g.id} className="flex flex-wrap gap-2"><StatusPill status={g.status} /><Link className="text-accent" href={`/admin/orgs/${g.org_id}`}>{g.org_id.slice(0, 8)}</Link><span className="text-muted">{g.reason}{g.expires_at ? ` · until ${new Date(g.expires_at).toLocaleString("en-GB")}` : ""}</span></li>)}</ul>
      </section>
      {reviewer ? (
        <section className="mt-6" aria-labelledby="queue">
          <h2 id="queue" className="mb-3 text-xl">Marketplace review queue</h2>
          {queue?.length ? queue.map((i) => (
            <article key={i.id} className="panel mb-3 p-5">
              <p className="font-semibold">{i.title} <span className="text-xs text-muted">· {i.category}</span></p><p className="text-sm text-muted">{i.description}</p>
              {i.blocking_findings ? <p className="mt-1 text-sm text-danger">{i.blocking_findings} blocking finding(s): can&apos;t be approved.</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {(["approve", "reject"] as const).map((d) => (
                  <ActionForm key={d} action={reviewItem} submitLabel={d === "approve" ? "Approve" : "Reject"} submitClassName={`btn min-h-10 ${d === "approve" ? "btn-primary" : "btn-secondary"}`} className="flex items-end gap-2">
                    <input type="hidden" name="itemId" value={i.id} /><input type="hidden" name="decision" value={d} />
                    {d === "reject" ? <><label htmlFor={`n-${i.id}`} className="sr-only">Note</label><input id={`n-${i.id}`} name="note" placeholder="Note for the publisher" className="input min-h-10 w-64" /></> : null}
                  </ActionForm>
                ))}
              </div>
            </article>
          )) : <p className="text-sm text-muted">Nothing waiting for review.</p>}
        </section>
      ) : null}
    </>
  );
}
