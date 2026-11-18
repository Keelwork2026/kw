"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { optedOut, pageViewPayload, collectorUrl } from "../lib/analytics.ts";

/** Sends a page view with no cookies. Off unless Keelwork analytics is enabled for this app. */
export function KwAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    const url = collectorUrl(process.env.NEXT_PUBLIC_KW_ANALYTICS_URL);
    if (!url || optedOut(navigator as never, window as never)) return;
    const body = JSON.stringify(pageViewPayload({ pathname }, document.referrer));
    fetch(url, { method: "POST", body, credentials: "omit", keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => undefined);
  }, [pathname]);
  return null;
}
