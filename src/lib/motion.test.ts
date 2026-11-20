import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(import.meta.dirname, "..", "app", "globals.css"), "utf8");
const reduce = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));

test("motion: every looping animation stops when people ask for less motion", () => {
  const looping = [...css.matchAll(/(\.[a-z0-9-]+(?:\s*>\s*[a-z]+)?(?:::after)?)\s*\{[^}]*animation:[^;}]*infinite/g)].map((m) => m[1]!.replace(/\s+/g, " ").trim());
  assert.ok(looping.length >= 8);
  for (const sel of looping) assert.ok(reduce.includes(sel), `${sel} keeps looping under reduced motion`);
});

test("motion: entrances never leave a transform behind (fixed overlays stay anchored to the viewport)", () => {
  const motion = css.slice(css.indexOf("Motion system"));
  const entrance = [...motion.matchAll(/animation:\s*kw-(enter|enter-x|dialog|drop|status)[^;]*;/g)].map((m) => m[0]);
  assert.ok(entrance.length > 5);
  for (const a of entrance) assert.ok(!/\bboth\b|\bforwards\b/.test(a), `${a} fills forwards`);
});

test("motion: one set of timing tokens, and travel collapses to zero for reduced motion", () => {
  for (const t of ["--kw-d1", "--kw-d2", "--kw-d3", "--kw-d4", "--kw-ease", "--kw-move"]) assert.ok(css.includes(`${t}:`), t);
  assert.match(reduce, /--kw-move:\s*0px/);
  assert.match(reduce, /\.kw-confetti\s*\{\s*display:\s*none/);
});
