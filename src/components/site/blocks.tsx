import Link from "next/link";
import { TemplatePreview } from "./template-preview";
import type { Starter } from "@/lib/site/starters";

export function PageHero({ eyebrow, title, accent, intro, children }: { eyebrow: string; title: string; accent?: string; intro: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden px-4 pb-14 pt-16 md:pt-24">
      <div aria-hidden className="wash pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-5xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{eyebrow}</p>
        <h1 className="mt-5 text-4xl md:text-6xl" style={{ letterSpacing: "-0.045em" }}>{title}{accent ? <> <span className="font-serif font-normal italic text-gradient">{accent}</span></> : null}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">{intro}</p>
        {children ? <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

export function SectionTitle({ id, kicker, title, sub }: { id: string; kicker?: string; title: string; sub?: string }) {
  return (
    <div className="mb-8 max-w-3xl">
      {kicker ? <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">{kicker}</p> : null}
      <h2 id={id} className="mt-2 text-3xl md:text-4xl">{title}</h2>
      {sub ? <p className="mt-3 text-muted">{sub}</p> : null}
    </div>
  );
}

export function CtaBand({ title = "Your next idea is one sentence away.", sub = "Start free. Approve the plan before anything is built. Keep every line of code." }: { title?: string; sub?: string }) {
  return (
    <section className="px-4 py-20" aria-labelledby="cta-band">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] p-10 text-center text-white md:p-16" style={{ background: "var(--grad-button)" }}>
        <div aria-hidden className="kw-blob-a absolute -left-10 -top-10 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
        <div aria-hidden className="kw-blob-b absolute -bottom-16 right-0 h-64 w-64 rounded-full bg-[#ffc46b]/30 blur-3xl" />
        <h2 id="cta-band" className="relative text-3xl md:text-5xl">{title}</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-white/90">{sub}</p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/sign-up" className="btn bg-white text-[#1c1b19] hover:bg-white/90">Start building free</Link>
          <Link href="/starters" className="btn border border-white/50 text-white hover:bg-white/10">Browse templates</Link>
        </div>
      </div>
    </section>
  );
}

export function StarterCard({ s, href, cta = "Use this template" }: { s: Starter; href: string; cta?: string }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-border bg-surface transition hover:-translate-y-0.5 hover:shadow-[0_30px_60px_-40px_rgba(28,27,25,0.45)]">
      <Link href={`/starters/${s.slug}`} className="block p-3 pb-0" aria-label={`${s.name} — details`}>
        <TemplatePreview starter={s} className="rounded-[14px] transition group-hover:scale-[1.01]" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2"><h3 className="text-lg"><Link href={`/starters/${s.slug}`} className="hover:underline">{s.name}</Link></h3><span className="pill bg-surface-2">{s.category}</span></div>
        <p className="mt-1 text-sm text-muted">{s.tagline}</p>
        <p className="mt-3 text-xs text-muted">{s.stack} · {s.pages.length} pages · {s.features.length} features</p>
        <div className="mt-4 flex gap-2 pt-1">
          <Link href={href} className="btn btn-primary min-h-10 flex-1 px-4">{cta}</Link>
          <Link href={`/starters/${s.slug}`} className="btn btn-secondary min-h-10 px-4">Details</Link>
        </div>
      </div>
    </article>
  );
}
