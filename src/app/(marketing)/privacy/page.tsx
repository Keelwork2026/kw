import Link from "next/link";
import { PageHero } from "@/components/site/blocks";

export const metadata = { title: "Privacy overview", description: "What Keelwork stores, what it never stores, and how analytics work." };

const ROWS: { title: string; body: string }[] = [
  { title: "What we store", body: "Your account (email and sign-in details), the organizations you belong to, your projects, plans, chat messages, build history, usage and billing records, and an audit log of sensitive actions." },
  { title: "What we never store in readable form", body: "Secrets you add are encrypted per value and can't be read back by anyone. Card details are handled by Stripe, not Keelwork." },
  { title: "Your app's data", body: "Apps you build use your own database and hosting accounts. Keelwork doesn't keep a copy of your users' data." },
  { title: "AI providers", body: "Plans and code requests are sent to the AI models configured for this installation. Secret-looking values are masked before anything is sent or logged." },
  { title: "Analytics", body: "Keelwork's own pages don't use advertising trackers. The optional analytics for apps you build are cookieless and don't identify individual visitors." },
  { title: "Staff access", body: "Staff see organization metadata only. Looking inside needs an owner's time-limited, read-only approval, and every step appears in your audit log." },
  { title: "Your choices", body: "Export your code any time. Owners can remove members, revoke support access and delete projects. Contact the operator of this installation to delete your account." },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Privacy overview" title="Your work stays" accent="yours." intro="A plain-language summary of how Keelwork handles data. The operator of this installation publishes the binding privacy policy for their service." />
      <section className="mx-auto max-w-4xl px-4 pb-20" aria-label="Privacy details">
        <dl className="grid gap-4 md:grid-cols-2">
          {ROWS.map((r) => <div key={r.title} className="rounded-3xl border border-border bg-surface p-6"><dt className="font-display text-lg font-bold">{r.title}</dt><dd className="mt-2 text-[15px] leading-7 text-muted">{r.body}</dd></div>)}
        </dl>
        <p className="mt-8 text-sm text-muted">See how secrets, isolation and access work on the <Link href="/trust" className="font-semibold text-accent">security page</Link>.</p>
      </section>
    </>
  );
}
