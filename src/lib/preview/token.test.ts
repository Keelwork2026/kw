import { test } from "node:test";
import assert from "node:assert/strict";
import { isLocalPreviewDomain, previewOriginFor, projectFromHost } from "./token";
import { buildCsp } from "../security/headers";

const ID = "0aa0609a-3374-4b3e-84f9-635548dcff7a";

test("preview: https everywhere except a *.localhost base domain, which may carry a port", () => {
  assert.equal(previewOriginFor(ID, "preview.keelwork.dev"), `https://p-${ID}.preview.keelwork.dev`);
  assert.equal(previewOriginFor(ID, "preview.localhost:8080"), `http://p-${ID}.preview.localhost:8080`);
  assert.equal(isLocalPreviewDomain("localhost.evil.com"), false);
  assert.equal(isLocalPreviewDomain("preview.localhost:8080"), true);
  assert.equal(projectFromHost(`p-${ID}.preview.localhost:8080`, "preview.localhost:8080"), ID);
  assert.equal(projectFromHost(`p-${ID}.preview.localhost.evil.com`, "preview.localhost:8080"), null);
});

test("preview: the CSP frames http previews only for a localhost base", () => {
  const frame = (base: string) => buildCsp({ nonce: "n", previewBaseDomain: base }).split("; ").find((d) => d.startsWith("frame-src"));
  assert.equal(frame("preview.localhost:8080"), "frame-src 'self' http://*.preview.localhost:8080");
  assert.equal(frame("preview.keelwork.dev"), "frame-src 'self' https://*.preview.keelwork.dev");
  assert.equal(frame("evil.com:80"), "frame-src 'self'");
});
