import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createPreviewProxy, withFrameAncestors } from "./proxy";
import { signPreviewToken, verifyPreviewToken, safeNext, projectFromHost } from "../../src/lib/preview/token";

const SECRET = "s".repeat(40);
const PID = "3f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const OTHER = "9f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const BASE = "preview.keelwork.test";
let app: Server, proxy: Server, proxyPort = 0;
const seenCookies: (string | undefined)[] = [];

before(async () => {
  app = createServer((req, res) => {
    seenCookies.push(req.headers.cookie);
    res.writeHead(200, { "Content-Type": "text/plain", "X-Frame-Options": "DENY" });
    res.end(`hello from the app at ${req.url}`);
  });
  await new Promise<void>((r) => app.listen(0, "127.0.0.1", r));
  const appPort = (app.address() as AddressInfo).port;
  proxy = createPreviewProxy({ secret: SECRET, baseDomain: BASE, appOrigin: "https://app.keelwork.test", portFor: async (id) => (id === PID ? appPort : null) });
  await new Promise<void>((r) => proxy.listen(0, "127.0.0.1", r));
  proxyPort = (proxy.address() as AddressInfo).port;
});
after(() => { app.close(); proxy.close(); });

function get(path: string, host: string, cookie?: string) {
  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port: proxyPort, path, headers: { host, ...(cookie ? { cookie } : {}) } }, (res) => {
      let body = ""; res.on("data", (c) => (body += c)); res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body }));
    });
    req.on("error", reject); req.end();
  });
}
const host = (id = PID) => `p-${id}.${BASE}`;

test("tokens: valid, wrong project, expired, tampered and extended expiry", () => {
  const now = 1_800_000_000;
  const t = signPreviewToken(SECRET, PID, now);
  assert.deepEqual(verifyPreviewToken(SECRET, t, PID, now), { ok: true, exp: now + 3600 });
  assert.deepEqual(verifyPreviewToken(SECRET, t, OTHER, now), { ok: false, reason: "wrong-project" });
  assert.deepEqual(verifyPreviewToken(SECRET, t, PID, now + 3601), { ok: false, reason: "expired" });
  const [id, exp, sig] = t.split(".");
  assert.equal(verifyPreviewToken(SECRET, `${id}.${Number(exp) + 86400}.${sig}`, PID, now).ok, false);
  assert.equal(verifyPreviewToken(SECRET, `${id}.${exp}.${"0".repeat(64)}`, PID, now).ok, false);
  assert.equal(verifyPreviewToken("x".repeat(40), t, PID, now).ok, false);
  assert.equal(verifyPreviewToken(SECRET, `${OTHER}.${exp}.${sig}`, OTHER, now).ok, false);
});

test("safeNext and host parsing refuse open redirects and foreign hosts", () => {
  assert.equal(safeNext("/?kw-inspect=1"), "/?kw-inspect=1");
  for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "evil", null]) assert.equal(safeNext(bad), "/");
  assert.equal(projectFromHost(`p-${PID}.${BASE}:443`, BASE), PID);
  assert.equal(projectFromHost(`p-${PID}.evil.com`, BASE), null);
  assert.equal(projectFromHost(`x.p-${PID}.${BASE}`, BASE), null);
});

test("proxy end to end: enter, cookie, forward, frame-ancestors", async () => {
  const token = signPreviewToken(SECRET, PID);
  const enter = await get(`/__kw/enter?token=${token}&next=${encodeURIComponent("/about?kw-inspect=1")}`, host());
  assert.equal(enter.status, 302);
  assert.equal(enter.headers.location, "/about?kw-inspect=1");
  const cookie = String(enter.headers["set-cookie"]);
  for (const attr of ["HttpOnly", "Secure", "SameSite=None", "Partitioned", "Max-Age=3600"]) assert.ok(cookie.includes(attr), attr);
  assert.ok(!/Domain=/i.test(cookie), "the cookie is host-only");

  const page = await get("/about", host(), `kw_preview=${token}; theme=dark`);
  assert.equal(page.status, 200);
  assert.equal(page.body, "hello from the app at /about");
  assert.equal(page.headers["content-security-policy"], "frame-ancestors https://app.keelwork.test");
  assert.equal(page.headers["x-frame-options"], undefined);
  assert.equal(seenCookies.at(-1), "theme=dark", "the preview cookie is not forwarded to the app");
});

test("proxy refuses missing, foreign, expired and redirecting tokens", async () => {
  assert.equal((await get("/", host())).status, 401);
  const other = signPreviewToken(SECRET, OTHER);
  assert.equal((await get("/", host(), `kw_preview=${other}`)).status, 401);
  assert.equal((await get(`/__kw/enter?token=${other}`, host())).status, 403);
  const old = signPreviewToken(SECRET, PID, Math.floor(Date.now() / 1000) - 7200);
  const expired = await get(`/__kw/enter?token=${old}`, host());
  assert.equal(expired.status, 401);
  assert.match(expired.body, /This preview link has expired\. Reopen it from Keelwork\./);
  const token = signPreviewToken(SECRET, PID);
  assert.equal((await get(`/__kw/enter?token=${token}&next=//evil.com`, host())).headers.location, "/");
  assert.equal((await get("/", "evil.com", `kw_preview=${token}`)).status, 404);
  const stopped = signPreviewToken(SECRET, OTHER);
  assert.equal((await get(`/`, host(OTHER), `kw_preview=${stopped}`)).status, 503);
});

test("proxy keeps the app's CSP but only Keelwork may frame it", () => {
  const f = "frame-ancestors https://app.keelwork.test";
  assert.equal(withFrameAncestors(undefined, f), f);
  assert.equal(withFrameAncestors("default-src 'self'; frame-ancestors 'none'; object-src 'none'", f), `default-src 'self'; object-src 'none'; ${f}`);
  assert.equal(withFrameAncestors(["script-src 'self'", "FRAME-ANCESTORS *"], f), `script-src 'self'; ${f}`);
});
