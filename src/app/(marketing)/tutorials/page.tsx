import Link from "next/link";
import { TUTORIALS } from "@/lib/site/content";
import { PageHero, CtaBand } from "@/components/site/blocks";

export const metadata = { title: "Tutorials", description: "Step-by-step guides: your first app, Design mode, payments, deploying and automations." };

export default function TutorialsPage() {
  return (
    <>
      <PageHero eyebrow="Learn by building" title="Tutorials that end with" accent="something live." intro="Short, practical guides. Each one finishes with a working result — a preview, a payment, a deployment — not just theory." />
      <section className="mx-auto max-w-7xl px-4 pb-6" aria-label="Tutorials">
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TUTORIALS.map((t, i) => (
            <li key={t.slug}>
              <Link href={`/tutorials/${t.slug}`} className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-border bg-surface hover:border-accent">
                <div aria-hidden className="relative h-36 overflow-hidden" style={{ background: ["var(--grad-art)", "linear-gradient(120deg,#8b6cff,#ff9ec0)", "linear-gradient(120deg,#ffb347,#ff5c8a)", "linear-gradient(120deg,#1c1b19,#6a4bdc)", "linear-gradient(120deg,#3fb37f,#ffc46b)"][i % 5] }}>
                  <span className="absolute left-5 top-5 font-mono text-5xl font-bold text-white/80">0{i + 1}</span>
                  <span className="kw-blob-a absolute -bottom-8 right-6 h-28 w-28 rounded-full bg-white/25 blur-xl" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-semibold text-muted">{t.level} · {t.minutes} min · {t.steps.length} steps</p>
                  <h2 className="mt-1 text-xl group-hover:underline">{t.title}</h2>
                  <p className="mt-2 text-sm text-muted">{t.summary}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <CtaBand title="Learn faster by building." sub="Open a template and follow along — every step happens in your own project." />
    </>
  );
}
