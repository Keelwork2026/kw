import { requireOrg } from "@/lib/org";
import { PageHeader, StatusPill, EmptyState, timeAgo } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { decideSupport, revokeSupport } from "./actions";

export const metadata = { title: "Support access" };

export default async function SupportPage() {
  const { supabase, org } = await requireOrg();
  const { data: grants } = await supabase.from("support_access_grants").select("id, status, reason, requested_hours, expires_at, created_at").eq("org_id", org.id).order("created_at", { ascending: false });
  const owner = org.role === "owner";
  return (
    <>
      <PageHeader title="Support access" description="Keelwork staff can't see your projects unless an owner approves a time-limited, read-only grant here. Secrets are never visible. Every step is in your audit log." />
      {grants?.length ? (
        <ul className="grid gap-3">
          {grants.map((g) => (
            <li key={g.id} className="panel p-5">
              <div className="flex flex-wrap items-center gap-2"><StatusPill status={g.status} /><span className="text-sm text-muted">requested {timeAgo(g.created_at)} for {g.requested_hours} h{g.expires_at ? ` · ends ${new Date(g.expires_at).toLocaleString("en-GB")}` : ""}</span></div>
              <p className="mt-2">{g.reason}</p>
              {owner && g.status === "requested" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionForm action={decideSupport} submitLabel="Approve" submitClassName="btn btn-primary min-h-10" className="flex items-end gap-2">
                    <input type="hidden" name="grantId" value={g.id} /><input type="hidden" name="approve" value="1" />
                    <label className="label" htmlFor={`h-${g.id}`}>Hours</label><input id={`h-${g.id}`} name="hours" type="number" min={1} max={72} defaultValue={g.requested_hours} className="input min-h-10 w-24" />
                  </ActionForm>
                  <ActionForm action={decideSupport} submitLabel="Deny" submitClassName="btn btn-secondary min-h-10"><input type="hidden" name="grantId" value={g.id} /><input type="hidden" name="approve" value="0" /></ActionForm>
                </div>
              ) : null}
              {owner && g.status === "approved" ? <ActionForm action={revokeSupport} submitLabel="Revoke now" submitClassName="btn btn-danger min-h-10 mt-3"><input type="hidden" name="grantId" value={g.id} /></ActionForm> : null}
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No support requests" />}
      {!owner ? <p className="mt-4 text-sm text-muted">Only owners can approve or revoke support access.</p> : null}
    </>
  );
}
