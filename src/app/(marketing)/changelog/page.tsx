import { CHANGELOG } from "@/lib/site/content";
import { PageHero, CtaBand } from "@/components/site/blocks";

export const metadata = { title: "Changelog", description: "What shipped in Keelwork, and when." };

export default function ChangelogPage() {
  return (
    <>
      <PageHero eyebrow="Changelog" title="What's" accent="new." intro="Everything that shipped, newest first." />
      <section className="mx-auto max-w-3xl px-4 pb-10" aria-label="Releases">
        <ol className="relative grid gap-8 border-l border-border pl-8">
          {CHANGELOG.map((r) => (
            <li key={r.title} className="relative">
              <span aria-hidden className="absolute -left-[41px] top-1.5 h-4 w-4 rounded-full border-4 border-bg" style={{ background: "var(--grad-button)" }} />
              <p className="text-sm font-semibold text-muted"><time>{r.date}</time></p>
              <h2 className="mt-1 text-2xl">{r.title}</h2>
              <ul className="mt-3 grid gap-2">{r.items.map((it) => <li key={it} className="flex gap-2 rounded-2xl bg-surface p-3 text-sm"><span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{it}</li>)}</ul>
            </li>
          ))}
        </ol>
      </section>
      <CtaBand />
    </>
  );
}
