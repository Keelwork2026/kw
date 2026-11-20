import { test } from "node:test";
import assert from "node:assert/strict";
import { nameFromIdea } from "./idea";

test("idea: a short, readable default name", () => {
  assert.equal(nameFromIdea("A booking app for my yoga studio with class passes and card payments"), "Booking App for My Yoga Studio");
  assert.equal(nameFromIdea("I want to build a habit tracker that reminds me to drink water"), "Habit Tracker");
  assert.equal(nameFromIdea("Build me an AI tool that summarises PDFs"), "AI Tool");
  assert.equal(nameFromIdea("Inventory dashboard, with low-stock alerts"), "Inventory Dashboard");
  assert.equal(nameFromIdea("   "), "New project");
  assert.equal(nameFromIdea("!!", "Website"), "New website");
  assert.ok(nameFromIdea("x".repeat(500)).length <= 60);
  assert.equal(nameFromIdea("Café menu site for Lagos"), "Café Menu Site for Lagos");
});
