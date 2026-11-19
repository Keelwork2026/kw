import { test } from "node:test";
import assert from "node:assert/strict";
import { progress } from "./engagement";
import { ideasForDay, starterHref, STARTERS } from "./site/starters";

const now = new Date("2026-11-20T15:00:00Z");

test("progress: counts real milestones and names the next step", () => {
  const m = (key: string, done: boolean) => ({ key, label: key, hint: "", href: "/", done });
  const p = progress([m("a", true), m("b", false), m("c", true)]);
  assert.equal(p.done, 2);
  assert.equal(p.percent, 67);
  assert.equal(p.next?.key, "b");
  assert.equal(progress([]).percent, 0);
  assert.equal(progress([m("a", true)]).next, null);
});

test("ideas and starter links", () => {
  const a = ideasForDay(now), b = ideasForDay(now);
  assert.deepEqual(a.map((s) => s.slug), b.map((s) => s.slug), "same ideas all day");
  assert.equal(new Set(a.map((s) => s.slug)).size, 3);
  const href = starterHref(STARTERS[0]!, true);
  assert.ok(href.startsWith("/new-project?") && href.includes("template=studio-bookings"));
  for (const s of STARTERS) assert.ok(s.prompt.length <= 2000 && s.name.length <= 80, `${s.slug} brief fits the form`);
});
