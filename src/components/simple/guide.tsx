"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { GLOSSARY, cheerFor, guideFor, type Step } from "@/lib/simple/content";
import { GuideFeedback } from "./feedback";
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

/** Which steps the page shows as really done, re-checked as the page changes. */
function useAutoDone(steps: Step[], active: boolean): number {
  const [auto, setAuto] = useState(0);
  useEffect(() => {
    if (!active || !steps.some((s) => s.doneWhen)) { setAuto(0); return; }
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let n = 0;
        steps.forEach((s, i) => { try { if (s.doneWhen && document.querySelector(s.doneWhen)) n = i + 1; } catch { /* bad selector: ignore */ } });
        setAuto(n);
      });
    };
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-guide", "open"] });
    document.addEventListener("input", check, true);
    return () => { cancelAnimationFrame(frame); mo.disconnect(); document.removeEventListener("input", check, true); };
  }, [steps, active]);
  return auto;
}

/** Scrolls to what a step is about and lights it up for a moment. */
function showMe(selector: string) {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  el.classList.add("kw-spotlight");
  window.setTimeout(() => el.classList.remove("kw-spotlight"), 2600);
  if (el.matches("input, textarea, select, button, a[href], [tabindex]")) el.focus({ preventScroll: true });
}

function useIsPhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setPhone(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return phone;
}

/**
 * The guide that walks beside you in Simple Mode: what this page is, a
 * familiar comparison, one step at a time. Steps tick themselves when the
 * page shows they're really done (a key saved, a plan written), and "Show
 * me" scrolls to the right button. On phones, after the first visit, it
 * shrinks to one line you can open. Hidden in normal mode.
 */
export function SimpleGuide({ className = "" }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  const on = useSimpleMode();
  const phone = useIsPhone();
  const g = useMemo(() => guideFor(pathname), [pathname]);
  const store = `kw.simple.guide.${g.key}`;
  const [manual, setManual] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [seen, setSeen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [targets, setTargets] = useState<boolean[]>([]);
  const auto = useAutoDone(g.steps, on);
  useEffect(() => {
    try {
      setManual(Math.min(Number(window.localStorage.getItem(store) ?? 0) || 0, g.steps.length));
      setHidden(window.localStorage.getItem(`${store}.hidden`) === "1");
      setSeen(window.localStorage.getItem(`${store}.seen`) === "1");
      window.localStorage.setItem(`${store}.seen`, "1");
    } catch { setManual(0); setHidden(false); setSeen(false); }
    setExpanded(false);
  }, [store, g.steps.length]);
  useEffect(() => {
    if (!on) return;
    const t = window.setTimeout(() => setTargets(g.steps.map((s) => { try { return Boolean(s.target && document.querySelector(s.target)); } catch { return false; } })), 300);
    return () => window.clearTimeout(t);
  }, [on, g.steps, pathname]);
  const save = (n: number) => { setManual(n); try { window.localStorage.setItem(store, String(n)); } catch { /* not remembered */ } };
  const hide = (h: boolean) => { setHidden(h); try { window.localStorage.setItem(`${store}.hidden`, h ? "1" : "0"); } catch { /* not remembered */ } };
  if (!on) return null;

  const total = g.steps.length;
  const done = Math.min(Math.max(manual, auto), total);
  const finished = done >= total;
  const current = g.steps[Math.min(done, total - 1)]!;

  if (hidden) {
    return (
      <div className={`mb-5 flex justify-end ${className}`}>
        <button type="button" onClick={() => hide(false)} className="kw-guide-reopen">Show the simple guide for this page</button>
      </div>
    );
  }

  // Phones: after the first visit to a page, one line you can open.
  if (phone && seen && !expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} aria-expanded={false} className={`kw-guide kw-guide-line mb-5 ${className}`}>
        <span className="min-w-0 text-left">
          <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-accent">Simple guide · {finished ? "all done" : `step ${done + 1} of ${total}`}</span>
          <span className="block truncate font-semibold">{finished ? g.title : current.title}</span>
        </span>
        <span aria-hidden className="text-accent">Open ›</span>
      </button>
    );
  }

  return (
    <section aria-labelledby="kw-guide-title" className={`kw-guide mb-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">Simple guide</p>
          <h2 id="kw-guide-title" className="mt-0.5 text-xl md:text-2xl">{g.title}</h2>
        </div>
        <div className="flex gap-3">
          {phone ? <button type="button" onClick={() => { setSeen(true); setExpanded(false); }} className="text-sm font-semibold text-muted hover:text-text">Make smaller</button> : null}
          <button type="button" onClick={() => hide(true)} className="text-sm font-semibold text-muted hover:text-text">Hide guide</button>
        </div>
      </div>
      <p className="mt-2 text-base">{g.what}</p>
      {g.like ? <p className="kw-guide-like mt-3"><span className="mb-0.5 block text-xs font-semibold uppercase tracking-[0.08em] text-muted">In everyday words</span>{g.like}</p> : null}
      {g.why ? <p className="mt-2 text-sm text-muted"><strong className="text-text">Why it helps:</strong> {g.why}</p> : null}

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-semibold" aria-live="polite">{finished ? "All steps done" : `Step ${done + 1} of ${total}`}</p>
          <div aria-hidden className="h-2 w-40 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(done / total) * 100}%` }} /></div>
        </div>
        <ol className="mt-3 grid gap-2">
          {g.steps.map((s, i) => {
            const state = i < done ? "done" : i === done ? "now" : "later";
            return (
              <li key={s.title} aria-current={state === "now" ? "step" : undefined} className={`kw-guide-step kw-guide-${state}`}>
                <span aria-hidden className="kw-guide-num">{state === "done" ? "✓" : i + 1}</span>
                <span className="min-w-0 flex-1"><span className="block font-semibold">{s.title}{state === "done" ? <span className="sr-only"> (done)</span> : null}</span>{state !== "later" ? <span className="block text-sm text-muted">{s.say}</span> : null}</span>
                {state === "now" && s.target && targets[i] ? <button type="button" onClick={() => showMe(s.target!)} className="kw-showme">Show me</button> : null}
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
              {current.doneWhen ? (
                <p className="text-sm text-muted">This step ticks itself when you&apos;ve done it. {cheerFor(g.key)}</p>
              ) : (
                <>
                  <button type="button" onClick={() => save(done + 1)} className="btn btn-secondary min-h-10">{done + 1 === total ? "Done" : "Done — next step"}</button>
                  <span className="text-sm text-muted">{cheerFor(g.key)}</span>
                </>
              )}
              {done > 0 && manual > auto ? <button type="button" onClick={() => save(Math.max(auto, done - 1))} className="text-sm font-semibold text-muted hover:text-text">Go back a step</button> : null}
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
      <GuideFeedback pageKey={g.key} />
    </section>
  );
}
