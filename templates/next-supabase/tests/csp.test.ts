import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCsp, makeNonce, originOf } from "../lib/csp.ts";

const dir = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(name + " "))?.split(" ").slice(1) ?? [];

test("csp: scripts need this origin or the nonce; no eval in production", () => {
  const csp = buildCsp({ nonce: "abc", supabaseUrl: "https://xyz.supabase.co" });
  assert.deepEqual(dir(csp, "script-src"), ["'self'", "'nonce-abc'", "'strict-dynamic'"]);
  assert.ok(!csp.includes("unsafe-eval"));
  assert.deepEqual(dir(csp, "object-src"), ["'none'"]);
  assert.deepEqual(dir(csp, "frame-ancestors"), ["'self'"]);
  assert.ok(dir(csp, "connect-src").includes("https://xyz.supabase.co") && dir(csp, "connect-src").includes("wss://xyz.supabase.co"));
});

test("csp: dev allows eval and hot reload; Keelwork may frame; analytics may receive", () => {
  const csp = buildCsp({ nonce: "n", dev: true, appOrigin: "https://app.keelwork.dev/x", analyticsUrl: "https://collect.keelwork.dev/v1" });
  assert.ok(dir(csp, "script-src").includes("'unsafe-eval'"));
  assert.deepEqual(dir(csp, "frame-ancestors"), ["'self'", "https://app.keelwork.dev"]);
  assert.ok(dir(csp, "connect-src").includes("https://collect.keelwork.dev"));
});

test("csp: unsafe or malformed origins are ignored", () => {
  assert.equal(originOf("http://evil.example"), null);
  assert.equal(originOf("javascript:alert(1)"), null);
  assert.equal(originOf("not a url"), null);
  assert.equal(originOf("http://localhost:54321/rest"), "http://localhost:54321");
  const csp = buildCsp({ nonce: "n", supabaseUrl: "https://a.co; script-src *" });
  assert.ok(!csp.includes("script-src *"));
});

test("csp: nonces are random base64", () => {
  const a = makeNonce(), b = makeNonce();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9+/]{22}==$/);
});

test("csp: other backends and SDK hosts are allowed to connect, junk is not", () => {
  const csp = buildCsp({ nonce: "n", backendUrls: ["https://cloud.appwrite.io/v1", undefined, "ftp://x"], extraConnect: ["https://*.tencentcloudapi.com", "* 'unsafe-inline'"] });
  const c = dir(csp, "connect-src");
  assert.ok(c.includes("https://cloud.appwrite.io") && c.includes("wss://cloud.appwrite.io") && c.includes("https://*.tencentcloudapi.com"));
  assert.ok(!c.includes("*") && !csp.includes("ftp:"));
});
