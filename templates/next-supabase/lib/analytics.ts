/** Pure helpers for privacy-safe page views (no cookies, honours DNT and GPC). */
export function optedOut(nav: { doNotTrack?: string | null; globalPrivacyControl?: boolean }, win?: { doNotTrack?: string | null }): boolean {
  return nav.doNotTrack === "1" || win?.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

export function pageViewPayload(loc: { pathname: string }, referrer: string): { path: string; referrer: string } {
  // Paths are cleaned again on the server; query strings and fragments are never sent.
  return { path: loc.pathname.slice(0, 300) || "/", referrer: referrer.slice(0, 300) };
}

export function collectorUrl(base: string | undefined): string | null {
  if (!base) return null;
  try {
    const u = new URL(base);
    return u.protocol === "https:" || u.hostname === "localhost" ? u.toString() : null;
  } catch { return null; }
}
