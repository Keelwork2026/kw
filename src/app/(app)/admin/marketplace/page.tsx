import { requireStaff } from "@/lib/admin/server";
import { PageHeader, EmptyState, timeAgo } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { reviewItem } from "../actions";

export const metadata = { title: "Marketplace review · back office" };

export default async function AdminMarketplace() {
  const { supabase } = await requireStaff("marketplace");
  const { data: queue } = await supabase.from("marketplace_items").select("id, title, description, category, blocking_findings, created_at").eq("status", "pending_review").order("created_at");
  return (
    <>
      <PageHeader title="Marketplace review" description="Oldest first. Items with blocking security findings can't be approved." />
      {queue?.length ? (
        <ul className="grid gap-3">{queue.map((i) => (
          <li key={i.id} className="panel p-5">
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
          </li>
        ))}</ul>
      ) : <EmptyState icon="success" title="Nothing waiting for review">Templates and listings submitted to the marketplace appear here.</EmptyState>}
    </>
  );
}
