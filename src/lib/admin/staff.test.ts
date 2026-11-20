import { test } from "node:test";
import assert from "node:assert/strict";
import { CAN, canOpen, dollarsToMicros, sectionsFor } from "./staff";
import { grantView } from "@/lib/admin-view";

test("staff: each role sees only what it can act on", () => {
  assert.deepEqual(sectionsFor("reviewer").map((s) => s.slug), ["", "policy", "marketplace", "simple", "staff"]);
  assert.ok(sectionsFor("superadmin").length === 10);
  assert.ok(!canOpen("support", "audit") && canOpen("security", "audit"));
  assert.ok(!canOpen("support", "safety") && canOpen("security", "safety"));
  assert.ok(!canOpen(null, ""));
  assert.ok(CAN.adjustCredits("superadmin") && !CAN.adjustCredits("security"));
  assert.ok(CAN.suspend("security") && !CAN.suspend("support"));
});

test("staff: credit amounts are parsed strictly", () => {
  assert.equal(dollarsToMicros("25"), 25_000_000);
  assert.equal(dollarsToMicros("-$12.50"), -12_500_000);
  assert.equal(dollarsToMicros("1,000"), 1_000_000_000);
  assert.equal(dollarsToMicros("0"), null);
  assert.equal(dollarsToMicros("12.345"), null);
  assert.equal(dollarsToMicros("20000"), null);
  assert.equal(dollarsToMicros("ten"), null);
});

test("staff: a support request waiting for the owner shows as waiting", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  assert.equal(grantView({ status: "requested", expires_at: null }, now), "waiting");
  assert.equal(grantView({ status: "approved", expires_at: "2026-11-20T13:00:00Z" }, now), "active");
  assert.equal(grantView({ status: "approved", expires_at: "2026-11-20T11:00:00Z" }, now), "ended");
});
