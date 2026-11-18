import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Preview tokens: "<projectId>.<expSeconds>.<hex HMAC-SHA256("preview:"+id+":"+exp)>".
 * Signed by the app with PREVIEW_SECRET, verified by the preview proxy in
 * constant time. A token for another project, an expired token, a tampered
 * signature and an edited (extended) expiry are all refused.
 */
export const DEFAULT_TTL_SECONDS = 3600;
const MAX_TTL_SECONDS = 24 * 3600;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function mac(secret: string, projectId: string, exp: number): string {
  return createHmac("sha256", secret).update(`preview:${projectId}:${exp}`).digest("hex");
}

export function signPreviewToken(secret: string, projectId: string, nowSeconds = Math.floor(Date.now() / 1000), ttl = DEFAULT_TTL_SECONDS): string {
  if (!secret || secret.length < 32) throw new Error("PREVIEW_SECRET must be at least 32 characters");
  if (!UUID.test(projectId)) throw new Error("invalid project id");
  const exp = nowSeconds + Math.min(Math.max(60, ttl), MAX_TTL_SECONDS);
  return `${projectId}.${exp}.${mac(secret, projectId, exp)}`;
}

export type TokenCheck = { ok: true; exp: number } | { ok: false; reason: "malformed" | "wrong-project" | "expired" | "bad-signature" };

export function verifyPreviewToken(secret: string, token: string | null | undefined, projectId: string, nowSeconds = Math.floor(Date.now() / 1000)): TokenCheck {
  if (!token || token.length > 200) return { ok: false, reason: "malformed" };
  const m = /^([0-9a-f-]{36})\.(\d{1,12})\.([0-9a-f]{64})$/.exec(token);
  if (!m || !UUID.test(m[1]!)) return { ok: false, reason: "malformed" };
  const [, id, expRaw, sig] = m;
  const exp = Number(expRaw);
  const expected = Buffer.from(mac(secret, id!, exp), "hex");
  const given = Buffer.from(sig!, "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "bad-signature" };
  if (id !== projectId) return { ok: false, reason: "wrong-project" };
  if (exp <= nowSeconds) return { ok: false, reason: "expired" };
  if (exp > nowSeconds + MAX_TTL_SECONDS) return { ok: false, reason: "bad-signature" };
  return { ok: true, exp };
}

/** Same-site redirect target inside the preview; //host and absolute URLs fall back to "/". */
export function safeNext(next: string | null | undefined): string {
  if (!next || typeof next !== "string" || next.length > 1024) return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return "/";
  return next;
}

export function previewHostFor(projectId: string, baseDomain: string): string {
  return `p-${projectId}.${baseDomain}`;
}

export function projectFromHost(host: string | undefined, baseDomain: string): string | null {
  if (!host) return null;
  const h = host.toLowerCase().replace(/:\d+$/, "");
  const suffix = `.${baseDomain.toLowerCase()}`;
  if (!h.endsWith(suffix)) return null;
  const label = h.slice(0, -suffix.length);
  const m = /^p-([0-9a-f-]{36})$/.exec(label);
  return m && UUID.test(m[1]!) ? m[1]! : null;
}
