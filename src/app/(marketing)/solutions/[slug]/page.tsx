import Link from "next/link";
import { notFound } from "next/navigation";
import { SOLUTIONS, solutionBySlug, FEATURES } from "@/lib/site/content";
import { starterBySlug, starterHref } from "@/lib/site/starters";
import { PageHero, StarterCard, CtaBand } from "@/components/site/blocks";
import { FeatureVisual } from "@/components/site/feature-visual";
import { Icon } from "@/components/marketing/icon";

export function generateStaticParams() { return SOLUTIONS.map((s) => ({ slug: s.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const s = solutionBySlug((await params).slug);
  return s ? { title: `Keelwork for ${s.title.toLowerCase()}`, description: s.tagline } : {};
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const s = solutionBySlug((await params).slug);
  if (!s) notFound();
  const starters = s.starters.map(starterBySlug).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const features = s.features.map((f) => FEATURES.find((x) => x.slug === f)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  return (
    <>
      <PageHero eyebrow={`Keelwork for ${s.title.toLowerCase()}`} title={s.tagline} intro={s.intro}>
        <Link href="/sign-up" className="btn btn-gradient">Start building free</Link>
        <Link href="#starters" className="btn btn-secondary">See starters for {s.title.toLowerCase()}</Link>
      </PageHero>
      <section className="mx-auto max-w-7xl px-4 pb-6" aria-labelledby="jobs">
        <h2 id="jobs" className="text-2xl">What you can get done</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.jobs.map((j, i) => <li key={j} className="rounded-3xl border border-border bg-surface p-6"><span className={`flex h-10 w-10 items-center justify-center rounded-2xl font-display font-bold tile-${["orange", "pink", "violet", "green"][i]}`}>{i + 1}</span><p className="mt-3 font-semibold">{j}</p></li>)}</ul>
      </section>
      {features[0] ? (
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-2 lg:items-center" aria-labelledby="feat">
          <div>
            <h2 id="feat" className="text-3xl">{features[0].title}: {features[0].tagline.toLowerCase()}</h2>
            <p className="mt-3 text-muted">{features[0].intro}</p>
            <ul className="mt-5 grid gap-3">{features.map((f) => <li key={f.slug}><Link href={`/product/${f.slug}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 hover:border-accent"><span className={`flex h-9 w-9 items-center justify-center rounded-xl tile-${f.tint}`}><Icon name={f.icon} /></span><span><span className="block font-semibold">{f.title}</span><span className="block text-sm text-muted">{f.tagline}</span></span></Link></li>)}</ul>
          </div>
          <FeatureVisual kind={features[0].visual} />
        </section>
      ) : null}
      <section id="starters" className="mx-auto max-w-7xl px-4 py-8" aria-labelledby="starters-h">
        <h2 id="starters-h" className="mb-6 text-2xl">Starters picked for {s.title.toLowerCase()}</h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{starters.map((st) => <li key={st.slug}><StarterCard s={st} href={starterHref(st, false)} /></li>)}</ul>
      </section>
      <CtaBand />
    </>
  );
}
