import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCreditPacks, form, verifyStripeSignature, signStripePayload, toLedgerEvent, stripeConfigured, createCreditCheckout } from "./stripe";
import { estimateMicros, routeFor } from "@/lib/ai/catalog";
import { keelworkStackCatalog } from "@/lib/ai/presets";

const ORG = "3f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

test("Stripe signatures: valid, tampered, wrong secret and outside the window", () => {
  const payload = '{"id":"evt_1"}';
  const now = 1_800_000_000;
  const h = signStripePayload(payload, "whsec_x", now);
  assert.deepEqual(verifyStripeSignature(payload, h, "whsec_x", now + 10), { ok: true });
  assert.equal(verifyStripeSignature(payload + " ", h, "whsec_x", now).ok, false);
  assert.equal(verifyStripeSignature(payload, h, "whsec_y", now).ok, false);
  assert.equal(verifyStripeSignature(payload, h, "whsec_x", now + 301).ok, false);
  assert.equal(verifyStripeSignature(payload, `t=${now},v0=${"a".repeat(64)}`, "whsec_x", now).ok, false);
  assert.equal(verifyStripeSignature(payload, null, "whsec_x", now).ok, false);
});

test("event mapping uses only server-set metadata", () => {
  const paid = toLedgerEvent({ id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_1", mode: "payment", payment_status: "paid", amount_total: 99999999, metadata: { kw_org: ORG, kw_credits_micros: "10000000" } } } });
  assert.deepEqual(paid, { eventId: "evt_1", type: "checkout.session.completed", org: ORG, kind: "purchase", amountMicros: 10_000_000, reference: "checkout:cs_1", customer: undefined });
  assert.equal(toLedgerEvent({ id: "e", type: "checkout.session.completed", data: { object: { id: "cs", mode: "payment", payment_status: "unpaid", metadata: { kw_org: ORG, kw_credits_micros: "1" } } } }), null);
  assert.equal(toLedgerEvent({ id: "e", type: "checkout.session.completed", data: { object: { id: "cs", mode: "payment", payment_status: "paid", metadata: { kw_org: "not-a-uuid", kw_credits_micros: "1" } } } }), null);
  const sub = toLedgerEvent({ id: "e2", type: "customer.subscription.updated", data: { object: { id: "sub_1", customer: "cus_1", status: "active", current_period_end: 1_800_000_000, metadata: { kw_org: ORG, kw_plan: "pro" } } } })!;
  assert.equal(sub.planKey, "pro");
  assert.equal(sub.periodEnd, new Date(1_800_000_000_000).toISOString());
  assert.equal(toLedgerEvent({ id: "e3", type: "customer.subscription.deleted", data: { object: { id: "sub_1", status: "canceled", metadata: { kw_org: ORG, kw_plan: "pro" } } } })!.planKey, "free");
  const inv = toLedgerEvent({ id: "e4", type: "invoice.paid", data: { object: { id: "in_1", subscription_details: { metadata: { kw_org: ORG, kw_monthly_credits_micros: "20000000" } } } } })!;
  assert.deepEqual([inv.kind, inv.amountMicros, inv.reference], ["grant", 20_000_000, "invoice:in_1"]);
  assert.equal(toLedgerEvent({ id: "e5", type: "charge.refunded", data: { object: {} } }), null);
});

test("form encoding for Stripe", () => {
  assert.equal(form({ mode: "payment", line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 1200 } }], metadata: { kw_org: "o" }, skip: undefined }),
    "mode=payment&line_items%5B0%5D%5Bquantity%5D=1&line_items%5B0%5D%5Bprice_data%5D%5Bcurrency%5D=usd&line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=1200&metadata%5Bkw_org%5D=o");
});

test("credit packs are validated; Stripe is hidden without a valid key", async () => {
  assert.deepEqual(parseCreditPacks('[{"id":"10","credits_micros":10000000,"price_cents":1200,"currency":"usd"}]'), [{ id: "10", credits_micros: 10_000_000, price_cents: 1200, currency: "usd" }]);
  assert.throws(() => parseCreditPacks('[{"id":"x","credits_micros":1,"price_cents":49,"currency":"usd"}]'), /at least 50/);
  assert.throws(() => parseCreditPacks('[{"id":"x","credits_micros":-1,"price_cents":100,"currency":"usd"}]'), /positive/);
  assert.throws(() => parseCreditPacks('[{"id":"x","credits_micros":1,"price_cents":100,"currency":"dollars"}]'), /3-letter/);
  assert.throws(() => parseCreditPacks('[{"id":"Bad Id","credits_micros":1,"price_cents":100,"currency":"usd"}]'), /id/);
  assert.deepEqual(parseCreditPacks(undefined), []);
  assert.equal(stripeConfigured({ STRIPE_SECRET_KEY: "sk_test_abc" }), true);
  assert.equal(stripeConfigured({ STRIPE_SECRET_KEY: "pk_test_abc" }), false);
  assert.equal(stripeConfigured({}), false);
  let body = "";
  await createCreditCheckout({ org: ORG, pack: { id: "10", credits_micros: 10_000_000, price_cents: 1200, currency: "usd" }, successUrl: "https://k/b", cancelUrl: "https://k/b" }, (async (_u: string, i: RequestInit) => { body = String(i.body); return new Response('{"url":"https://checkout.stripe.com/x"}'); }) as typeof fetch);
  assert.match(decodeURIComponent(body), /metadata\[kw_credits_micros\]=10000000/);
  assert.match(decodeURIComponent(body), new RegExp(`metadata\\[kw_org\\]=${ORG}`));
});

test("spend estimates are an upper bound at the dearest model", () => {
  const c = keelworkStackCatalog();
  const code = routeFor(c, "code");
  // 3000 chars ≈ 1000 tokens in; up to 100 tokens out; Kimi (dearer) prices it.
  assert.equal(estimateMicros(code, 3000, 100), Math.ceil((1000 * 2_000_000 + 100 * 10_000_000) / 1_000_000));
  assert.ok(estimateMicros(code, 3000) >= estimateMicros(code, 3000, 100));
});
