import { test } from "node:test";
import assert from "node:assert/strict";
import { INTEGRATIONS, connectionStatus } from "./catalog";
import { connectorViews, recentConnections } from "./hub";
import { takeFromBucket, bucketKey, LIMITS } from "@/lib/security/rate-limit";

test("connectors: unique ids, vault-style secret names, honest descriptions", () => {
  assert.ok(INTEGRATIONS.length >= 30);
  assert.equal(new Set(INTEGRATIONS.map((i) => i.id)).size, INTEGRATIONS.length);
  for (const i of INTEGRATIONS) {
    for (const s of i.secrets) assert.match(s.name, /^[A-Z][A-Z0-9_]{1,63}$/);
    assert.match(i.color, /^#[0-9a-f]{6}$/i);
    assert.ok(i.access.length > 10 && i.setup.length > 5, i.id);
    assert.ok(i.docs.startsWith("https://"), i.id);
  }
  // Only connectors that a Keelwork feature really uses are marked native.
  assert.deepEqual(INTEGRATIONS.filter((i) => i.native).map((i) => i.id).sort(), ["cloudflare", "database", "resend", "slack", "vercel"]);
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

test("connector hub: connected, needs setup, available and grounded suggestions", () => {
  const projects = [
    { id: "p1", name: "Shop", backend: "supabase", deploy_target: "cloudflare" },
    { id: "p2", name: "Blog", backend: "appwrite", deploy_target: "vercel" },
  ];
  const secrets = [
    { project_id: "p1", name: "STRIPE_SECRET_KEY", updated_at: "2026-11-01T00:00:00Z" },
    { project_id: "p1", name: "STRIPE_WEBHOOK_SECRET", updated_at: "2026-11-05T00:00:00Z" },
    { project_id: "p2", name: "STRIPE_SECRET_KEY", updated_at: "2026-11-02T00:00:00Z" },
    { project_id: "p1", name: "RESEND_API_KEY", updated_at: "2026-11-03T00:00:00Z" },
  ];
  const workflows = [{ project_id: "p2", definition: { steps: [{ id: "a", type: "slack" }, { id: "b", type: "email" }] } }];
  const v = Object.fromEntries(connectorViews(projects, secrets, workflows).map((x) => [x.integration.id, x]));
  assert.equal(v.stripe!.state, "connected");
  assert.deepEqual(v.stripe!.connected, [{ id: "p1", name: "Shop", since: "2026-11-05T00:00:00Z" }]);
  assert.deepEqual(v.stripe!.partial, [{ id: "p2", name: "Blog", missing: ["STRIPE_WEBHOOK_SECRET"] }]);
  assert.equal(v.twilio!.state, "available");
  assert.deepEqual(v.twilio!.reasons, []);
  assert.match(v.slack!.reasons[0]!, /Blog/);
  assert.match(v.resend!.reasons[0]!, /Blog/); // Shop already has it
  assert.ok(!v.resend!.reasons[0]!.includes("Shop"));
  assert.match(v.cloudflare!.reasons[0]!, /Shop/);
  assert.match(v.appwrite!.reasons[0]!, /Blog/);
  assert.equal(v.cloudbase!.reasons.length, 0);
  assert.match(v.vercel!.reasons[0]!, /Blog/);
  assert.deepEqual(recentConnections(Object.values(v)).map((r) => r.integration.id), ["stripe", "resend"]);
});
