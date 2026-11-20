import Link from "next/link";
import { TemplatePreview } from "./site/template-preview";
import { starterHref, type Starter } from "@/lib/site/starters";
import type { progress as computeProgress } from "@/lib/engagement";

/**
 * Dashboard row: pick up where you left off, the milestones you have
 * reached (no streaks or countdowns), and three ideas for today.
 */
export function Momentum({ last, next, progress, ideas }: {
  last: { id: string; name: string; status: string; updated_at: string } | null;
  /** The real next step for the last project (from lib/journey), if there is one. */
  next: { title: string; href: string } | null;
  progress: ReturnType<typeof computeProgress>;
  ideas: Starter[];
}) {
  return (
    <section aria-label="Keep building" className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl p-6 text-white" style={{ background: "var(--grad-button)" }}>
          <div aria-hidden className="kw-blob-a absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
          <p className="relative text-xs font-bold uppercase tracking-[0.12em] text-white/85">Continue building</p>
          {last ? (
            <>
              <p className="relative mt-2 font-display text-2xl font-bold">{last.name}</p>
              <p className="relative mt-1 text-sm text-white/85">{next ? `Next: ${next.title.charAt(0).toLowerCase()}${next.title.slice(1)}` : "Nothing is waiting on you here."}</p>
              <Link href={next?.href ?? `/projects/${last.id}`} className="btn relative mt-5 bg-white text-[#1c1b19] hover:bg-white/90">{next ? next.title : "Open project"} →</Link>
            </>
          ) : (
            <>
              <p className="relative mt-2 font-display text-2xl font-bold">Your first project</p>
              <p className="relative mt-1 text-sm text-white/85">One sentence is enough to start.</p>
              <Link href="#quick-idea" className="btn relative mt-5 bg-white text-[#1c1b19] hover:bg-white/90">Start building →</Link>
            </>
          )}
        </div>
        <div className="rounded-3xl border border-border bg-surface p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Your progress</p>
          <p className="mt-2 font-display text-4xl font-bold">{progress.done}<span className="ml-1 text-base font-semibold text-muted">of {progress.total} milestones</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Workspace setup">
            <div className="h-full rounded-full" style={{ width: `${progress.percent}%`, background: "var(--grad-art)" }} />
          </div>
          {progress.next ? (
            <p className="mt-3 text-sm text-muted">Next, when you&apos;re ready: <Link href={progress.next.href} className="font-semibold text-accent hover:underline">{progress.next.label.toLowerCase()}</Link>.</p>
          ) : (
            <p className="mt-3 text-sm text-muted">Every setup milestone reached. Nicely done.</p>
          )}
          {progress.reached.length > 0 && <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Milestones reached">{progress.reached.map((m) => <li key={m.key} className="rounded-full bg-soft-accent px-2.5 py-0.5 text-xs font-semibold text-accent">✓ {m.label}</li>)}</ul>}
        </div>
      </div>
      <div className="rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Ideas for today</p><Link href="/templates#starters" className="text-xs font-semibold text-accent">All templates →</Link></div>
        <ul className="mt-3 grid grid-cols-3 gap-3">
          {ideas.map((s) => (
            <li key={s.slug}>
              <Link href={starterHref(s, true)} className="group block" title={s.tagline}>
                <TemplatePreview starter={s} className="rounded-xl border border-border transition group-hover:-translate-y-0.5" idSuffix="-idea" />
                <span className="mt-2 block truncate text-sm font-semibold group-hover:underline">{s.name}</span>
                <span className="block truncate text-xs text-muted">{s.category}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
