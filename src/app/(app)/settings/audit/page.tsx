import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState } from "@/components/page-header";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  const { supabase, org, can } = await requireOrg();
  if (!can("audit.read")) {
    return (<><PageHeader title="Audit log" /><EmptyState icon="shield" title="You need the audit.read permission">Owners and admins can read the audit log.</EmptyState></>);
  }
  const { data } = await supabase.from("audit_events").select("id, actor_id, action, target_type, target_id, metadata, created_at").eq("org_id", org.id).order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <PageHeader title="Audit log" description="Append-only. Nobody — including Keelwork staff — can edit or delete these entries." />
      {data?.length ? (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Audit events, newest first</caption>
            <thead className="text-muted"><tr><th className="p-3">When</th><th className="p-3">Action</th><th className="p-3">Target</th><th className="p-3">Details</th></tr></thead>
            <tbody>
              {data.map((e) => (
                <tr key={e.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap p-3 text-muted">{new Date(e.created_at).toLocaleString("en-GB")}</td>
                  <td className="p-3 font-mono text-xs">{e.action}</td>
                  <td className="p-3 font-mono text-xs">{e.target_type}{e.target_id ? `:${String(e.target_id).slice(0, 8)}` : ""}</td>
                  <td className="p-3 font-mono text-xs text-muted">{JSON.stringify(e.metadata).slice(0, 160)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState icon="history" title="No events yet">Sign-ins, role changes, approvals, deployments and other sensitive actions are recorded here.</EmptyState>}
    </>
  );
}
