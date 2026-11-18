import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { isPublicAddress, safeRequest, SafeFetchError, type Resolver } from "./safe-fetch";
import { extractStructure } from "./extract";

let server: Server, port = 0;
const PAGE = `<!doctype html><html><head><title>Clay &amp; Co</title><meta name="description" content="Handmade ceramics">
<style>body{color:#0B1F3A;font-family:"Fraunces", serif} .b{background:rgb(61, 43, 255)}</style>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400" rel="stylesheet"><script>alert(1)</script></head>
<body><nav><a href="/shop">Shop</a><a href="javascript:alert(1)">x</a><a href="https://clay.example/about">About</a></nav>
<section><h2>Our studio</h2><p>Every piece is thrown by hand.</p></section><h1>Clay &amp; Co</h1></body></html>`;

before(async () => {
  server = createServer((req, res) => {
    if (req.url === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(PAGE); return; }
    if (req.url === "/hop1") { res.writeHead(302, { Location: "/hop2" }); res.end(); return; }
    if (req.url === "/hop2") { res.writeHead(301, { Location: "http://site.test/" }); res.end(); return; }
    if (req.url === "/loop") { res.writeHead(302, { Location: "/loop" }); res.end(); return; }
    if (req.url === "/to-metadata") { res.writeHead(302, { Location: "http://metadata.test/latest/meta-data" }); res.end(); return; }
    if (req.url === "/big") { res.writeHead(200, { "Content-Type": "text/html" }); res.end("x".repeat(3_000_000)); return; }
    if (req.url === "/big-chunked") { res.writeHead(200, { "Content-Type": "text/html", "Transfer-Encoding": "chunked" }); for (let i = 0; i < 30; i++) res.write("y".repeat(100_000)); res.end(); return; }
    if (req.url === "/image") { res.writeHead(200, { "Content-Type": "image/png" }); res.end("png"); return; }
    if (req.url === "/slow") { setTimeout(() => { res.writeHead(200); res.end("late"); }, 2000); return; }
    res.writeHead(404); res.end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as AddressInfo).port;
});
after(() => server.close());

// Fake DNS: public names resolve to documentation-free public IPs; the test hook dials the local server.
const dns: Record<string, string[]> = {
  "site.test": ["93.184.216.34"],
  "metadata.test": ["169.254.169.254"],
  "rebind.test": ["93.184.216.34", "10.0.0.5"],
  "mapped.test": ["::ffff:127.0.0.1"],
};
const resolver: Resolver = async (h) => (dns[h] ?? []).map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));
const opts = { resolver, allowHttp: true, connectTo: () => ({ host: "127.0.0.1", port }), accept: /^text\/html/, timeoutMs: 1000 };

test("isPublicAddress rejects private, loopback, link-local, CGNAT, metadata, ULA and mapped forms", () => {
  for (const ip of ["10.1.2.3", "127.0.0.1", "169.254.169.254", "100.64.0.1", "172.16.5.5", "192.168.1.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fc00::1", "fd12::1", "fe80::1", "::ffff:10.0.0.1", "::ffff:169.254.169.254", "64:ff9b::a9fe:a9fe", "2002:a9fe:a9fe::1", "ff02::1", "not-an-ip"]) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
  for (const ip of ["93.184.216.34", "1.1.1.1", "2606:4700::1111", "::ffff:8.8.8.8"]) assert.equal(isPublicAddress(ip), true, ip);
});

test("safeRequest fetches a public page and follows up to 3 re-checked redirects", async () => {
  const r = await safeRequest("http://site.test/hop1", opts);
  assert.equal(r.status, 200);
  assert.equal(r.finalUrl, "http://site.test/");
  await assert.rejects(safeRequest("http://site.test/loop", opts), /too many redirects/);
  await assert.rejects(safeRequest("http://site.test/to-metadata", opts), /private or reserved/);
  await assert.rejects(safeRequest("http://site.test/hop1", { ...opts, followRedirects: false }), /not followed/);
});

test("safeRequest checks every DNS answer, literals and schemes", async () => {
  await assert.rejects(safeRequest("http://rebind.test/", opts), /private or reserved/);
  await assert.rejects(safeRequest("http://mapped.test/", opts), /private or reserved/);
  await assert.rejects(safeRequest("http://metadata.test/", opts), /private or reserved/);
  await assert.rejects(safeRequest("http://127.0.0.1/", opts), /private or reserved/);
  await assert.rejects(safeRequest("http://[::1]/", opts), /private or reserved/);
  await assert.rejects(safeRequest("http://site.test/", { ...opts, allowHttp: false }), /only https/);
  await assert.rejects(safeRequest("http://u:p@site.test/", opts), /credentials/);
  await assert.rejects(safeRequest("http://nowhere.test/", opts), /couldn't resolve/);
});

test("safeRequest enforces size, content type and time limits", async () => {
  await assert.rejects(safeRequest("http://site.test/big", opts), /larger than 2 MB/);
  await assert.rejects(safeRequest("http://site.test/big-chunked", opts), /larger than 2 MB/);
  await assert.rejects(safeRequest("http://site.test/image", opts), /content type/);
  await assert.rejects(safeRequest("http://site.test/slow", { ...opts, accept: undefined, timeoutMs: 300 }), (e: Error) => e instanceof SafeFetchError && /timed out|failed/.test(e.message));
});

test("extractStructure pulls title, headings, nav, sections, colours and fonts", async () => {
  const r = await safeRequest("http://site.test/", opts);
  const s = extractStructure(r.body.toString(), r.finalUrl);
  assert.equal(s.title, "Clay & Co");
  assert.equal(s.description, "Handmade ceramics");
  assert.deepEqual(s.headings.map((h) => h.text), ["Our studio", "Clay & Co"]);
  assert.deepEqual(s.nav, [{ text: "Shop", href: "http://site.test/shop" }, { text: "About", href: "https://clay.example/about" }]);
  assert.deepEqual(s.sections, [{ heading: "Our studio", text: "Every piece is thrown by hand." }]);
  assert.ok(s.colors.includes("#0b1f3a") && s.colors.includes("rgb(61, 43, 255)"));
  assert.deepEqual(s.fonts, ["Space Grotesk", "Fraunces"]);
});
