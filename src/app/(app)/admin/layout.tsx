import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaffRole, sectionsFor, STAFF_ROLES } from "@/lib/admin/staff";
import { StaffNav } from "@/components/admin/staff-nav";

/** The staff back office: a header naming your role, and only the sections it can use. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_role");
  if (!isStaffRole(data)) notFound();
  const role = STAFF_ROLES.find((r) => r.id === data)!;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-2.5 text-sm">
        <span className="pill bg-text text-bg">Keelwork staff</span>
        <span className="font-semibold">{role.label}</span>
        <span className="text-muted">— {role.summary}</span>
      </div>
      <StaffNav sections={sectionsFor(data).map((s) => ({ slug: s.slug, label: s.label }))} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
