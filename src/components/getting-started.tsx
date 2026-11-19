"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export type Step = { key: string; label: string; hint: string; href: string; done: boolean };

const KEY = "kw.getting-started.hidden";

/**
 * Dashboard checklist from real data: each step ticks itself when the
 * workspace has actually done it. Hidden once everything is done, or when
 * the person hides it (remembered in this browser).
 */
export function GettingStarted({ steps }: { steps: Step[] }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { setHidden(window.localStorage.getItem(KEY) === "1"); } catch { /* show */ } }, []);
  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;
  const next = steps.find((s) => !s.done);
  return (
    <section aria-labelledby="getting-started" className="relative mb-8 overflow-hidden rounded-3xl border border-border bg-surface p-6">
      <div aria-hidden className="wash pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="getting-started" className="text-xl">Getting started</h2>
            <p className="text-sm text-muted">{done} of {steps.length} done{next ? ` · next: ${next.label.toLowerCase()}` : ""}</p>
          </div>
          <button type="button" onClick={() => { setHidden(true); try { window.localStorage.setItem(KEY, "1"); } catch { /* not remembered */ } }} className="text-xs font-semibold text-muted hover:text-text">Hide checklist</button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label="Setup progress">
          <div className="h-full rounded-full" style={{ width: `${(done / steps.length) * 100}%`, background: "var(--grad-art)" }} />
        </div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.key}>
              <Link href={s.href} className={`flex h-full gap-3 rounded-2xl border p-3 text-sm transition ${s.done ? "border-transparent bg-surface-2/70" : "border-border bg-surface hover:border-accent"}`}>
                <span aria-hidden className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.done ? "bg-success text-white" : s === next ? "bg-brand text-brand-contrast" : "bg-surface-2 text-muted"}`}>{s.done ? "✓" : i + 1}</span>
                <span><span className={`block font-semibold ${s.done ? "text-muted line-through decoration-1" : ""}`}>{s.label}</span><span className="block text-xs text-muted">{s.hint}</span></span>
                <span className="sr-only">{s.done ? "(done)" : "(not done yet)"}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
