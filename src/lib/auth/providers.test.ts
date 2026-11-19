import { test } from "node:test";
import assert from "node:assert/strict";
import { enabledProviders } from "./providers";

test("auth providers: unset offers all, empty offers none, lists filter to known ids", () => {
  assert.deepEqual(enabledProviders(undefined), ["google", "azure", "github"]);
  assert.deepEqual(enabledProviders(""), []);
  assert.deepEqual(enabledProviders(" GitHub , google,unknown"), ["google", "github"]);
});
