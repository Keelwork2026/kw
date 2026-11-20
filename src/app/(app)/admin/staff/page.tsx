import { requireStaff } from "@/lib/admin/server";
import { CAN, STAFF_ROLES } from "@/lib/admin/staff";
import { PageHeader, timeAgo } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { addStaff, removeStaff, setStaffRole } from "../actions";

export const metadata = { title: "Staff · back office" };

type Member = { user_id: string; email: string; role: string; note: string | null; created_at: string; added_by_email: string | null };

/** Who's on staff. Superadmins add, re-role and remove people; there is always at least one superadmin. */
export default async function AdminStaff() {
  const { supabase, user, role } = await requireStaff("staff");
  const { data } = await supabase.rpc("admin_list_staff");
  const staff = (data ?? []) as Member[];
  const manage = CAN.manageStaff(role);
  return (
    <>
      <PageHeader title="Staff" description="Everyone with access to this back office, and what each role can do. Every change is in the staff audit log." />
      <dl className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAFF_ROLES.map((r) => <div key={r.id} className="panel p-4"><dt className="font-semibold">{r.label} <span className="text-sm font-normal text-muted">· {staff.filter((s) => s.role === r.id).length}</span></dt><dd className="mt-1 text-sm text-muted">{r.summary}</dd></div>)}
      </dl>
      <ul className="grid gap-3">
        {staff.map((s) => (
          <li key={s.user_id} className="panel flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.email}{s.user_id === user.id ? <span className="ml-2 text-xs font-normal text-muted">(you)</span> : null}</p>
              <p className="text-xs text-muted">{STAFF_ROLES.find((r) => r.id === s.role)?.label} · since {timeAgo(s.created_at)}{s.added_by_email ? ` · added by ${s.added_by_email}` : ""}{s.note ? ` · ${s.note}` : ""}</p>
            </div>
            {manage ? (
              <>
                <ActionForm action={setStaffRole} submitLabel="Change role" submitClassName="btn btn-secondary min-h-10" className="flex flex-wrap items-center gap-2 [&>div]:mt-0">
                  <input type="hidden" name="userId" value={s.user_id} />
                  <label className="sr-only" htmlFor={`role-${s.user_id}`}>Role</label>
                  <select id={`role-${s.user_id}`} name="role" defaultValue={s.role} className="input min-h-10 w-40 py-0 text-sm">{STAFF_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
                </ActionForm>
                <ActionForm action={removeStaff} submitLabel="Remove" submitClassName="btn btn-danger min-h-10" className="[&>div]:mt-0" confirm={`Remove ${s.email} from staff? Their support access ends too.`}>
                  <input type="hidden" name="userId" value={s.user_id} />
                </ActionForm>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      {manage ? (
        <section className="card mt-8 max-w-2xl" aria-labelledby="add">
          <h2 id="add" className="text-lg">Add someone to staff</h2>
          <p className="mt-1 text-sm text-muted">They need a Keelwork account first. Give the narrowest role that covers their work.</p>
          <ActionForm action={addStaff} submitLabel="Add to staff" className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="email">Their account email</label><input id="email" name="email" type="email" required className="input" /></div>
            <div><label className="label" htmlFor="role">Role</label><select id="role" name="role" required defaultValue="support" className="input">{STAFF_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="note">Note (optional)</label><input id="note" name="note" maxLength={200} placeholder="e.g. Weekend support cover" className="input" /></div>
          </ActionForm>
        </section>
      ) : <p className="mt-6 text-sm text-muted">Only superadmins can change who&apos;s on staff.</p>}
    </>
  );
}
