import { test } from "node:test";
import assert from "node:assert/strict";
import { optedOut, pageViewPayload, collectorUrl } from "../lib/analytics.ts";
import { healthBody } from "../lib/health.ts";

test("analytics honours Do Not Track and Global Privacy Control", () => {
  assert.equal(optedOut({ doNotTrack: "1" }), true);
  assert.equal(optedOut({ globalPrivacyControl: true }), true);
  assert.equal(optedOut({}, { doNotTrack: "1" }), true);
  assert.equal(optedOut({ doNotTrack: "0" }), false);
});

test("page views carry only the path and referrer", () => {
  assert.deepEqual(pageViewPayload({ pathname: "/shop" }, "https://google.com/"), { path: "/shop", referrer: "https://google.com/" });
  assert.equal(collectorUrl("http://evil.example/collect"), null);
  assert.equal(collectorUrl("https://app.keelwork.dev/api/collect/k"), "https://app.keelwork.dev/api/collect/k");
});

test("health endpoint body", () => {
  assert.deepEqual(healthBody(), { ok: true });
});
