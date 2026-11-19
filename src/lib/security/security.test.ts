import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { buildCsp, makeNonce, SECURITY_HEADERS } from "./headers";
import { EXPECTED_MIGRATIONS } from "./readiness";

test("CSP: nonce, strict-dynamic, Supabase origins, preview frames, no framing of Keelwork", () => {
  const nonce = makeNonce();
  assert.match(nonce, /^[A-Za-z0-9+/]{22}==$/);
  const csp = buildCsp({ nonce, supabaseUrl: "https://abc.supabase.co", previewBaseDomain: "preview.keelwork.dev" });
  const d = Object.fromEntries(csp.split("; ").map((x) => { const [k, ...v] = x.split(" "); return [k, v]; }));
  assert.deepEqual(d["script-src"], ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"]);
  assert.deepEqual(d["connect-src"], ["'self'", "https://abc.supabase.co", "wss://abc.supabase.co"]);
  assert.deepEqual(d["frame-src"], ["'self'", "https://*.preview.keelwork.dev"]);
  assert.deepEqual(d["frame-ancestors"], ["'none'"]);
  assert.deepEqual(d["object-src"], ["'none'"]);
  assert.ok(d["form-action"]!.includes("https://checkout.stripe.com") && d["form-action"]!.includes("https://billing.stripe.com"));
  assert.ok(!csp.includes("unsafe-eval"));
  assert.ok(buildCsp({ nonce, dev: true }).includes("'unsafe-eval'"), "dev only");
  assert.ok(buildCsp({ nonce }).includes("frame-src 'self';"));
  assert.ok(buildCsp({ nonce, frameableBySelf: true }).includes("frame-ancestors 'self'"), "demo sites can be framed by Keelwork itself");
  assert.ok(!buildCsp({ nonce, supabaseUrl: "javascript:alert(1)" }).includes("javascript"));
  assert.notEqual(makeNonce(), makeNonce());
});

test("security headers", () => {
  assert.equal(SECURITY_HEADERS["Strict-Transport-Security"], "max-age=63072000; includeSubDomains; preload");
  assert.equal(SECURITY_HEADERS["X-Frame-Options"], "DENY");
  assert.match(SECURITY_HEADERS["Permissions-Policy"]!, /interest-cohort=\(\)/);
});

test("readiness expects exactly the migrations in the repository", () => {
  const files = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).map((f) => f.replace(/\.sql$/, "")).sort();
  assert.deepEqual([...EXPECTED_MIGRATIONS], files);
});
