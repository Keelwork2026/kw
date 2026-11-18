import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { envByProcess, envReads } from "./env-vars";

test("every variable any process reads is documented in .env.example", () => {
  const example = readFileSync(".env.example", "utf8");
  const documented = new Set([...example.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]!));
  const used = new Set(Object.values(envByProcess()).flat());
  const missing = [...used].filter((n) => !documented.has(n));
  assert.deepEqual(missing, []);
  assert.ok(!/=\s*(sk_|whsec_|eyJ|[A-Za-z0-9+/]{40,})/m.test(example), ".env.example holds no values");
});

test("envReads finds direct and indirect reads", () => {
  assert.deepEqual(envReads('process.env.A_B; process.env["C_D"]; need("E_F"); env.G_H').sort(), ["A_B", "C_D", "E_F", "G_H"]);
});
