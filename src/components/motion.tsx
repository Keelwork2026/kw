"use client";
import { useEffect, useState } from "react";

/**
 * Celebration for major milestones only (a project created, a plan approved,
 * a first deployment live). Fires once per key per browser session, is
 * skipped entirely when people prefer less motion, and never blocks input.
 */
export function Confetti({ id, pieces = 36 }: { id: string; pieces?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const k = `kw-celebrated:${id}`;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch { /* storage off: still celebrate once per mount */ }
    setShow(true);
    const t = setTimeout(() => setShow(false), 1600);
    return () => clearTimeout(t);
  }, [id]);
  if (!show) return null;
  const colors = ["var(--accent)", "var(--accent-2)", "var(--accent-3)", "var(--wash-amber)", "var(--wash-violet)"];
  return (
    <div className="kw-confetti" aria-hidden>
      {Array.from({ length: pieces }, (_, i) => {
        const angle = (i / pieces) * Math.PI * 2 + (i % 3) * 0.3;
        const dist = 160 + ((i * 37) % 140);
        return <i key={i} style={{ background: colors[i % colors.length], "--x": `${Math.cos(angle) * dist}px`, "--y": `${Math.sin(angle) * dist * 0.7 + 120}px`, "--r": `${(i * 47) % 360}deg`, animationDelay: `${(i % 6) * 20}ms` } as React.CSSProperties} />;
      })}
    </div>
  );
}

/** A tick that draws itself — the shared "done" mark. */
export function Check({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={`kw-pop kw-draw shrink-0 ${className}`} aria-hidden><path d="M5 12.5l4.5 4.5L19 7" /></svg>;
}

/** Three-dot activity indicator for "working on it" that isn't a spinner. */
export function Dots({ className = "" }: { className?: string }) {
  return <span className={`kw-dots inline-flex items-center gap-1 ${className}`} aria-hidden><span /><span /><span /></span>;
}

/** Seconds since a moment, for honest "working for 12s" labels. */
export function useElapsed(since: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);
  return since ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
}
