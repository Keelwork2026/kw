import Link from "next/link";
import type { Site } from "@/lib/sites/types";
import { siteFeatures, siteBrief } from "@/lib/sites";
import { plain } from "@/lib/sites/text";
import { Art } from "./art";

/** Where "Use this template" goes: sign-up (or Create Project when signed in) with the brief filled in. */
export function siteUseHref(site: Site): string {
  const q = new URLSearchParams({ template: site.slug, name: site.name, prompt: siteBrief(site) });
  return `/sign-up?${q.toString()}`;
}

/** A miniature of the template's real home page: its nav, hero headline and hero illustration. */
export function SiteThumb({ site, className = "" }: { site: Site; className?: string }) {
  const home = site.pages[0]!;
  const hero = home.sections.find((s) => s.t === "hero");
  const p = site.palette;
  const nav = site.pages.filter((x) => x.inNav !== false && x.slug && !["privacy", "terms", "cookies"].includes(x.slug)).slice(0, 4);
  const serif = site.fonts.display === "serif";
  return (
    <div className={`relative aspect-[4/3] overflow-hidden ${className}`} style={{ background: p.bg, color: p.ink }} aria-hidden>
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${p.line}` }}>
        <span className="h-3 w-3 rounded-full" style={{ background: p.accent }} />
        <span className="truncate text-[10px] font-bold" style={{ fontFamily: serif ? "var(--kw-serif)" : "var(--kw-grotesk)", fontStyle: serif ? "italic" : "normal" }}>{site.logo.word}</span>
        <span className="ml-auto hidden gap-2 sm:flex">{nav.map((n) => <span key={n.slug} className="text-[8px]" style={{ color: p.muted }}>{n.nav}</span>)}</span>
        <span className="rounded px-1.5 py-0.5 text-[8px] font-semibold" style={{ background: p.accent, color: p.onAccent }}>{site.primaryCta.label}</span>
      </div>
      <div className="grid h-[calc(100%-29px)] grid-cols-[1.1fr_1fr] items-center gap-3 p-3">
        <div>
          <p className="line-clamp-3 text-[15px] leading-[1.05]" style={{ fontFamily: serif ? "var(--kw-serif)" : "var(--kw-grotesk)", fontStyle: serif ? "italic" : "normal", fontWeight: serif ? 400 : 700, letterSpacing: "-0.02em" }}>{hero && "title" in hero ? plain(hero.title) : site.name}</p>
          <p className="mt-1.5 line-clamp-2 text-[8px] leading-snug" style={{ color: p.muted }}>{hero && "sub" in hero ? plain(hero.sub) : site.tagline}</p>
          <span className="mt-2 inline-block rounded px-2 py-1 text-[8px] font-semibold" style={{ background: p.accent, color: p.onAccent }}>{hero && "ctas" in hero && hero.ctas[0] ? hero.ctas[0].label : site.primaryCta.label}</span>
        </div>
        <div className="h-full overflow-hidden rounded-md">{hero && "img" in hero && hero.img ? <Art kind={hero.img.art} palette={p} seed={hero.img.seed} alt="" className="h-full w-full" /> : <Art kind="abstract" palette={p} alt="" className="h-full w-full" />}</div>
      </div>
    </div>
  );
}

export function SiteCard({ site }: { site: Site }) {
  const pages = site.pages.length;
  const feats = siteFeatures(site);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-border bg-surface transition hover:-translate-y-0.5 hover:shadow-[0_30px_60px_-40px_rgba(28,27,25,0.45)]">
      <Link href={`/starters/${site.slug}`} className="block p-3 pb-0" aria-label={`${site.name} — preview and details`}>
        <SiteThumb site={site} className="rounded-[14px] border border-border transition group-hover:scale-[1.01]" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2"><h3 className="text-lg"><Link href={`/starters/${site.slug}`} className="hover:underline">{site.name}</Link></h3><span className="pill shrink-0 bg-surface-2">{site.category}</span></div>
        <p className="mt-1 text-sm text-muted">{site.tagline}</p>
        <p className="mt-3 text-xs text-muted">{site.style} · {pages} pages · Responsive</p>
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Features">{feats.slice(0, 4).map((f) => <li key={f} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">{f}</li>)}</ul>
        <div className="mt-auto flex gap-2 pt-4">
          <Link href={siteUseHref(site)} className="btn btn-primary min-h-10 flex-1 px-4">Use template</Link>
          <Link href={`/demo/${site.slug}`} className="btn btn-secondary min-h-10 px-4" target="_blank" rel="noopener">Live demo</Link>
        </div>
      </div>
    </article>
  );
}
