import { createServiceClient } from "@/lib/supabase/server";
import { verifyStripeSignature, toLedgerEvent } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

/** Keelwork's own Stripe webhook. Each event is applied once per event id and once per reference. */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "not configured" }, { status: 503 });
  const payload = await request.text();
  if (payload.length > 512_000) return Response.json({ error: "too large" }, { status: 413 });
  const check = verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret);
  if (!check.ok) return Response.json({ error: check.reason }, { status: 400 });
  let event: { id: string; type: string; data: { object: Record<string, unknown> } };
  try { event = JSON.parse(payload); } catch { return Response.json({ error: "invalid JSON" }, { status: 400 }); }
  if (!/^evt_[A-Za-z0-9]+$/.test(event.id ?? "")) return Response.json({ error: "invalid event" }, { status: 400 });
  const mapped = toLedgerEvent(event);
  if (!mapped) return Response.json({ ignored: true });
  const db = createServiceClient();
  const { error } = await db.rpc("apply_stripe_event", {
    p_event_id: mapped.eventId, p_type: mapped.type, p_org: mapped.org, p_kind: mapped.kind ?? null, p_amount_micros: mapped.amountMicros ?? null,
    p_reference: mapped.reference ?? null, p_plan_key: mapped.planKey ?? null, p_customer: mapped.customer ?? null, p_subscription: mapped.subscription ?? null,
    p_status: mapped.status ?? null, p_period_end: mapped.periodEnd ?? null,
  });
  // A 500 makes Stripe retry; idempotency makes the retry safe.
  if (error) return Response.json({ error: "couldn't apply the event" }, { status: 500 });
  return Response.json({ received: true });
}
