import Link from "next/link";
import { PageHero } from "@/components/site/blocks";
import { CATEGORIES } from "@/lib/policy/policy";

export const metadata = { title: "Acceptable use", description: "What you can build on Keelwork — almost anything — and the narrow set of harmful functionality it won't build." };

const ALLOWED = [
  "Controversial or unpopular opinions, political and religious arguments",
  "Criticism of public figures, companies, institutions or governments",
  "Claims, allegations, negative reviews, complaints and whistleblowing",
  "Strong marketing claims, testimonials you supply, satire, parody and fiction",
  "Journalism, history, research and education about sensitive topics",
  "Apps in finance, healthcare, law, cybersecurity, crypto and other regulated fields",
];

const STEPS: [string, string][] = [
  ["Build by default", "Most requests — including sensitive subjects — are built normally. Keelwork never refuses because of a word or topic alone."],
  ["Ask when unclear", "If a feature's purpose is genuinely unclear, the planner asks one short question instead of guessing."],
  ["Decline a feature, build the rest", "If one feature would do something harmful, only that feature is left out — the plan shows what, why, and a safe alternative."],
  ["Refuse a harmful project", "Projects designed for one of the activities below aren't built. You're told specifically why, without accusations."],
  ["Review", "Every refusal is listed under Settings → Policy reviews. Ask for a review; staff look at what the software does. If they overturn it, that request goes through."],
];

export default function AcceptableUsePage() {
  return (
    <>
      <PageHero eyebrow="Acceptable use" title="Build what you want." accent="Not what harms people." intro="Keelwork regulates what software does — not opinions, claims, wording or subject matter. The operator of this installation may add terms for their own service." />
      <section className="mx-auto grid max-w-5xl gap-8 px-4 pb-12 md:grid-cols-2" aria-label="What's allowed">
        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="font-display text-xl font-bold">Allowed — including</h2>
          <ul className="mt-3 grid gap-2 text-[15px] text-muted">{ALLOWED.map((a) => <li key={a} className="flex gap-2"><span aria-hidden className="text-success">✓</span>{a}</li>)}</ul>
          <p className="mt-4 text-sm text-muted">Content you put in your app — text, quotes, reviews, documents — is treated as your content, not as instructions to Keelwork.</p>
        </div>
        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="font-display text-xl font-bold">How decisions are made</h2>
          <ol className="mt-3 grid gap-3">{STEPS.map(([t, b], i) => <li key={t} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-soft-accent text-sm font-bold text-soft-accent-ink">{i + 1}</span><span><span className="font-semibold">{t}.</span> <span className="text-[15px] text-muted">{b}</span></span></li>)}</ol>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-20" aria-labelledby="prohibited">
        <h2 id="prohibited" className="font-display text-2xl font-bold">Functionality Keelwork won&apos;t build</h2>
        <p className="mt-2 max-w-3xl text-muted">These are about what the software does. Each area has legitimate versions, which are welcome.</p>
        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <div key={k} className="rounded-3xl border border-border bg-surface p-5">
              <dt className="font-semibold">{c.title}</dt>
              <dd className="mt-1 text-sm text-muted">Welcome: {c.allowed}.</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-sm text-muted">Repeated attempts to get around these limits can lead to restrictions on an account, in proportion to what happened. See also the <Link href="/privacy" className="font-semibold text-accent">privacy overview</Link> and <Link href="/trust" className="font-semibold text-accent">security</Link>.</p>
      </section>
    </>
  );
}
