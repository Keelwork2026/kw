import { requireOrg } from "@/lib/org";
import { PageHeader, StatusPill, timeAgo } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { inviteMember, revokeInvitation, changeRole, changeStatus, removeMember } from "../settings/actions";

export const metadata = { title: "Team" };
const ROLES = ["owner", "admin", "member", "billing", "viewer"];

export default async function TeamPage() {
  const { supabase, org, can, user } = await requireOrg();
  const [{ data: members }, invites] = await Promise.all([
    supabase.from("org_members").select("user_id, role, status, created_at, profiles:user_id(email, display_name)").eq("org_id", org.id).order("created_at"),
    can("members.invite")
      ? supabase.from("invitations").select("id, email, role, expires_at, accepted_at, revoked_at, created_at").eq("org_id", org.id).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString())
      : Promise.resolve({ data: [] as { id: string; email: string; role: string; expires_at: string }[] }),
  ]);
  const manage = can("members.manage");

  return (
    <>
      <PageHeader title="Team" description="Members, roles and invitations. An organization always keeps at least one active owner." />
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Members</caption>
          <thead className="text-muted"><tr><th className="p-4">Member</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {(members ?? []).map((m) => {
              const p = m.profiles as unknown as { email: string | null; display_name: string | null } | null;
              return (
                <tr key={m.user_id} className="border-t border-border align-top">
                  <td className="p-4"><p className="font-semibold">{p?.display_name ?? "—"}{m.user_id === user.id ? " (you)" : ""}</p><p className="text-muted">{p?.email}</p></td>
                  <td className="p-4">
                    {manage ? (
                      <ActionForm action={changeRole} submitLabel="Save" submitClassName="btn btn-secondary min-h-9 px-3 text-xs" className="flex items-end gap-2">
                        <input type="hidden" name="user" value={m.user_id} />
                        <label className="sr-only" htmlFor={`role-${m.user_id}`}>Role</label>
                        <select id={`role-${m.user_id}`} name="role" defaultValue={m.role} className="input min-h-9 w-32 py-0 text-sm">
                          {ROLES.map((r) => <option key={r}>{r}</option>)}
                        </select>
                      </ActionForm>
                    ) : m.role}
                  </td>
                  <td className="p-4"><StatusPill status={m.status === "active" ? "live" : "paused"} /> <span className="sr-only">{m.status}</span></td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {manage && m.user_id !== user.id ? (
                        <ActionForm action={changeStatus} submitLabel={m.status === "active" ? "Suspend" : "Reactivate"} submitClassName="btn btn-secondary min-h-9 px-3 text-xs">
                          <input type="hidden" name="user" value={m.user_id} />
                          <input type="hidden" name="status" value={m.status === "active" ? "suspended" : "active"} />
                        </ActionForm>
                      ) : null}
                      {manage || m.user_id === user.id ? (
                        <ActionForm action={removeMember} submitLabel={m.user_id === user.id ? "Leave" : "Remove"} submitClassName="btn btn-danger min-h-9 px-3 text-xs" confirm="Remove this member from the organization?">
                          <input type="hidden" name="user" value={m.user_id} />
                        </ActionForm>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {can("members.invite") ? (
        <section className="mt-10 grid gap-6 lg:grid-cols-2" aria-labelledby="invite">
          <div className="panel p-6">
            <h2 id="invite" className="text-xl">Invite someone</h2>
            <ActionForm action={inviteMember} submitLabel="Send invitation" className="mt-4 grid gap-3">
              <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" /></div>
              <div><label className="label" htmlFor="role">Role</label>
                <select id="role" name="role" className="input" defaultValue="member">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
              </div>
            </ActionForm>
          </div>
          <div className="panel p-6">
            <h2 className="text-xl">Open invitations</h2>
            {invites.data?.length ? (
              <ul className="mt-3 grid gap-3 text-sm">
                {invites.data.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{i.email} · {i.role} · expires {timeAgo(i.expires_at)}</span>
                    <ActionForm action={revokeInvitation} submitLabel="Revoke" submitClassName="btn btn-secondary min-h-9 px-3 text-xs"><input type="hidden" name="id" value={i.id} /></ActionForm>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-muted">No open invitations. Invitations are single use and expire after 7 days.</p>}
          </div>
        </section>
      ) : null}
    </>
  );
}
