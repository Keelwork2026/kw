import Link from "next/link";
import { requireStaff } from "@/lib/admin/server";
import { CAN } from "@/lib/admin/staff";
import { PageHeader, EmptyState, timeAgo } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { setUserBan } from "../actions";

export const metadata = { title: "People · back office" };

type Person = { id: string; email: string; created_at: string; last_sign_in_at: string | null; banned_until: string | null; staff_role: string | null; orgs: { id: string; name: string; role: string }[] };

/** Find people by email. Each search is recorded in the staff audit log. */
export default async function AdminPeople({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { supabase, role } = await requireStaff("people");
  const query = q.trim().slice(0, 100);
  const { data, error } = query.length >= 3 ? await supabase.rpc("admin_find_users", { p_query: query }) : { data: null, error: null };
  const people = (data ?? []) as Person[];

  return (
    <>
      <PageHeader title="People" description="Find an account by email to see its workspaces and sign-in activity. Searches are recorded in the staff audit log." />
      <form method="get" action="/admin/people" role="search" className="flex max-w-xl gap-2">
        <label htmlFor="q" className="sr-only">Email contains</label>
        <input id="q" name="q" defaultValue={query} minLength={3} maxLength={100} required placeholder="Email contains… (3+ characters)" className="input" autoComplete="off" />
        <button className="btn btn-primary">Search</button>
      </form>
      {error ? <p role="alert" className="mt-4 text-sm text-danger">{error.message}</p> : null}
      {query.length >= 3 && !error ? (
        people.length ? (
          <ul className="mt-6 grid gap-3">
            {people.map((p) => {
              const banned = p.banned_until && new Date(p.banned_until) > new Date();
              return (
                <li key={p.id} className="panel p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{p.email}</span>
                    {p.staff_role ? <span className="pill bg-text text-bg">staff · {p.staff_role}</span> : null}
                    {banned ? <span className="pill bg-[#fde8e4] text-[#a3281a]">banned</span> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">Joined {timeAgo(p.created_at)} · last signed in {p.last_sign_in_at ? timeAgo(p.last_sign_in_at) : "never"} · <span className="font-mono">{p.id}</span></p>
                  {p.orgs.length ? <p className="mt-2 text-sm">Workspaces: {p.orgs.map((o, i) => <span key={o.id}>{i ? ", " : ""}<Link className="font-semibold text-accent" href={`/admin/orgs/${o.id}`}>{o.name}</Link> <span className="text-muted">({o.role})</span></span>)}</p> : <p className="mt-2 text-sm text-muted">Not in any workspace.</p>}
                  {CAN.ban(role) && !p.staff_role ? (
                    <details className="mt-3">
                      <summary className="text-sm font-semibold text-accent">{banned ? "Lift the ban" : "Ban this account"}</summary>
                      <ActionForm action={setUserBan} submitLabel={banned ? "Lift ban" : "Ban account"} submitClassName={`btn ${banned ? "btn-secondary" : "btn-danger"} min-h-10`} className="mt-2 grid max-w-lg gap-2" confirm={banned ? undefined : `Ban ${p.email}? They're signed out everywhere and can't sign in.`}>
                        <input type="hidden" name="userId" value={p.id} /><input type="hidden" name="ban" value={banned ? "0" : "1"} />
                        <label className="label" htmlFor={`r-${p.id}`}>Reason (for the audit log)</label>
                        <input id={`r-${p.id}`} name="reason" required minLength={10} maxLength={300} className="input" />
                      </ActionForm>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : <div className="mt-6"><EmptyState icon="search" title="No accounts match">Check the spelling, or search a shorter part of the address.</EmptyState></div>
      ) : <p className="mt-4 text-sm text-muted">Type at least 3 characters of an email address.</p>}
    </>
  );
}
