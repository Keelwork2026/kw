import Link from "next/link";
import { HeroPrompt } from "@/components/marketing/hero-prompt";
import { SITES, SITE_CATEGORIES, siteBySlug } from "@/lib/sites";
import { SiteThumb } from "@/components/sites/site-card";
import { Art } from "@/components/sites/art";
import { HeroInterface } from "@/components/marketing/hero-interface";
import { FEATURES, SOLUTIONS, FAQ } from "@/lib/site/content";
import { Icon } from "@/components/marketing/icon";


const CAPTIONS = ["a booking app", "a portfolio", "a client portal", "an online shop"];

const INSIDE: [string, string, string][] = [
  ["harbour-kitchen", "menu", "Restaurant menu"], ["clay-and-co", "shop/stoneware-mug", "Product page"], ["summit-2027", "schedule", "Event schedule"],
  ["keystone-homes", "properties/family-home", "Property listing"], ["northbank", "savings", "Rates table"], ["field-notes", "stories/city-rivers", "Long-read article"],
];

export default function HomePage() {
  return (
    <>
      {/* 1. Hero */}
      <section className="relative overflow-hidden px-4 pb-24 pt-20 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="kw-blob-a absolute -left-20 top-10 h-96 w-96 rounded-full bg-[#8b6cff]/25 blur-3xl" />
          <div className="kw-blob-b absolute right-0 top-0 h-[28rem] w-[28rem] rounded-full bg-[#ff5c8a]/25 blur-3xl" />
          <div className="kw-blob-c absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#ff8a4c]/25 blur-3xl" />
          <div className="kw-blob-a absolute bottom-10 right-1/4 h-64 w-64 rounded-full bg-[#ffc46b]/25 blur-3xl" />
          <div className="kw-blob-b absolute left-1/2 top-1/3 h-40 w-40 rounded-full bg-[#ff9ec0]/30 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl">
          <Link href="/sign-up" className="pill mx-auto border border-border bg-surface px-4 py-2 text-sm">
            <span className="rounded-full bg-highlight px-2 text-highlight-ink">New</span> Agents now test their own work
          </Link>
          <h1 className="mt-8 font-display font-bold leading-[0.92]" style={{ fontSize: "clamp(52px, 8.6vw, 128px)", letterSpacing: "-0.055em" }}>
            Build something <span className="text-gradient">gorgeous</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted md:text-xl">
            Turn ideas into real apps and websites by chatting with AI. Design it, ship it, own every line.
          </p>
          <p className="mt-3 h-6 overflow-hidden text-sm text-muted" aria-hidden>
            Today someone is building <span className="kw-rise inline-block font-serif text-base italic text-text">{CAPTIONS[0]}</span>
          </p>
          <HeroPrompt />
          <HeroInterface />
        </div>
      </section>

      {/* Explore by category */}
      <section id="categories" className="mx-auto max-w-7xl px-4 py-20" aria-labelledby="cat-h">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="cat-h" className="max-w-2xl text-3xl md:text-5xl">Start with a website <span className="font-serif font-normal italic">for your kind of work</span></h2>
          <Link href="/starters" className="btn btn-secondary">All templates</Link>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SITE_CATEGORIES.map((c) => {
            const t = SITES.find((s) => s.category === c)!;
            const hero = t.pages[0]!.sections.find((x) => x.t === "hero");
            const img = hero && "img" in hero && hero.img ? hero.img : { art: "abstract" as const, alt: "" };
            return (
              <li key={c}><Link href={`/starters?q=${encodeURIComponent(c)}#gallery`} className="group block overflow-hidden rounded-3xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-accent">
                <div className="aspect-[4/3] overflow-hidden"><Art kind={img.art} palette={t.palette} seed={img.seed} alt="" className="h-full w-full transition group-hover:scale-105" /></div>
                <p className="px-3 pb-3 pt-2.5 text-sm font-semibold leading-tight">{c}</p>
              </Link></li>
            );
          })}
        </ul>
      </section>

      {/* Featured templates */}
      <section id="templates" className="overflow-hidden border-y border-border bg-surface py-16" aria-labelledby="templates-h">
        <h2 id="templates-h" className="px-4 text-center text-3xl md:text-5xl">Complete websites, <span className="font-serif font-normal italic">not blank pages</span></h2>
        <p className="mx-auto mt-3 max-w-2xl px-4 text-center text-muted">Every template has real copy, original illustrations, working forms, legal pages and a proper footer. Preview them all without signing in.</p>
        <div className="mt-10 flex w-max gap-5 kw-marquee">
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex gap-5" aria-hidden={copy === 1 ? true : undefined}>
              {SITES.map((t) => (
                <li key={t.slug}>
                  <Link href={`/starters/${t.slug}`} tabIndex={copy === 1 ? -1 : undefined} className="block w-80 rounded-3xl border border-border bg-bg p-3 hover:border-accent">
                    <SiteThumb site={t} className="rounded-2xl border border-border" />
                    <p className="mt-3 px-1 font-semibold">{t.name}</p>
                    <p className="px-1 pb-1 text-sm text-muted">{t.category} · {t.pages.length} pages</p>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
        <p className="mt-10 text-center"><Link href="/starters" className="btn btn-primary">Browse all {SITES.length} website templates</Link></p>
      </section>

      {/* 4. Bento */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24" aria-labelledby="features-h">
        <h2 id="features-h" className="max-w-3xl text-4xl md:text-6xl">Your whole product team, <span className="font-serif font-normal italic">in one chat.</span></h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Bento dark title="Chat to build" body="Describe it in your words. Keelwork plans, asks the right questions, then builds." className="md:col-span-2">
            <div aria-hidden className="mt-6 grid gap-2 text-sm">
              <div className="ml-auto w-fit rounded-2xl bg-white/10 px-4 py-2">Add a waitlist with email confirmation</div>
              <div className="w-fit rounded-2xl bg-highlight px-4 py-2 text-highlight-ink">Plan ready: 2 pages, 1 table, 1 automation</div>
            </div>
          </Bento>
          <Bento title="Click anything. Change it." body="Point at the preview and say what you want. Design mode knows which file and line." />
          <Bento title="A real backend, built in" body="Tables with row-level security, sign-in and storage — or bring Postgres, Appwrite or CloudBase." />
          <Bento title="A team, not a bot" body="Architect, database, backend, frontend, QA, security and docs agents review each other." />
          <Bento title="Live in one click" body="Deploy to your own Cloudflare account. Health-checked, with automatic rollback." />
          <Bento dark title="Every line is yours" body="Export the whole repository any time. No lock-in, no secrets in the archive." className="md:col-span-3">
            <pre aria-hidden className="mt-6 overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs text-ink-accent">{`export async function GET() {\n  return Response.json({ ok: true });\n}`}</pre>
          </Bento>
        </div>
      </section>

      {/* Inspiration: inside the templates */}
      <section className="mx-auto max-w-7xl px-4 pb-24" aria-labelledby="inside-h">
        <h2 id="inside-h" className="max-w-3xl text-3xl md:text-5xl">Every page <span className="font-serif font-normal italic">is already designed</span></h2>
        <p className="mt-3 max-w-2xl text-muted">Menus, product pages, schedules, property listings, rate tables, articles — open any of them.</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INSIDE.map(([slug, page, label]) => {
            const site = siteBySlug(slug)!;
            const p = site.pages.find((x) => x.slug === page)!;
            const img = p.sections.flatMap((x) => ("img" in x && x.img ? [x.img] : [])).at(0) ?? site.pages[0]!.sections.flatMap((x) => ("img" in x && x.img ? [x.img] : []))[0] ?? { art: "abstract" as const, alt: "" };
            return (
              <li key={slug + page}><a href={`/demo/${slug}/${page}`} target="_blank" rel="noopener" className="group block overflow-hidden rounded-3xl border border-border bg-surface hover:border-accent">
                <div className="aspect-[16/10] overflow-hidden"><Art kind={img.art} palette={site.palette} seed={img.seed} alt="" className="h-full w-full transition group-hover:scale-105" /></div>
                <div className="p-4"><p className="text-xs font-semibold uppercase tracking-wider text-accent">{label}</p><p className="mt-1 font-semibold">{p.title} <span className="font-normal text-muted">· {site.name}</span></p></div>
              </a></li>
            );
          })}
        </ul>
      </section>

      {/* 5. Steps band */}
      <section className="bg-ink px-4 py-24 text-ink-text" aria-labelledby="steps-h">
        <div className="mx-auto max-w-7xl">
          <h2 id="steps-h" className="max-w-3xl text-4xl md:text-6xl">Getting started <span className="font-serif font-normal italic text-ink-accent">in five steps.</span></h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-5">
            {[["01", "Pick a starting point", "Choose a template or describe your idea in a sentence."], ["02", "Tell us about you", "Your business, customers and goal. We write every page from it."], ["03", "Approve the plan", "Nothing is built until you've read and approved what will happen."], ["04", "Make it yours", "Edit any word, regenerate a section, or chat to change the design."], ["05", "Preview and publish", "Check desktop, tablet and mobile, then go live on your own domain."]].map(([n, t, b]) => (
              <li key={n} className="rounded-3xl border border-white/15 p-6"><p className="font-mono text-sm text-ink-accent">{n}</p><p className="mt-3 font-display text-2xl font-bold">{t}</p><p className="mt-2 text-white/80">{b}</p></li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. Teams */}
      <section id="teams" className="mx-auto max-w-7xl px-4 py-24" aria-labelledby="teams-h">
        <h2 id="teams-h" className="text-4xl md:text-6xl">Playful to use. <span className="font-serif font-normal italic">Serious underneath.</span></h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Isolated apps", "Generated code runs in sandboxes on separate hosts, never on ours."], ["Data kept apart", "Row-level security in the database separates every organization."], ["Activity log", "Every sensitive action is recorded in an append-only audit log."], ["Approvals", "Agents ask before installing packages, deleting files or going live."]].map(([t, b]) => (
            <div key={t} className="card"><p className="font-display text-xl font-bold">{t}</p><p className="mt-2 text-muted">{b}</p></div>
          ))}
        </div>
        <Link href="/solutions/enterprise" className="mt-8 inline-block font-semibold text-accent hover:underline">Keelwork for teams →</Link>
      </section>

      {/* Explore the product */}
      <section className="mx-auto max-w-7xl px-4 pb-24" aria-labelledby="explore-h">
        <h2 id="explore-h" className="max-w-3xl text-4xl md:text-5xl">Everything you need, <span className="font-serif font-normal italic">nothing you don&apos;t.</span></h2>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f.slug}><Link href={`/product/${f.slug}`} className="group flex h-full gap-4 rounded-3xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-accent"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl tile-${f.tint}`}><Icon name={f.icon} /></span><span><span className="block font-semibold group-hover:underline">{f.title}</span><span className="block text-sm text-muted">{f.tagline}</span></span></Link></li>
          ))}
        </ul>
      </section>

      {/* Made for */}
      <section className="border-y border-border bg-surface px-4 py-20" aria-labelledby="made-h">
        <div className="mx-auto max-w-7xl">
          <h2 id="made-h" className="text-3xl md:text-4xl">Made for how you work</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOLUTIONS.map((s) => (
              <li key={s.slug}><Link href={`/solutions/${s.slug}`} className="flex h-full flex-col rounded-3xl border border-border bg-bg p-6 hover:border-accent"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl tile-${s.tint}`}><Icon name={s.icon} /></span><span className="mt-4 font-display text-xl font-bold">{s.title}</span><span className="mt-1 text-muted">{s.tagline}</span><span className="mt-4 text-sm font-semibold text-accent">See how →</span></Link></li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-24" aria-labelledby="faq-h">
        <h2 id="faq-h" className="text-center text-3xl md:text-4xl">Questions, answered</h2>
        <div className="mt-10 grid gap-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-3xl border border-border bg-surface p-6 open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold">{f.q}<span aria-hidden className="text-2xl text-accent transition group-open:rotate-45">+</span></summary>
              <p className="mt-3 leading-7 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 7. Final CTA */}
      <section className="px-4 pb-28" aria-labelledby="cta-h">
        <div className="mx-auto max-w-4xl rounded-[36px] p-10 text-center text-white md:p-16" style={{ background: "var(--grad-button)" }}>
          <h2 id="cta-h" className="text-4xl md:text-6xl">What will you make today?</h2>
          <form action="/sign-up" method="get" className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <label htmlFor="cta-prompt" className="sr-only">Describe your idea</label>
            <input id="cta-prompt" name="prompt" maxLength={2000} placeholder="Describe your idea" className="input flex-1 border-white/30 text-[#1c1b19]" />
            <button type="submit" className="btn bg-highlight text-highlight-ink">Start free</button>
          </form>
          <p className="mt-4 text-sm text-white/90">No credit card. Your code, always.</p>
        </div>
      </section>
    </>
  );
}

function Bento({ title, body, dark, className = "", children }: { title: string; body: string; dark?: boolean; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-[28px] border p-7 ${dark ? "border-transparent bg-ink text-ink-text" : "border-border bg-surface"} ${className}`}>
      <p className="font-display text-2xl font-bold">{title}</p>
      <p className={`mt-2 ${dark ? "text-white/80" : "text-muted"}`}>{body}</p>
      {children}
    </div>
  );
}
