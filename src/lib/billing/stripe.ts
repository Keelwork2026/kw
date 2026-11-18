import { createHmac, timingSafeEqual } from "node:crypto";

/** Keelwork's own Stripe account: credit packs, plans and the billing portal. */
export type CreditPack = { id: string; credits_micros: number; price_cents: number; currency: string };

export function parseCreditPacks(raw: string | undefined): CreditPack[] {
  if (!raw || !raw.trim()) return [];
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new Error("CREDIT_PACKS must be JSON"); }
  if (!Array.isArray(data)) throw new Error("CREDIT_PACKS must be a list");
  const ids = new Set<string>();
  return data.map((p: Record<string, unknown>, i) => {
    const id = String(p?.id ?? "");
    if (!/^[a-z0-9_-]{1,32}$/.test(id) || ids.has(id)) throw new Error(`CREDIT_PACKS[${i}].id is invalid or repeated`);
    ids.add(id);
    const credits = p.credits_micros, cents = p.price_cents, currency = p.currency;
    if (!Number.isSafeInteger(credits) || (credits as number) <= 0) throw new Error(`CREDIT_PACKS[${i}].credits_micros must be a positive integer`);
    if (!Number.isSafeInteger(cents) || (cents as number) < 50) throw new Error(`CREDIT_PACKS[${i}].price_cents must be an integer of at least 50`);
    if (typeof currency !== "string" || !/^[a-z]{3}$/.test(currency)) throw new Error(`CREDIT_PACKS[${i}].currency must be a 3-letter code`);
    return { id, credits_micros: credits as number, price_cents: cents as number, currency };
  });
}

export function stripeConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return /^sk_(test|live)_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY ?? "");
}

