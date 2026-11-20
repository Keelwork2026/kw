import Link from "next/link";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/nav";
import { requireStaff } from "@/lib/admin/server";
import { CAN } from "@/lib/admin/staff";
import { PageHeader, StatusPill, EmptyState, formatMicros, timeAgo } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { adjustCredits, requestAccess, revokeMyAccess, suspendOrg, unsuspendOrg } from "../../actions";

export const metadata = { title: "Organization · back office" };

type Detail = {
  id: string; name: string; created_at: string; personal: boolean; suspended_at: string | null; suspended_reason: string | null;
  plan_key: string | null; subscription_status: string | null; current_period_end: string | null; members: number; owners: string[]; projects: number;
  last_active: string | null; credit_balance_micros: number; ai_cost_micros_30d: number; builds_30d: number; deploys_live: number; refusals: number; reports: number;
  ledger: { kind: string; amount_micros: number; description: string | null; created_at: string }[];
};

export default async function AdminOrgPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase, user, role } = await requireStaff("orgs");
  const { data, error } = await supabase.rpc("admin_org_detail", { p_org: id });
  if (error || !data) notFound();
  const o = data as Detail;
  const { data: grants } = await supabase.from("support_access_grants").select("id, status, reason, expires_at, created_at").eq("org_id", id).eq("requested_by", user.id).order("created_at", { ascending: false });
  const active = grants?.find((g) => g.status === "approved" && g.expires_at && new Date(g.expires_at) > new Date());
  const { data: projects } = active ? await supabase.from("projects").select("id, name, status").eq("org_id", id) : { data: null };

  const facts: [string, string][] = [
    ["Plan", `${o.plan_key ?? "free"}${o.subscription_status ? ` · ${o.subscription_status}` : ""}`],
    ["Owners", o.owners.join(", ") || "—"], ["Members", String(o.members)], ["Projects", String(o.projects)],
    ["Last active", o.last_active ? timeAgo(o.last_active) : "—"], ["Created", new Date(o.created_at).toLocaleDateString("en-GB")],
    ["Credit balance", formatMicros(o.credit_balance_micros)], ["AI cost, 30 days", formatMicros(o.ai_cost_micros_30d)],
    ["Builds, 30 days", String(o.builds_30d)], ["Live deployments", String(o.deploys_live)],
    ["Policy refusals", String(o.refusals)], ["Abuse reports", String(o.reports)],
  ];

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/orgs" className="font-semibold text-accent">← Organizations</Link></p>
      <PageHeader title={o.name} description={`${o.personal ? "Personal workspace" : "Workspace"} · ${o.id}`} />
      {o.suspended_at ? <p role="status" className="notice mb-6"><strong>Suspended</strong> {timeAgo(o.suspended_at)}: {o.suspended_reason}</p> : null}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(([k, v]) => <div key={k} className="panel p-4"><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 break-words font-semibold">{v}</dd></div>)}
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {CAN.supportAccess(role) ? (active ? (
          <section className="card" aria-labelledby="ro">
            <h2 id="ro" className="text-lg">Read-only support access until {new Date(active.expires_at!).toLocaleString("en-GB")}</h2>
            <p className="mt-1 text-sm text-muted">You can read projects; you can&apos;t change anything, and secrets stay unreadable. Every step is audited.</p>
            <ul className="mt-3 grid gap-2">{(projects ?? []).map((p) => <li key={p.id}><Link className="font-semibold text-accent" href={`/projects/${p.id}`}>{p.name}</Link> <StatusPill status={p.status} /></li>)}</ul>
            <ActionForm action={revokeMyAccess} submitLabel="End access now" submitClassName="btn btn-secondary mt-4"><input type="hidden" name="grantId" value={active.id} /></ActionForm>
          </section>
        ) : (
          <section className="card" aria-labelledby="req">
            <h2 id="req" className="text-lg">Request support access</h2>
            <p className="mt-1 text-sm text-muted">The owners decide on Settings → Support access. Until then you see only what&apos;s on this page.</p>
            <ActionForm action={requestAccess} submitLabel="Send request to the owners" className="mt-3 grid gap-3">
              <input type="hidden" name="orgId" value={id} />
              <div><label className="label" htmlFor="reason">Reason (shown to the owners)</label><textarea id="reason" name="reason" required minLength={10} rows={3} className="input" /></div>
              <div><label className="label" htmlFor="hours">For how long (hours, 1–72)</label><input id="hours" name="hours" type="number" min={1} max={72} defaultValue={4} className="input" /></div>
            </ActionForm>
          </section>
        )) : null}

        {CAN.suspend(role) ? (
          <section className="card" aria-labelledby="sus">
            <h2 id="sus" className="text-lg">{o.suspended_at ? "Lift the suspension" : "Suspend this workspace"}</h2>
            {o.suspended_at ? (
              <ActionForm action={unsuspendOrg} submitLabel="Lift suspension" className="mt-3 grid gap-3">
                <input type="hidden" name="orgId" value={id} />
                <div><label className="label" htmlFor="note">Note for the audit log</label><input id="note" name="note" required minLength={5} className="input" /></div>
              </ActionForm>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">Its people keep read access and billing. Everything else is refused by the database; queued builds, automation runs and deployments are cancelled. Their audit log shows it, with your reason.</p>
                <ActionForm action={suspendOrg} submitLabel="Suspend" submitClassName="btn btn-danger" className="mt-3 grid gap-3" confirm={`Suspend ${o.name}? Its builds, automations and deployments stop now.`}>
                  <input type="hidden" name="orgId" value={id} />
                  <div><label className="label" htmlFor="sreason">Reason (the workspace sees this)</label><textarea id="sreason" name="reason" required minLength={10} maxLength={500} rows={3} className="input" /></div>
                  <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm" value="yes" required className="mt-1" /><span>I&apos;ve checked the evidence, and this needs to stop now.</span></label>
                </ActionForm>
              </>
            )}
          </section>
        ) : null}

        {CAN.adjustCredits(role) ? (
          <section className="card" aria-labelledby="cred">
            <h2 id="cred" className="text-lg">Adjust credit</h2>
            <p className="mt-1 text-sm text-muted">Adds an entry to the append-only ledger. Refunds of card payments are made in Stripe.</p>
            <ActionForm action={adjustCredits} submitLabel="Apply adjustment" className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="orgId" value={id} />
              <div><label className="label" htmlFor="amount">Amount in US dollars</label><input id="amount" name="amount" required inputMode="decimal" placeholder="25 or -10.50" className="input" /></div>
              <div><label className="label" htmlFor="creason">Reason (the workspace sees it)</label><input id="creason" name="reason" required minLength={10} maxLength={300} className="input" /></div>
            </ActionForm>
          </section>
        ) : null}

        <section className="card" aria-labelledby="ledger">
          <h2 id="ledger" className="text-lg">Credit history</h2>
          <p className="text-sm text-muted">Grants, purchases, refunds and adjustments (usage is summarised above).</p>
          {o.ledger.length ? (
            <ul className="mt-3 grid gap-2 text-sm">{o.ledger.map((l, i) => <li key={i} className="flex justify-between gap-3 border-b border-border pb-2 last:border-0"><span><span className="pill bg-surface-2">{l.kind}</span> {l.description}</span><span className={`shrink-0 font-semibold ${l.amount_micros < 0 ? "text-danger" : "text-success"}`}>{l.amount_micros < 0 ? "−" : "+"}{formatMicros(Math.abs(l.amount_micros))}</span></li>)}</ul>
          ) : <p className="mt-3 text-sm text-muted">No entries.</p>}
        </section>
      </div>

      {CAN.supportAccess(role) ? (
        <section className="mt-8"><h2 className="mb-2 text-lg">Your requests</h2>
          {grants?.length ? <ul className="grid gap-2 text-sm">{grants.map((g) => <li key={g.id}><StatusPill status={g.status} /> {g.reason} <span className="text-xs text-muted">· {timeAgo(g.created_at)}</span></li>)}</ul> : <EmptyState icon="shield" title="No support access requested">You can only see inside this workspace when an owner grants time-limited access.</EmptyState>}
        </section>
      ) : null}
    </>
  );
}
