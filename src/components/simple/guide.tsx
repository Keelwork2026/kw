"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { GLOSSARY, cheerFor, guideFor } from "@/lib/simple/content";
import { useSimpleMode } from "./toggle";

/** A word with a plain explanation that opens on tap, click or keyboard. */
export function Explain({ term, children }: { term: string; children?: React.ReactNode }) {
  const g = GLOSSARY[term];
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!g) return <>{children}</>;
  return (
    <span className="relative inline-block">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        className="kw-term">{children ?? g.word}<span aria-hidden className="kw-term-i">?</span></button>
      {open ? (
        <span id={id} role="note" className="kw-term-pop">
          <strong className="block">{g.word}</strong>{g.means} <span className="mt-1 block text-muted">{g.like}</span>
        </span>
      ) : null}
    </span>
  );
}

/**
 * The guide that walks beside you in Simple Mode: what this page is, a
 * familiar comparison, one step at a time with progress you can tick off,
 * the words worth knowing, and where to go next. Contextual to the page;
 * progress is remembered per page. Hidden in normal mode.
 */
export function SimpleGuide({ className = "" }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  const on = useSimpleMode();
  const g = guideFor(pathname);
  const store = `kw.simple.guide.${g.key}`;
  const [done, setDone] = useState(0);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setDone(Math.min(Number(window.localStorage.getItem(store) ?? 0) || 0, g.steps.length));
      setHidden(window.localStorage.getItem(`${store}.hidden`) === "1");
    } catch { setDone(0); setHidden(false); }
  }, [store, g.steps.length]);
  const save = (n: number) => { setDone(n); try { window.localStorage.setItem(store, String(n)); } catch { /* not remembered */ } };
  const hide = (h: boolean) => { setHidden(h); try { window.localStorage.setItem(`${store}.hidden`, h ? "1" : "0"); } catch { /* not remembered */ } };
  if (!on) return null;

  const total = g.steps.length;
  const finished = done >= total;
  const current = g.steps[Math.min(done, total - 1)];

  if (hidden) {
    return (
      <div className={`mb-5 flex justify-end ${className}`}>
        <button type="button" onClick={() => hide(false)} className="kw-guide-reopen">Show the simple guide for this page</button>
      </div>
    );
  }

  return (
    <section aria-labelledby="kw-guide-title" className={`kw-guide mb-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">Simple guide</p>
          <h2 id="kw-guide-title" className="mt-0.5 text-xl md:text-2xl">{g.title}</h2>
        </div>
        <button type="button" onClick={() => hide(true)} className="text-sm font-semibold text-muted hover:text-text">Hide guide</button>
      </div>
      <p className="mt-2 text-base">{g.what}</p>
      {g.like ? <p className="kw-guide-like mt-3"><span className="mb-0.5 block text-xs font-semibold uppercase tracking-[0.08em] text-muted">In everyday words</span>{g.like}</p> : null}
      {g.why ? <p className="mt-2 text-sm text-muted"><strong className="text-text">Why it helps:</strong> {g.why}</p> : null}

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-semibold">{finished ? "All steps done" : `Step ${done + 1} of ${total}`}</p>
          <div aria-hidden className="h-2 w-40 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(Math.min(done, total) / total) * 100}%` }} /></div>
        </div>
        <ol className="mt-3 grid gap-2">
          {g.steps.map((s, i) => {
            const state = i < done ? "done" : i === done ? "now" : "later";
            return (
              <li key={s.title} aria-current={state === "now" ? "step" : undefined} className={`kw-guide-step kw-guide-${state}`}>
                <span aria-hidden className="kw-guide-num">{state === "done" ? "✓" : i + 1}</span>
                <span className="min-w-0"><span className="block font-semibold">{s.title}{state === "done" ? <span className="sr-only"> (done)</span> : null}</span>{state !== "later" ? <span className="block text-sm text-muted">{s.say}</span> : null}</span>
              </li>
            );
          })}
        </ol>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {finished ? (
            <>
              <p className="text-sm font-semibold text-success">That&apos;s all you need to do for now.</p>
              <button type="button" onClick={() => save(0)} className="text-sm font-semibold text-muted hover:text-text">Start the steps again</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => save(done + 1)} className="btn btn-primary min-h-10">{done + 1 === total ? "I did the last step" : `I did step ${done + 1} — what's next?`}</button>
              {done > 0 ? <button type="button" onClick={() => save(done - 1)} className="text-sm font-semibold text-muted hover:text-text">Go back a step</button> : null}
              <span className="text-sm text-muted">{current ? cheerFor(g.key) : null}</span>
            </>
          )}
          {g.next ? <Link href={g.next.href} className="ml-auto text-sm font-semibold text-accent">Next: {g.next.label} →</Link> : null}
        </div>
      </div>

      {g.terms?.length ? (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-sm font-semibold">Words you&apos;ll see here <span className="font-normal text-muted">— tap one to learn it</span></p>
          <p className="mt-2 flex flex-wrap gap-2">{g.terms.map((t) => <Explain key={t} term={t} />)}</p>
        </div>
      ) : null}
    </section>
  );
}
