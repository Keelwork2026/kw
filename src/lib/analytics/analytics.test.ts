import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPath, referrerHost, deviceFrom, isBot, optedOut, originAllowed, visitorHash } from "./collect";
import { packageTemplate, validateListing } from "@/lib/marketplace/package";

const h = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null });
const UA_DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Safari/605.1.15";

test("paths are stripped of identifiers", () => {
  assert.equal(cleanPath("/orders/3f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f?ref=mail#top"), "/orders/:id");
  assert.equal(cleanPath("/invoice/1234567"), "/invoice/:n");
  assert.equal(cleanPath("/u/ana%40example.com/settings"), "/u/:email/settings");
  assert.equal(cleanPath("/reset/abcDEF1234567890ghijKLMN"), "/reset/:token");
  assert.equal(cleanPath("/blog/how-to-throw-a-pot"), "/blog/how-to-throw-a-pot");
  assert.equal(cleanPath("https://evil.com/x"), "/");
});

test("referrers become hosts; devices become classes; bots and opt-outs are dropped", () => {
  assert.equal(referrerHost("https://www.google.com/search?q=secret"), "google.com");
  assert.equal(referrerHost("https://shop.example.com/a", "shop.example.com"), null);
  assert.equal(referrerHost("javascript:alert(1)"), null);
  assert.equal(deviceFrom(UA_DESKTOP), "desktop");
  assert.equal(deviceFrom("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148"), "mobile");
  assert.equal(deviceFrom("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "tablet");
  assert.equal(deviceFrom("Mozilla/5.0 (Linux; Android 14; SM-X710) Safari"), "tablet");
  assert.equal(deviceFrom("SmartTV/1.0 Something"), "other");
  for (const ua of [null, "", "short", "Googlebot/2.1 (+http://www.google.com/bot.html)", "curl/8.4.0 something", "Mozilla/5.0 HeadlessChrome/120"]) assert.equal(isBot(ua), true, String(ua));
  assert.equal(isBot(UA_DESKTOP), false);
  assert.equal(optedOut(h({ dnt: "1" })), true);
  assert.equal(optedOut(h({ "sec-gpc": "1" })), true);
  assert.equal(optedOut(h({})), false);
});

test("origins must be on the allowlist", () => {
  assert.equal(originAllowed("https://shop.example.com", ["https://shop.example.com"]), true);
  assert.equal(originAllowed("https://evil.example.com", ["https://shop.example.com"]), false);
  assert.equal(originAllowed(null, ["https://shop.example.com"]), false);
});

test("visitor hashes are 16 hex, salted per day and per site", () => {
  const a = visitorHash(Buffer.from("salt-day-1"), "site-1", "203.0.113.5", UA_DESKTOP);
  assert.match(a, /^[0-9a-f]{16}$/);
  assert.equal(a, visitorHash(Buffer.from("salt-day-1"), "site-1", "203.0.113.5", UA_DESKTOP));
  assert.notEqual(a, visitorHash(Buffer.from("salt-day-2"), "site-1", "203.0.113.5", UA_DESKTOP), "a new day's salt unlinks visitors");
  assert.notEqual(a, visitorHash(Buffer.from("salt-day-1"), "site-2", "203.0.113.5", UA_DESKTOP), "sites can't be linked");
  assert.ok(!a.includes("203"));
});

test("template packaging excludes env files and finds blocking issues", () => {
  const p = packageTemplate([
    { path: "app/page.tsx", content: "export default 1" },
    { path: ".env.local", content: "SECRET=1" },
    { path: "lib/key.ts", content: `const k = "sk_live_${"x".repeat(24)}";` },
    { path: "supabase/migrations/1.sql", content: "create table notes (id int);" },
  ], [], "supabase/migrations");
  assert.ok(!(".env.local" in p.files));
  assert.equal(p.manifest.length, 3);
  assert.match(p.manifest[0]!.sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(p.findings.map((f) => f.rule).sort(), ["stripe-live-key", "table-without-rls"]);
  assert.equal(p.blocking, 2);
  assert.equal(validateListing({ title: "Booking kit", description: "A great booking template", category: "saas", rightsConfirmed: false }), "Confirm that you hold the rights to everything in the template.");
  assert.equal(validateListing({ title: "Booking kit", description: "A great booking template", category: "games", rightsConfirmed: true }), "Choose a category.");
  assert.equal(validateListing({ title: "Booking kit", description: "A great booking template", category: "saas", rightsConfirmed: true }), null);
});
