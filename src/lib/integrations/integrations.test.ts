import { test } from "node:test";
import assert from "node:assert/strict";
import { INTEGRATIONS, connectionStatus } from "./catalog";
import { takeFromBucket, bucketKey, LIMITS } from "@/lib/security/rate-limit";

test("thirteen integrations, each with secrets named like vault names", () => {
  assert.equal(INTEGRATIONS.length, 13);
  assert.equal(new Set(INTEGRATIONS.map((i) => i.id)).size, 13);
  for (const i of INTEGRATIONS) for (const s of i.secrets) assert.match(s.name, /^[A-Z][A-Z0-9_]{1,63}$/);
  const stripe = INTEGRATIONS.find((i) => i.id === "stripe")!;
  assert.deepEqual(connectionStatus(stripe, new Set(["STRIPE_SECRET_KEY"])), { connected: false, missing: ["STRIPE_WEBHOOK_SECRET"] });
  assert.equal(connectionStatus(stripe, new Set(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"])).connected, true);
  assert.ok(INTEGRATIONS.find((i) => i.id === "cloudflare")!.deployOnly);
});

test("token buckets: capacity, refill and retry-after", () => {
  let b = null as ReturnType<typeof takeFromBucket>["bucket"] | null;
  const lim = LIMITS.signIn;
  for (let i = 0; i < 10; i++) { const r = takeFromBucket(b, lim, 0); assert.ok(r.allowed); b = r.bucket; }
  const denied = takeFromBucket(b, lim, 0);
  assert.equal(denied.allowed, false);
  assert.equal(denied.retryAfterSeconds, 60);
  assert.ok(takeFromBucket(denied.bucket, lim, 60_000).allowed, "one token per minute refills");
  assert.equal(takeFromBucket(null, LIMITS.webhook, 0).bucket.tokens, 59);
  assert.match(bucketKey("signIn", "a@b.c|1.2.3.4"), /^[0-9a-f]{64}$/);
  assert.notEqual(bucketKey("signIn", "x"), bucketKey("invite", "x"));
});
