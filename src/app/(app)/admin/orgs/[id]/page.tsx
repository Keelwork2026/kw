import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { isUuid } from "@/lib/nav";
import { PageHeader, StatusPill, EmptyState } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { requestAccess, revokeMyAccess } from "../../actions";

export const metadata = { title: "Organization · admin" };

export default async function AdminOrgPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase, user } = await requireOrg();
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) notFound();
  const { data: orgs } = await supabase.rpc("admin_list_orgs");
  const org = ((orgs ?? []) as { id: string; name: string; plan_key: string; member_count: number; project_count: number }[]).find((o) => o.id === id);
  if (!org) notFound();
  const { data: grants } = await supabase.from("support_access_grants").select("id, status, reason, expires_at").eq("org_id", id).eq("requested_by", user.id).order("created_at", { ascending: false });
  const active = grants?.find((g) => g.status === "approved" && g.expires_at && new Date(g.expires_at) > new Date());
  const { data: projects } = active ? await supabase.from("projects").select("id, name, status").eq("org_id", id) : { data: null };
  return (
    <>
      <PageHeader title={org.name} description={`${org.plan_key} · ${org.member_count} members · ${org.project_count} projects`} />
      {active ? (
        <section className="card" aria-labelledby="ro">
          <h2 id="ro" className="text-lg">Read-only support access until {new Date(active.expires_at!).toLocaleString("en-GB")}</h2>
          <p className="mt-1 text-sm text-muted">You can read projects; you can&apos;t change anything, and secrets stay unreadable. Every step is audited.</p>
          <ul className="mt-3 grid gap-2">{(projects ?? []).map((p) => <li key={p.id}><Link className="font-semibold text-accent" href={`/projects/${p.id}`}>{p.name}</Link> <StatusPill status={p.status} /></li>)}</ul>
          <ActionForm action={revokeMyAccess} submitLabel="End access now" submitClassName="btn btn-secondary mt-4"><input type="hidden" name="grantId" value={active.id} /></ActionForm>
        </section>
      ) : (
        <section className="card max-w-xl" aria-labelledby="req">
          <h2 id="req" className="text-lg">Request support access</h2>
          <ActionForm action={requestAccess} submitLabel="Send request to the owners" className="mt-3 grid gap-3">
            <input type="hidden" name="orgId" value={id} />
            <div><label className="label" htmlFor="reason">Reason (shown to the owners)</label><textarea id="reason" name="reason" required minLength={10} rows={3} className="input" /></div>
            <div><label className="label" htmlFor="hours">For how long (hours, 1–72)</label><input id="hours" name="hours" type="number" min={1} max={72} defaultValue={4} className="input" /></div>
          </ActionForm>
        </section>
      )}
      <section className="mt-6"><h2 className="mb-2 text-lg">Your requests</h2>
        {grants?.length ? <ul className="grid gap-2 text-sm">{grants.map((g) => <li key={g.id}><StatusPill status={g.status} /> {g.reason}</li>)}</ul> : <EmptyState icon="shield" title="No support access granted">Support can only see this organization when an owner grants time-limited access.</EmptyState>}
      </section>
    </>
  );
}
