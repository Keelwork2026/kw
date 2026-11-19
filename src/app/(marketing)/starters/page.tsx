import Link from "next/link";
import { STARTERS, starterHref } from "@/lib/site/starters";
import { SITES, SITE_CATEGORIES, categorySlug, siteBySlug } from "@/lib/sites";
import { PageHero, StarterCard, CtaBand } from "@/components/site/blocks";
import { SiteCard } from "@/components/sites/site-card";

export const metadata = { title: "Templates", description: `${SITES.length} complete, multi-page website templates across ${SITE_CATEGORIES.length} industries, plus app starters. Preview every page live — no sign-in needed.` };

export default async function StartersPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const active = SITE_CATEGORIES.find((c) => categorySlug(c) === category);
  const list = active ? SITES.filter((s) => s.category === active) : SITES;
  const apps = STARTERS.filter((s) => !siteBySlug(s.slug));
  const totalPages = SITES.reduce((n, s) => n + s.pages.length, 0);
  return (
    <>
      <PageHero eyebrow={`${SITES.length} website templates · ${totalPages} finished pages`} title="Real websites, ready to" accent="make yours." intro="Every template is a complete, clickable website — real copy, original illustrations, working forms, legal pages and a footer that does its job. Preview any page on desktop, tablet or mobile, then build from it.">
        <Link href="#gallery" className="btn btn-primary">Browse templates</Link>
        <Link href="#apps" className="btn btn-secondary">App starters</Link>
      </PageHero>
      <section id="gallery" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-10" aria-label="Website templates">
        <nav aria-label="Categories" className="mb-8 flex flex-wrap gap-2">
          <Link href="/starters#gallery" aria-current={!active ? "page" : undefined} className={`pill min-h-9 px-4 ${!active ? "bg-brand text-brand-contrast" : "border border-border bg-surface hover:bg-surface-2"}`}>All ({SITES.length})</Link>
          {SITE_CATEGORIES.map((c) => (
            <Link key={c} href={`/starters?category=${categorySlug(c)}#gallery`} aria-current={active === c ? "page" : undefined} className={`pill min-h-9 px-4 ${active === c ? "bg-brand text-brand-contrast" : "border border-border bg-surface hover:bg-surface-2"}`}>{c}</Link>
          ))}
        </nav>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => <li key={s.slug}><SiteCard site={s} /></li>)}
        </ul>
        <div className="mt-12 grid gap-4 rounded-[28px] border border-border bg-surface p-8 md:grid-cols-4">
          {[["Complete, not blank", "Home, inner pages, detail pages, contact, privacy, terms and cookies — every link goes somewhere."], ["Honest content", "Realistic copy with clear placeholders for facts only you know. No invented reviews or statistics."], ["Checked before listing", "Every template passes automated checks for dead links, SEO, alt text and unsupported claims."], ["Yours to change", "Use a template and the agents build it with your details. You approve the plan first."]].map(([t, b]) => (
            <div key={t}><p className="font-display text-lg font-bold">{t}</p><p className="mt-1 text-sm text-muted">{b}</p></div>
          ))}
        </div>
      </section>
      <section id="apps" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10" aria-labelledby="apps-title">
        <h2 id="apps-title" className="text-3xl">App starters</h2>
        <p className="mt-2 max-w-2xl text-muted">Starting points for web apps with sign-in, data and dashboards. Each comes with a detailed brief the planner builds from.</p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{apps.map((s) => <li key={s.slug}><StarterCard s={s} href={starterHref(s, false)} /></li>)}</ul>
      </section>
      <CtaBand title="Can't find your idea? Describe it." sub="Every template started as a sentence. Yours can too." />
    </>
  );
}
