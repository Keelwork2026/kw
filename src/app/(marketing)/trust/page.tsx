import Link from "next/link";
import { PageHero, CtaBand } from "@/components/site/blocks";

export const metadata = { title: "Security", description: "How Keelwork protects your code, secrets and data." };

const SECTIONS: { id: string; title: string; points: string[] }[] = [
  { id: "isolation", title: "Generated code runs in isolation", points: ["Every project builds in its own container on a separate sandbox host — never on Keelwork's web servers.", "Containers run as a non-root user with a read-only filesystem, no Linux capabilities, memory and process limits.", "Sandbox networking is restricted: no access to Keelwork's own services or private networks.", "Deleting files, pushing changes and running migrations wait for a person's approval."] },
  { id: "secrets", title: "Secrets stay secret", points: ["Each value is encrypted with its own key (AES-256-GCM, envelope encryption) and can't be read back — by you, agents or staff.", "Secrets are scrubbed from everything the AI models and logs see.", "Exports and deployments are scanned and blocked if a credential appears in code.", "Deploy credentials are used only by the deploy service and never passed to your app."] },
  { id: "access", title: "Access you control", points: ["Roles per organization: owner, admin, member, billing and viewer.", "Every table has row-level security; no anonymous writes.", "Staff see organization metadata only. Looking inside needs an owner-approved, read-only grant for 1–72 hours that can be ended early.", "Sensitive actions — sign-ins, role changes, secrets, deployments, approvals and support access — are written to an append-only audit log."] },
  { id: "shipping", title: "Safe to ship", points: ["Every change is tested in the sandbox; affected tests run first.", "Secret scanning, security review and dependency audits on demand and before release.", "Open critical findings block deployments from everyone, including agents.", "A deployment is live only after its health check passes; failed live checks roll back automatically on Cloudflare."] },
  { id: "ownership", title: "Your code is yours", points: ["Standard Next.js and TypeScript in a Git history.", "Export the full source as a ZIP whenever you like — env files and secrets are never included.", "Apps run in your own Cloudflare or Vercel account with your own database."] },
];

export default function SecurityPage() {
  return (
    <>
      <PageHero eyebrow="Trust" title="Built to be trusted with" accent="real products." intro="How Keelwork keeps generated code contained, secrets unreadable and you in control. Compliance checklists are not certifications — this page describes what the product actually does." />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-6 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="On this page" className="hidden lg:block"><ul className="sticky top-28 grid gap-1 text-sm">{SECTIONS.map((s) => <li key={s.id}><a href={`#${s.id}`} className="block rounded-xl px-3 py-2 text-muted hover:bg-surface-2 hover:text-text">{s.title}</a></li>)}</ul></nav>
        <div className="grid gap-6">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="rounded-[28px] border border-border bg-surface p-7">
              <p className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl font-display font-bold tile-${["violet", "pink", "blue", "green", "orange"][i]}`}>{i + 1}</p>
              <h2 id={`${s.id}-h`} className="mt-3 text-2xl">{s.title}</h2>
              <ul className="mt-4 grid gap-2">{s.points.map((p) => <li key={p} className="flex gap-3 text-[15px] leading-7"><span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{p}</li>)}</ul>
            </section>
          ))}
          <p className="text-sm text-muted">Found a vulnerability? Tell the operator of this installation privately before disclosing it. See also the <Link href="/privacy" className="font-semibold text-accent">privacy overview</Link> and <Link href="/status" className="font-semibold text-accent">system status</Link>.</p>
        </div>
      </div>
      <CtaBand />
    </>
  );
}
