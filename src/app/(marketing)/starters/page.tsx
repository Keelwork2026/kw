import Link from "next/link";
import { SITES } from "@/lib/sites";
import { CATALOG, CATALOG_CATEGORIES } from "@/lib/catalog";
import { PageHero, CtaBand } from "@/components/site/blocks";
import { CatalogGallery } from "@/components/catalog/catalog-gallery";

export const metadata = { title: "Templates", description: `${CATALOG.length} website and app templates across ${CATALOG_CATEGORIES.length} categories. Search in plain words and preview every one live — no sign-in needed.` };

export default function StartersPage() {
  const apps = CATALOG.filter((e) => e.kind === "app").length;
  const totalPages = SITES.reduce((n, s) => n + s.pages.length, 0);
  return (
    <>
      <PageHero eyebrow={`${SITES.length} websites · ${totalPages} finished pages · ${apps} interactive apps`} title="Real websites and apps, ready to" accent="make yours." intro="Every template is complete and clickable — websites with real copy, working forms and legal pages; apps with dashboards, pipelines, forms and checkout you can try. Describe what you need, preview on desktop, tablet or phone, then build from it.">
        <Link href="#gallery" className="btn btn-primary">Browse templates</Link>
        <Link href="/sign-up" className="btn btn-secondary">Describe your own</Link>
      </PageHero>
      <section className="mx-auto max-w-7xl px-4 pb-10" aria-label="Templates">
        <CatalogGallery signedIn={false} />
        <div className="mt-12 grid gap-4 rounded-[28px] border border-border bg-surface p-8 md:grid-cols-4">
          {[["Complete, not blank", "Websites come with every page, legal pages and working forms; apps with real screens, states and flows."], ["Honest content", "Realistic sample content with clear placeholders for facts only you know. No invented reviews or statistics."], ["Checked before listing", "Every template passes automated checks before it's listed — links, alt text, SEO and data consistency."], ["Yours to change", "Use a template and the agents build it with your details. You approve the plan first."]].map(([t, b]) => (
            <div key={t}><p className="font-display text-lg font-bold">{t}</p><p className="mt-1 text-sm text-muted">{b}</p></div>
          ))}
        </div>
      </section>
      <CtaBand title="Can't find your idea? Describe it." sub="Every template started as a sentence. Yours can too." />
    </>
  );
}
