import { test } from "node:test";
import assert from "node:assert/strict";
import { safeRedirectPath, onboardingParams } from "./redirect";

test("safeRedirectPath keeps same-site paths", () => {
  assert.equal(safeRedirectPath("/projects/abc?tab=code#x"), "/projects/abc?tab=code#x");
  assert.equal(safeRedirectPath("/"), "/");
});

test("safeRedirectPath refuses open redirects", () => {
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "/%0d%0aSet-Cookie:x", "/\u0000x", "", null, 42, "javascript:alert(1)"]) {
    const out = safeRedirectPath(bad);
    assert.ok(out === "/dashboard" || (out.startsWith("/") && !out.startsWith("//")), `unexpected ${String(bad)} -> ${out}`);
    assert.ok(!out.includes("evil.com") || out.startsWith("/%"), `${String(bad)} leaked a host`);
  }
  assert.equal(safeRedirectPath("//evil.com"), "/dashboard");
  assert.equal(safeRedirectPath("/\\evil.com"), "/dashboard");
});

test("onboardingParams carries prompt and template safely", () => {
  assert.deepEqual(onboardingParams({ prompt: "  a shop  ", template: "clay-and-co" }), { prompt: "a shop", template: "clay-and-co" });
  assert.deepEqual(onboardingParams({ prompt: "", template: "../etc" }), {});
  assert.equal(onboardingParams({ prompt: "x".repeat(3000) }).prompt?.length, 2000);
});
