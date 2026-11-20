"use client";
import { useEffect, useState } from "react";
import { SIMPLE_COOKIE, SIMPLE_EVENT } from "@/lib/simple/content";

export function isSimpleOn(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.simple === "on";
}

/** Switches Simple Mode on or off at once, everywhere, and remembers it for a year. */
export function setSimple(on: boolean) {
  const root = document.documentElement;
  if (on) root.dataset.simple = "on"; else delete root.dataset.simple;
  document.cookie = `${SIMPLE_COOKIE}=${on ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax`;
  try { window.localStorage.setItem(SIMPLE_COOKIE, on ? "1" : "0"); } catch { /* cookie is enough */ }
  window.dispatchEvent(new CustomEvent(SIMPLE_EVENT, { detail: on }));
}

/** Tracks Simple Mode in client components. */
export function useSimpleMode(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(isSimpleOn());
    const h = () => setOn(isSimpleOn());
    window.addEventListener(SIMPLE_EVENT, h);
    return () => window.removeEventListener(SIMPLE_EVENT, h);
  }, []);
  return on;
}

/**
 * The one-click Simple Mode ("Explain Like I'm 5") switch. Shown in every header (app,
 * marketing, sign-in, onboarding), never inside a menu. When on, it becomes
 * "Exit Simple Mode". Both labels are rendered so the first paint is right.
 */
export function SimpleToggle({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const on = useSimpleMode();
  const [said, setSaid] = useState("");
  const flip = () => {
    const next = !isSimpleOn();
    setSimple(next);
    setSaid(next ? "Simple Mode is on. Everything is now explained in simple words." : "Back to normal mode.");
  };
  return (
    <>
      <button type="button" onClick={flip} aria-pressed={on} className={`kw-eli5 ${compact ? "kw-eli5-compact" : ""} ${className}`}
        title="Explain like I'm 5: everything in simple words. Nothing about your work changes."
        aria-label={on ? "Exit Simple Mode" : "Simple Mode — explain everything like I'm 5"}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" />
        </svg>
        <span className="kw-std">{compact ? "Simple Mode" : <>Simple Mode<span className="kw-eli5-sub">Explain like I&apos;m 5</span></>}</span>
        <span className="kw-simple">{compact ? "Exit simple" : "Exit Simple Mode"}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">{said}</span>
    </>
  );
}