/** Stripe form encoding, including nested objects and arrays. */
export function form(obj: Record<string, unknown>, prefix = ""): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => { if (item && typeof item === "object") out.push(form(item as Record<string, unknown>, `${key}[${i}]`)); else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`); });
    else if (typeof v === "object") out.push(form(v as Record<string, unknown>, key));
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out.filter(Boolean).join("&");
}

export type SignatureCheck = { ok: true } | { ok: false; reason: string };
export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Math.floor(Date.now() / 1000), tolerance = 300): SignatureCheck {
  if (!header) return { ok: false, reason: "missing Stripe-Signature" };
  let t: number | null = null;
  const v1: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t" && /^\d+$/.test(v ?? "")) t = Number(v);
    if (k === "v1" && /^[0-9a-f]{64}$/.test(v ?? "")) v1.push(v!);
  }
  if (t === null || !v1.length) return { ok: false, reason: "malformed Stripe-Signature" };
  if (Math.abs(now - t) > tolerance) return { ok: false, reason: "timestamp outside the tolerance window" };
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return v1.some((s) => timingSafeEqual(Buffer.from(s, "hex"), expected)) ? { ok: true } : { ok: false, reason: "signature mismatch" };
}

export function signStripePayload(payload: string, secret: string, t = Math.floor(Date.now() / 1000)): string {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
}

export type LedgerEvent = {
  eventId: string; type: string; org: string;
  kind?: "purchase" | "grant"; amountMicros?: number; reference?: string;
  planKey?: string; customer?: string; subscription?: string; status?: string; periodEnd?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
type Meta = Record<string, string | undefined> | undefined;
const metaOrg = (m: Meta) => (m?.kw_org && UUID.test(m.kw_org) ? m.kw_org : null);
const posInt = (s: string | undefined) => (s && /^\d{1,15}$/.test(s) && Number(s) > 0 ? Number(s) : null);

/**
 * Maps a verified Stripe event to a ledger/plan change. Credits and the
 * organization come only from metadata Keelwork set on the server when it
 * created the session; anything else in the event is ignored.
 */
export function toLedgerEvent(event: { id: string; type: string; data: { object: Record<string, unknown> } }): LedgerEvent | null {
  const o = event.data?.object ?? {};
  const base = { eventId: event.id, type: event.type };
  switch (event.type) {
    case "checkout.session.completed": {
      const meta = o.metadata as Meta;
      const org = metaOrg(meta);
      if (!org) return null;
      if (o.mode === "payment") {
        const credits = posInt(meta?.kw_credits_micros);
        if (o.payment_status !== "paid" || !credits) return null;
        return { ...base, org, kind: "purchase", amountMicros: credits, reference: `checkout:${String(o.id)}`, customer: typeof o.customer === "string" ? o.customer : undefined };
      }
      if (o.mode === "subscription") {
        return { ...base, org, planKey: meta?.kw_plan, customer: typeof o.customer === "string" ? o.customer : undefined, subscription: typeof o.subscription === "string" ? o.subscription : undefined, status: "active" };
      }
      return null;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const meta = o.metadata as Meta;
      const org = metaOrg(meta);
      if (!org) return null;
      const deleted = event.type.endsWith("deleted") || o.status === "canceled";
      const end = typeof o.current_period_end === "number" ? new Date(o.current_period_end * 1000).toISOString() : undefined;
      return { ...base, org, planKey: deleted ? "free" : meta?.kw_plan, subscription: String(o.id), customer: typeof o.customer === "string" ? o.customer : undefined, status: String(o.status ?? (deleted ? "canceled" : "active")), periodEnd: end };
    }
    case "invoice.paid": {
      const meta = ((o.subscription_details as { metadata?: Meta } | undefined)?.metadata ?? (o.metadata as Meta));
      const org = metaOrg(meta);
      const credits = posInt(meta?.kw_monthly_credits_micros);
      if (!org || !credits) return null;
      return { ...base, org, kind: "grant", amountMicros: credits, reference: `invoice:${String(o.id)}` };
    }
    default:
      return null;
  }
}

async function stripe<T>(path: string, body: Record<string, unknown>, key = process.env.STRIPE_SECRET_KEY ?? "", f: typeof fetch = fetch): Promise<T> {
  const res = await f(`https://api.stripe.com/v1/${path}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form(body), signal: AbortSignal.timeout(20_000) });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe answered ${res.status}`);
  return json;
}

export async function createCreditCheckout(input: { org: string; pack: CreditPack; customer?: string | null; successUrl: string; cancelUrl: string }, f?: typeof fetch) {
  return stripe<{ url: string }>("checkout/sessions", {
    mode: "payment", success_url: input.successUrl, cancel_url: input.cancelUrl, ...(input.customer ? { customer: input.customer } : {}),
    line_items: [{ quantity: 1, price_data: { currency: input.pack.currency, unit_amount: input.pack.price_cents, product_data: { name: `Keelwork credits ($${(input.pack.credits_micros / 1e6).toFixed(2)})` } } }],
    metadata: { kw_org: input.org, kw_credits_micros: String(input.pack.credits_micros) },
  }, undefined, f);
}

export async function createPlanCheckout(input: { org: string; plan: string; priceId: string; monthlyCreditsMicros: number; customer?: string | null; successUrl: string; cancelUrl: string }, f?: typeof fetch) {
  const metadata = { kw_org: input.org, kw_plan: input.plan, kw_monthly_credits_micros: String(input.monthlyCreditsMicros) };
  return stripe<{ url: string }>("checkout/sessions", {
    mode: "subscription", success_url: input.successUrl, cancel_url: input.cancelUrl, ...(input.customer ? { customer: input.customer } : {}),
    line_items: [{ price: input.priceId, quantity: 1 }], metadata, subscription_data: { metadata },
  }, undefined, f);
}

export async function createPortalSession(customer: string, returnUrl: string, f?: typeof fetch) {
  return stripe<{ url: string }>("billing_portal/sessions", { customer, return_url: returnUrl }, undefined, f);
}
