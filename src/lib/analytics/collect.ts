import { createHash } from "node:crypto";

/**
 * Privacy-safe analytics for customers' apps. No cookies, no IP addresses,
 * no user ids, no full user agents are stored: a page view becomes a
 * cleaned path, a referrer host, a device class and a daily-salted
 * 16-hex visitor hash.
 */
export function optedOut(headers: { get(name: string): string | null }): boolean {
  return headers.get("dnt") === "1" || headers.get("sec-gpc") === "1";
}

const BOT = /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|curl|wget|python-requests|httpclient|axios|go-http|java\/|facebookexternalhit|embedly|pingdom/i;
export function isBot(ua: string | null): boolean {
  return !ua || ua.trim().length < 10 || BOT.test(ua);
}

export function deviceFrom(ua: string): "desktop" | "mobile" | "tablet" | "other" {
  if (/ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) return "mobile";
  if (/windows nt|macintosh|x11|linux|cros/i.test(ua)) return "desktop";
  return "other";
}

/** Strips identifiers: query strings, fragments, UUIDs, long numbers, emails and token-like segments. */
export function cleanPath(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/")) return "/";
  let p = raw.split(/[?#]/)[0]!;
  try { p = decodeURIComponent(p); } catch { /* keep encoded */ }
  const segs = p.split("/").map((s) => {
    if (!s) return s;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return ":id";
    if (/^\d{4,}$/.test(s)) return ":n";
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return ":email";
    if (s.length >= 20 && /^[A-Za-z0-9_-]+$/.test(s) && /\d/.test(s) && /[A-Za-z]/.test(s)) return ":token";
    return s.slice(0, 80);
  });
  return (segs.join("/") || "/").slice(0, 300);
}

export function referrerHost(raw: unknown, ownHost?: string): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return ownHost && host === ownHost.toLowerCase().replace(/^www\./, "") ? null : host.slice(0, 253);
  } catch { return null; }
}

export function originAllowed(origin: string | null, allowed: readonly string[]): boolean {
  if (!origin) return false;
  return allowed.some((a) => a.toLowerCase() === origin.toLowerCase());
}

/** sha256(salt|siteId|ip|ua), first 16 hex characters. The salt rotates daily. */
export function visitorHash(salt: Buffer, siteId: string, ip: string, ua: string): string {
  return createHash("sha256").update(Buffer.concat([salt, Buffer.from(`|${siteId}|${ip}|${ua}`)])).digest("hex").slice(0, 16);
}
