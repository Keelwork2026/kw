import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { createOrganization } from "./actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { org, can } = await requireOrg();
  const links = [
    { href: "/settings/security", title: "Security", body: "Password, two-step verification and sessions.", show: true },
    { href: "/settings/audit", title: "Audit log", body: "Every sensitive action in this organization.", show: can("audit.read") },
    { href: "/settings/support", title: "Support access", body: "Approve or revoke time-limited, read-only support access.", show: can("org.manage") },
    { href: "/team", title: "Team", body: "Members, roles and invitations.", show: true },
  ];
  return (
    <>
      <PageHeader title="Settings" description={`${org.name} · your role: ${org.role}`} />
      <ul className="grid gap-4 sm:grid-cols-2">
        {links.filter((l) => l.show).map((l) => (
          <li key={l.href}><Link className="panel block p-5 hover:border-accent" href={l.href}><p className="font-semibold">{l.title}</p><p className="mt-1 text-sm text-muted">{l.body}</p></Link></li>
        ))}
      </ul>
      <section className="panel mt-10 max-w-lg p-6" aria-labelledby="new-org">
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
