"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the server page every few seconds while a build is active. */
export function AutoRefresh({ active, everyMs = 4000 }: { active: boolean; everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, everyMs);
    return () => window.clearInterval(id);
  }, [active, everyMs, router]);
  return active ? <p className="sr-only" role="status">Build in progress; this page updates automatically.</p> : null;
}
