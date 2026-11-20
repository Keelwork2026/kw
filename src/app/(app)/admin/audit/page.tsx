import Link from "next/link";
import { requireStaff } from "@/lib/admin/server";
import { isUuid } from "@/lib/nav";
import { PageHeader, EmptyState } from "@/components/page-header";

export const metadata = { title: "Audit log · back office" };

type Row = { id: number; created_at: string; action: string; admin_email: string | null; org_id: string | null; org_name: string | null; target: string | null; metadata: Record<string, unknown> };
const FILTERS = ["", "org.", "staff.", "user.", "billing.", "support.", "policy.", "report.", "flag.", "announcement.", "admin."];

/** Every staff action, newest first. Append-only: nobody can edit or delete entries. */
export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ action?: string; org?: string; before?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff("audit");
  const action = FILTERS.includes(sp.action ?? "") ? sp.action || null : null;
  const org = sp.org && isUuid(sp.org) ? sp.org : null;
  const before = sp.before && /^\d+$/.test(sp.before) ? Number(sp.before) : null;
  const { data, error } = await supabase.rpc("admin_audit_log", { p_action: action, p_org: org, p_before: before, p_limit: 50 });
  const rows = (data ?? []) as Row[];
  const q = (extra: Record<string, string>) => `/admin/audit?${new URLSearchParams({ ...(action ? { action } : {}), ...(org ? { org } : {}), ...extra })}`;
  return (
    <>
      <PageHeader title="Audit log" description="Every action taken by staff, newest first. Entries can't be edited or deleted — not even by superadmins." />
      <nav aria-label="Filter by kind" className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => <Link key={f || "all"} href={f ? `/admin/audit?action=${f}${org ? `&org=${org}` : ""}` : `/admin/audit${org ? `?org=${org}` : ""}`} aria-current={(action ?? "") === f ? "page" : undefined} className={`min-h-9 rounded-full border px-3 py-1.5 text-sm font-semibold ${(action ?? "") === f ? "border-accent bg-accent text-accent-contrast" : "border-border text-muted hover:text-text"}`}>{f ? f.replace(".", "") : "All"}</Link>)}
      </nav>
      {org ? <p className="mt-3 text-sm">Only this workspace. <Link className="font-semibold text-accent" href={action ? `/admin/audit?action=${action}` : "/admin/audit"}>Show all</Link></p> : null}
      {error ? <p role="alert" className="mt-4 text-danger">{error.message}</p> : null}
      {rows.length ? (
        <div className="panel mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-muted"><tr><th scope="col" className="px-4 py-2">When</th><th scope="col" className="px-4 py-2">Who</th><th scope="col" className="px-4 py-2">Action</th><th scope="col" className="px-4 py-2">Workspace</th><th scope="col" className="px-4 py-2">Details</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="whitespace-nowrap px-4 py-2 text-muted">{new Date(r.created_at).toLocaleString("en-GB")}</td>
                <td className="px-4 py-2">{r.admin_email ?? "system"}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-2">{r.org_id ? <Link className="text-accent" href={q({ org: r.org_id })}>{r.org_name ?? r.org_id.slice(0, 8)}</Link> : "—"}</td>
                <td className="px-4 py-2 text-xs text-muted">{Object.keys(r.metadata ?? {}).length ? Object.entries(r.metadata).map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join(" · ") : r.target ?? ""}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div className="mt-4"><EmptyState icon="history" title="No entries">Nothing matches this filter yet.</EmptyState></div>}
      {rows.length === 50 ? <p className="mt-4"><Link className="btn btn-secondary" href={q({ before: String(rows[rows.length - 1]!.id) })}>Older entries</Link></p> : null}
    </>
  );
}
