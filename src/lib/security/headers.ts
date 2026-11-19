/**
 * Security headers and the per-request Content-Security-Policy.
 * Runs in the Edge runtime: no Buffer, no Node APIs.
 */
export function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function origin(url: string | undefined): string | null {
  if (!url) return null;
  try { const u = new URL(url); return u.protocol === "https:" || u.hostname === "localhost" ? u.origin : null; } catch { return null; }
}

export function buildCsp(o: { nonce: string; dev?: boolean; supabaseUrl?: string; previewBaseDomain?: string }): string {
  const supa = origin(o.supabaseUrl);
  const supaWss = supa ? supa.replace(/^http/, "ws") : null;
  // Previews are https, except a *.localhost base (one-machine setups), which is http and may carry a port.
  const local = o.previewBaseDomain && /^([a-z0-9-]+\.)*localhost(:\d{2,5})?$/i.test(o.previewBaseDomain);
  const preview = o.previewBaseDomain && (local || /^[a-z0-9.-]+$/i.test(o.previewBaseDomain)) ? `${local ? "http" : "https"}://*.${o.previewBaseDomain}` : null;
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", `'nonce-${o.nonce}'`, "'strict-dynamic'", ...(o.dev ? ["'unsafe-eval'"] : [])]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", ["'self'", ...(supa ? [supa] : []), ...(supaWss ? [supaWss] : [])]],
    ["frame-src", preview ? [preview] : ["'none'"]],
    ["frame-ancestors", ["'none'"]],
    ["form-action", ["'self'", ...(supa ? [supa] : []), "https://checkout.stripe.com", "https://billing.stripe.com"]],
    ["base-uri", ["'self'"]],
    ["object-src", ["'none'"]],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
  ];
  return directives.map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");
}

export const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-site",
};
