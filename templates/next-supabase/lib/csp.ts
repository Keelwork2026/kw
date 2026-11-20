/**
 * The app's Content-Security-Policy, built per request with a fresh nonce.
 * Scripts run only from this origin or with the nonce Next.js adds to its own
 * inline scripts. When you add a service (payments, maps, a CDN, an embed),
 * add its origin to the matching directive below and say why in a comment.
 */
export type CspOptions = {
  nonce: string;
  dev?: boolean;
  /** NEXT_PUBLIC_SUPABASE_URL: the browser talks to Supabase over https and websockets (realtime). */
  supabaseUrl?: string;
  /** Other backend endpoints the browser calls (e.g. NEXT_PUBLIC_APPWRITE_ENDPOINT). */
  backendUrls?: (string | undefined)[];
  /** Origins or wildcard sources a backend SDK needs that aren't a single URL (e.g. CloudBase). */
  extraConnect?: string[];
  /** NEXT_PUBLIC_KW_ANALYTICS_URL: Keelwork's privacy-safe page-view collector, when analytics is on. */
  analyticsUrl?: string;
  /** NEXT_PUBLIC_KW_APP_ORIGIN: Keelwork, which may frame the app for Design mode. */
  appOrigin?: string;
};

export function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.hostname === "localhost" || u.hostname === "127.0.0.1" ? u.origin : null;
  } catch {
    return null;
  }
}

export function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function buildCsp(o: CspOptions): string {
  const supa = originOf(o.supabaseUrl);
  const analytics = originOf(o.analyticsUrl);
  const keelwork = originOf(o.appOrigin);
  const connect = ["'self'"];
  if (supa) connect.push(supa, supa.replace(/^http/, "ws"));
  for (const u of o.backendUrls ?? []) { const b = originOf(u); if (b && !connect.includes(b)) connect.push(b, b.replace(/^http/, "ws")); }
  for (const x of o.extraConnect ?? []) if (/^(https|wss):\/\/(\*\.)?[a-z0-9.-]+$/i.test(x)) connect.push(x);
  if (analytics && !connect.includes(analytics)) connect.push(analytics);
  if (o.dev) connect.push("ws:", "wss:"); // hot reload
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", `'nonce-${o.nonce}'`, "'strict-dynamic'", ...(o.dev ? ["'unsafe-eval'"] : [])]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", ...(supa ? [supa] : [])]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", connect],
    ["frame-ancestors", ["'self'", ...(keelwork ? [keelwork] : [])]],
    ["form-action", ["'self'"]],
    ["base-uri", ["'self'"]],
    ["object-src", ["'none'"]],
    ["manifest-src", ["'self'"]],
  ];
  return directives.map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");
}
