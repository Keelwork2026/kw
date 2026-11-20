import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { createOrganization, updateProfile, renameOrganization } from "./actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, org, can, user } = await requireOrg();
  const { data: profile } = await supabase.from("profiles").select("display_name, experience").eq("id", user.id).maybeSingle();
  const links = [
    { href: "/settings/security", title: "Security", body: "Password, two-step verification and sessions.", show: true },
    { href: "/settings/audit", title: "Audit log", body: "Every sensitive action in this organization.", show: can("audit.read") },
    { href: "/settings/support", title: "Support access", body: "Approve or revoke time-limited, read-only support access.", show: can("org.manage") },
    { href: "/team", title: "Team", body: "Members, roles and invitations.", show: true },
    { href: "/settings/policy", title: "Policy reviews", body: "Anything Keelwork declined to build, and asking for a review.", show: true },
  ];
  return (
    <>
      <PageHeader title="Settings" description={`${org.name} · your role: ${org.role}`} />
      <ul className="grid gap-4 sm:grid-cols-2">
        {links.filter((l) => l.show).map((l) => (
          <li key={l.href}><Link className="panel block p-5 hover:border-accent" href={l.href}><p className="font-semibold">{l.title}</p><p className="mt-1 text-sm text-muted">{l.body}</p></Link></li>
        ))}
      </ul>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="panel p-6" aria-labelledby="profile">
          <h2 id="profile" className="text-xl">Your profile</h2>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
          <ActionForm action={updateProfile} submitLabel="Save profile" className="mt-4 grid gap-3">
            <div><label className="label" htmlFor="displayName">Name</label><input id="displayName" name="displayName" required maxLength={80} defaultValue={(profile?.display_name as string | null) ?? ""} className="input" autoComplete="name" /></div>
            <div>
              <label className="label" htmlFor="experience">Building experience</label>
              <select id="experience" name="experience" defaultValue={(profile?.experience as string | null) ?? ""} className="input">
                <option value="">Prefer not to say</option>
                <option value="new">New to building apps</option>
                <option value="some">Built a few things</option>
                <option value="developer">Developer</option>
              </select>
              <p className="mt-1 text-xs text-muted">Used only to choose how much guidance to show. <Link href="/welcome" className="font-semibold text-accent hover:underline">Run the welcome tour again</Link></p>
            </div>
          </ActionForm>
        </section>
        {can("org.manage") ? (
          <section className="panel p-6" aria-labelledby="org-name-h">
            <h2 id="org-name-h" className="text-xl">Organization name</h2>
            <p className="mt-1 text-sm text-muted">Shown to members and in invitations. Owners and admins can change it; it&apos;s recorded in the audit log.</p>
            <ActionForm action={renameOrganization} submitLabel="Rename" className="mt-4">
              <label className="label" htmlFor="orgName">Name</label>
              <input id="orgName" name="orgName" required maxLength={80} defaultValue={org.name} className="input" />
            </ActionForm>
          </section>
        ) : null}
      </div>
      <section className="panel mt-6 max-w-lg p-6" aria-labelledby="new-org">
        <h2 id="new-org" className="text-xl">New organization</h2>
        <p className="mt-1 text-sm text-muted">You&apos;ll be its owner.</p>
        <ActionForm action={createOrganization} submitLabel="Create organization" className="mt-4">
          <label className="label" htmlFor="org-name">Name</label>
          <input id="org-name" name="name" required maxLength={80} className="input" />
        </ActionForm>
      </section>
    </>
  );
}
