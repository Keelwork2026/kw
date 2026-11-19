import Link from "next/link";
import { notFound } from "next/navigation";
import { FEATURES, featureBySlug, SOLUTIONS } from "@/lib/site/content";
import { STARTERS, starterHref } from "@/lib/site/starters";
import { FeatureVisual } from "@/components/site/feature-visual";
import { CtaBand, StarterCard } from "@/components/site/blocks";
import { Icon } from "@/components/marketing/icon";

export function generateStaticParams() { return FEATURES.map((f) => ({ slug: f.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const f = featureBySlug((await params).slug);
  return f ? { title: f.title, description: f.tagline } : {};
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const f = featureBySlug((await params).slug);
  if (!f) notFound();
  const related = f.related.map((r) => FEATURES.find((x) => x.slug === r)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const forWho = SOLUTIONS.filter((s) => s.features.includes(f.slug)).slice(0, 3);
  const starters = STARTERS.slice(0, 3);
  return (
    <>
      <section className="relative overflow-hidden px-4 pb-14 pt-14 md:pt-20">
        <div aria-hidden className="wash pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <nav aria-label="Breadcrumb" className="text-sm text-muted"><Link href="/" className="hover:text-text">Product</Link> <span aria-hidden>/</span> {f.title}</nav>
            <p className={`mt-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl tile-${f.tint}`}><Icon name={f.icon} /></p>
            <h1 className="mt-4 text-4xl md:text-6xl" style={{ letterSpacing: "-0.045em" }}>{f.title}</h1>
            <p className="mt-3 font-display text-xl font-semibold text-gradient">{f.tagline}</p>
            <p className="mt-4 text-lg text-muted">{f.intro}</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/sign-up" className="btn btn-gradient">Try it free</Link><Link href="/starters" className="btn btn-secondary">Start from a template</Link></div>
          </div>
          <FeatureVisual kind={f.visual} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12" aria-labelledby="why">
        <h2 id="why" className="sr-only">What you get</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {f.points.map((pt) => <li key={pt.title} className="rounded-3xl border border-border bg-surface p-6"><p className="font-display text-lg font-bold">{pt.title}</p><p className="mt-2 text-sm text-muted">{pt.body}</p></li>)}
        </ul>
      </section>

      <section className="bg-ink px-4 py-16 text-ink-text" aria-labelledby="steps">
        <div className="mx-auto max-w-7xl">
          <h2 id="steps" className="text-3xl md:text-4xl">How it works</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {f.steps.map((s, i) => <li key={s} className="rounded-3xl border border-white/15 p-6"><p className="font-mono text-sm text-ink-accent">0{i + 1}</p><p className="mt-3 text-lg font-semibold">{s}</p></li>)}
          </ol>
          <p className="mt-6 text-sm text-ink-text/70">In the app: <span className="font-mono">{f.appPath}</span> — every page has hints on what you can do there.</p>
        </div>
      </section>

      {forWho.length ? (
        <section className="mx-auto max-w-7xl px-4 pt-16" aria-labelledby="who">
          <h2 id="who" className="text-2xl">Loved by</h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">{forWho.map((s) => <li key={s.slug}><Link href={`/solutions/${s.slug}`} className="flex h-full gap-4 rounded-3xl border border-border bg-surface p-5 hover:border-accent"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl tile-${s.tint}`}><Icon name={s.icon} /></span><span><span className="block font-semibold">{s.title}</span><span className="block text-sm text-muted">{s.tagline}</span></span></Link></li>)}</ul>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 pt-16" aria-labelledby="try">
        <h2 id="try" className="mb-6 text-2xl">Try it on a template</h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{starters.map((s) => <li key={s.slug}><StarterCard s={s} href={starterHref(s, false)} /></li>)}</ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16" aria-labelledby="related">
        <h2 id="related" className="text-2xl">Works well with</h2>
        <ul className="mt-5 grid gap-4 md:grid-cols-3">{related.map((r) => <li key={r.slug}><Link href={`/product/${r.slug}`} className="flex h-full gap-4 rounded-3xl border border-border bg-surface p-5 hover:border-accent"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl tile-${r.tint}`}><Icon name={r.icon} /></span><span><span className="block font-semibold">{r.title}</span><span className="block text-sm text-muted">{r.tagline}</span></span></Link></li>)}</ul>
      </section>
      <CtaBand />
    </>
  );
}
