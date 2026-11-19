import Link from "next/link";
import { notFound } from "next/navigation";
import { STARTERS, starterBySlug, starterHref } from "@/lib/site/starters";
import { TemplatePreview } from "@/components/site/template-preview";
import { StarterCard, CtaBand } from "@/components/site/blocks";
import { SITES, siteBySlug, siteBrief, siteFeatures } from "@/lib/sites";
import { qaSite } from "@/lib/sites/qa";
import type { Site } from "@/lib/sites/types";
import { DevicePreview } from "@/components/sites/device-preview";
import { SiteCard, siteUseHref } from "@/components/sites/site-card";

export function generateStaticParams() { return [...SITES.map((s) => ({ slug: s.slug })), ...STARTERS.filter((s) => !siteBySlug(s.slug)).map((s) => ({ slug: s.slug }))]; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const site = siteBySlug(slug);
  if (site) return { title: `${site.name} — ${site.category} website template`, description: site.description };
  const s = starterBySlug(slug);
  return s ? { title: `${s.name} template`, description: s.tagline } : {};
}

export default async function StarterPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const site = siteBySlug(slug);
  if (site) return <SiteTemplate site={site} />;
  const s = starterBySlug(slug);
  if (!s) notFound();
  const related = STARTERS.filter((x) => x.slug !== s.slug && (x.category === s.category || x.stack === s.stack)).slice(0, 3);
  return (
    <>
      <section className="relative overflow-hidden px-4 pb-12 pt-12 md:pt-16">
        <div aria-hidden className="wash pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div className="rounded-[28px] border border-border bg-surface p-3 shadow-[0_50px_100px_-60px_rgba(28,27,25,0.6)]"><TemplatePreview starter={s} className="rounded-[18px]" /></div>
          <div>
            <nav aria-label="Breadcrumb" className="text-sm text-muted"><Link href="/starters" className="hover:text-text">Templates</Link> <span aria-hidden>/</span> {s.category}</nav>
            <h1 className="mt-3 text-4xl md:text-5xl" style={{ letterSpacing: "-0.045em" }}>{s.name}</h1>
            <p className="mt-3 text-lg text-muted">{s.description}</p>
            <p className="mt-4 text-sm"><span className="pill bg-surface-2">{s.stack}</span></p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={starterHref(s, false)} className="btn btn-gradient">Use this template</Link>
              <Link href="#brief" className="btn btn-secondary">Read the brief</Link>
            </div>
            <p className="mt-3 text-xs text-muted">Free to start. You review and approve the plan before anything is built.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 md:grid-cols-2" aria-label="What's included">
        <div className="card"><h2 className="text-xl">Pages</h2><ul className="mt-4 grid gap-2">{s.pages.map((pg, i) => <li key={pg} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-contrast">{i + 1}</span>{pg}</li>)}</ul></div>
        <div className="card"><h2 className="text-xl">Features</h2><ul className="mt-4 grid gap-2">{s.features.map((f) => <li key={f} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm"><span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-xs text-white">✓</span>{f}</li>)}</ul></div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-12" aria-labelledby="brief">
        <div className="card">
          <h2 id="brief" className="text-xl">The brief</h2>
          <p className="mt-1 text-sm text-muted">This is what the planner starts from. Change any of it on the Create Project page, or later in the chat.</p>
          <blockquote className="mt-4 rounded-2xl border-l-4 border-accent bg-surface-2 p-5 text-[15px] leading-7">{s.prompt}</blockquote>
          <Link href={starterHref(s, false)} className="btn btn-primary mt-5">Start with this brief</Link>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-6" aria-labelledby="how">
        <h2 id="how" className="text-2xl">How it comes together</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-4">
          {["Use the template — the brief is filled in", "Pick your backend and host", "Answer the planner's questions and approve", "Watch it build, preview it live, then deploy"].map((t, i) => (
            <li key={t} className="rounded-3xl border border-border bg-surface p-5"><p className="font-mono text-sm text-accent">0{i + 1}</p><p className="mt-2 font-semibold">{t}</p></li>
          ))}
        </ol>
      </section>
      {related.length ? (
        <section className="mx-auto max-w-7xl px-4 py-12" aria-labelledby="more"><h2 id="more" className="mb-6 text-2xl">You might also like</h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{related.map((r) => <li key={r.slug}><StarterCard s={r} href={starterHref(r, false)} /></li>)}</ul>
        </section>
      ) : null}
      <CtaBand />
    </>
  );
}

const LEGAL = ["privacy", "terms", "cookies"];

function SiteTemplate({ site }: { site: Site }) {
  const issues = qaSite(site);
  const pages = site.pages.map((p) => ({ slug: p.slug, title: p.title }));
  const related = SITES.filter((x) => x.slug !== site.slug && (x.category === site.category || x.voice === site.voice)).slice(0, 3);
  const fill = SITES.filter((x) => x.slug !== site.slug && !related.includes(x)).slice(0, 3 - related.length);
  const checks = [["Every link resolves", "links"], ["Page titles and descriptions", "seo"], ["Alt text on every image", "a11y"], ["No invented claims or reviews", "claims"], ["No filler or lorem ipsum", "content"], ["Privacy, terms and cookies", "legal"]] as const;
  return (
    <>
      <section className="relative overflow-hidden px-4 pb-10 pt-10 md:pt-14">
        <div aria-hidden className="wash pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="text-sm text-muted"><Link href="/starters" className="hover:text-text">Templates</Link> <span aria-hidden>/</span> {site.category}</nav>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl" style={{ letterSpacing: "-0.045em" }}>{site.name}</h1>
              <p className="mt-3 text-lg text-muted">{site.description}</p>
              <p className="mt-4 flex flex-wrap gap-2 text-sm"><span className="pill bg-surface-2">{site.category}</span><span className="pill bg-surface-2">{site.style}</span><span className="pill bg-surface-2">{site.pages.length} pages</span><span className="pill bg-surface-2">Responsive</span><span className="pill bg-surface-2">{site.voice} tone</span></p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={siteUseHref(site)} className="btn btn-gradient">Use this template</Link>
              <Link href="#customise" className="btn btn-secondary">How to customise</Link>
            </div>
          </div>
          <div className="mt-8"><DevicePreview slug={site.slug} pages={pages} /></div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 md:grid-cols-3" aria-label="What's included">
        <div className="card"><h2 className="text-xl">Pages</h2><ul className="mt-4 grid gap-2">{site.pages.filter((p) => !LEGAL.includes(p.slug)).map((pg, i) => <li key={pg.slug}><a href={`/demo/${site.slug}${pg.slug ? `/${pg.slug}` : ""}`} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm hover:underline"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-contrast">{i + 1}</span>{pg.title}</a></li>)}<li className="px-3 pt-1 text-xs text-muted">Plus {site.pages.filter((p) => LEGAL.includes(p.slug)).map((p) => p.title.toLowerCase()).join(", ")}.</li></ul></div>
        <div className="card"><h2 className="text-xl">Features</h2><ul className="mt-4 grid gap-2">{siteFeatures(site).map((f) => <li key={f} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm"><span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-xs text-white">✓</span>{f}</li>)}</ul></div>
        <div className="card"><h2 className="text-xl">Quality checks</h2><p className="mt-1 text-sm text-muted">Run automatically before this template was listed.</p><ul className="mt-4 grid gap-2">{checks.map(([label, rule]) => { const ok = !issues.some((i) => i.rule === rule); return <li key={rule} className="flex items-center gap-3 text-sm"><span aria-hidden className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${ok ? "bg-success" : "bg-danger"}`}>{ok ? "✓" : "!"}</span>{label}<span className="sr-only">{ok ? "passed" : "needs attention"}</span></li>; })}</ul></div>
      </section>
      <section id="customise" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-12" aria-labelledby="customise-title">
        <div className="card">
          <h2 id="customise-title" className="text-xl">Make it yours</h2>
          <p className="mt-1 text-sm text-muted">Highlighted “Add your …” labels mark facts only you can supply — phone, address, prices, registration numbers. Examples marked as samples (reviews, figures) are there to show the layout and must be replaced with real ones.</p>
          <ol className="mt-5 grid gap-4 md:grid-cols-4">
            {["Use the template — the brief below is filled in", "Add your business details and voice", "Approve the plan the agents propose", "Preview live, then publish on your domain"].map((t, i) => <li key={t} className="rounded-3xl border border-border bg-surface-2 p-5"><p className="font-mono text-sm text-accent">0{i + 1}</p><p className="mt-2 font-semibold">{t}</p></li>)}
          </ol>
          <h3 className="mt-8 text-lg">The brief</h3>
          <blockquote className="mt-3 rounded-2xl border-l-4 border-accent bg-surface-2 p-5 text-[15px] leading-7">{siteBrief(site)}</blockquote>
          <Link href={siteUseHref(site)} className="btn btn-primary mt-5">Start with this template</Link>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12" aria-labelledby="more"><h2 id="more" className="mb-6 text-2xl">You might also like</h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[...related, ...fill].map((r) => <li key={r.slug}><SiteCard site={r} /></li>)}</ul>
      </section>
      <CtaBand />
    </>
  );
}
