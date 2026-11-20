"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** While a QA run is active, refresh the page's server data every few seconds. */
export function AutoRefresh({ active, ms = 4000 }: { active: boolean; ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, ms);
    return () => clearInterval(t);
  }, [active, ms, router]);
  return null;
}
