import Link from "next/link";
import { notFound } from "next/navigation";
import { TUTORIALS, tutorialBySlug } from "@/lib/site/content";
import { CtaBand } from "@/components/site/blocks";

export function generateStaticParams() { return TUTORIALS.map((t) => ({ slug: t.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const t = tutorialBySlug((await params).slug);
  return t ? { title: t.title, description: t.summary } : {};
}

export default async function TutorialPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = tutorialBySlug((await params).slug);
  if (!t) notFound();
  const i = TUTORIALS.indexOf(t);
  const next = TUTORIALS[(i + 1) % TUTORIALS.length]!;
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 pb-10 pt-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted"><Link href="/tutorials" className="hover:text-text">Tutorials</Link> <span aria-hidden>/</span> {t.level}</nav>
        <h1 className="mt-3 text-4xl md:text-5xl" style={{ letterSpacing: "-0.045em" }}>{t.title}</h1>
        <p className="mt-3 text-lg text-muted">{t.summary}</p>
        <p className="mt-3 text-sm text-muted">{t.minutes} minutes · {t.steps.length} steps</p>
        <ol className="mt-10 grid gap-6">
          {t.steps.map((s, n) => (
            <li key={s.title} className="relative rounded-3xl border border-border bg-surface p-6 pl-20">
              <span aria-hidden className="absolute left-6 top-6 flex h-9 w-9 items-center justify-center rounded-full font-display font-bold text-white" style={{ background: "var(--grad-button)" }}>{n + 1}</span>
              <h2 className="text-xl">{s.title}</h2>
              <p className="mt-2 leading-7 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-surface-2 p-6">
          <p><span className="block text-sm text-muted">Next tutorial</span><Link href={`/tutorials/${next.slug}`} className="font-display text-lg font-bold hover:underline">{next.title} →</Link></p>
          <Link href="/sign-up" className="btn btn-gradient">Follow along in Keelwork</Link>
        </div>
      </article>
      <CtaBand />
    </>
  );
}
