import { test } from "node:test";
import assert from "node:assert/strict";
import { isMediaPath, parseManifest, parseShotPaths, safeName, serializeManifest, shotName, sniffImage, upsertEntry, validateUpload } from "./media";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

test("media: formats come from the bytes, not the name; SVG is refused", () => {
  assert.equal(sniffImage(png), "png");
  assert.equal(sniffImage(jpg), "jpeg");
  assert.equal(sniffImage(svg), null);
  assert.equal(validateUpload({ bytes: svg, name: "logo.png", alt: "Logo", rights: true }).ok, false);
  assert.equal(validateUpload({ bytes: png, name: "a.png", alt: "Our shopfront", rights: false }).ok, false);
  assert.equal(validateUpload({ bytes: png, name: "a.png", alt: "", rights: true }).ok, false);
  assert.equal(validateUpload({ bytes: new Uint8Array(1_600_000).fill(0xff), name: "big.jpg", alt: "Big photo", rights: true }).ok, false);
  assert.deepEqual(validateUpload({ bytes: png, name: "a.png", alt: "Our shopfront", rights: true }), { ok: true, type: "png" });
});

test("media: names are safe and unique, extensions match the content", () => {
  assert.equal(safeName("My Shop Front!!.PNG", "jpeg"), "my-shop-front.jpg");
  assert.equal(safeName("../../etc/passwd", "png"), "etcpasswd.png");
  assert.equal(safeName("photo.jpg", "jpeg", ["photo.jpg", "photo-2.jpg"]), "photo-3.jpg");
  assert.equal(safeName("###", "png"), "image.png");
  assert.ok(isMediaPath("public/images/my-shop-front.jpg"));
  assert.ok(!isMediaPath("public/images/../../.env.local"));
  assert.ok(!isMediaPath("app/page.tsx"));
});

test("media: manifest round-trips and ignores junk", () => {
  const e = { file: "public/images/a.png", alt: "A", source: "upload" as const, added: "2026-11-20" };
  const list = upsertEntry(upsertEntry([], e), { ...e, alt: "A2" });
  assert.equal(list.length, 1);
  assert.equal(parseManifest(serializeManifest(list))[0]!.alt, "A2");
  assert.deepEqual(parseManifest("not json"), []);
  assert.deepEqual(parseManifest('{"images":[{"file":1},{"file":"x","alt":"y","source":"stock"}]}'), []);
});

test("media: screenshot paths are app paths only", () => {
  assert.deepEqual(parseShotPaths(""), ["/"]);
  assert.deepEqual(parseShotPaths("/ /pricing, /book"), ["/", "/pricing", "/book"]);
  assert.equal(parseShotPaths("https://evil.example"), null);
  assert.equal(parseShotPaths("//evil.example"), null);
  assert.equal(parseShotPaths("/../secret"), null);
  assert.equal(shotName("/", 1440), "home-desktop.png");
  assert.equal(shotName("/classes/yoga", 390), "classes-yoga-mobile.png");
});
