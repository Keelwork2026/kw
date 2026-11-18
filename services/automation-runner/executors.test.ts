import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createExecutors } from "./executors";
import { TemporaryError } from "../../src/lib/automation/engine";

let server: Server, port = 0;
const seen: { url: string; auth?: string; body: string }[] = [];
before(async () => {
  server = createServer((req, res) => {
    let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
      seen.push({ url: req.url!, auth: req.headers.authorization, body });
      if (req.url === "/busy") { res.writeHead(503); res.end(); return; }
      if (req.url === "/bad") { res.writeHead(400); res.end(); return; }
      if (req.url === "/redirect") { res.writeHead(302, { Location: "http://169.254.169.254/" }); res.end(); return; }
      res.writeHead(200, { "Content-Type": "application/json" }); res.end('{"ok":true}');
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as AddressInfo).port;
});
after(() => server.close());

const net = () => ({ allowHttp: true, resolver: async (h: string) => (h === "internal.test" ? [{ address: "10.0.0.1", family: 4 }] : [{ address: "93.184.216.34", family: 4 }]), connectTo: () => ({ host: "127.0.0.1", port }) });

test("http executor: JSON out, 5xx is temporary, 4xx is permanent, no redirects, SSRF-checked", async () => {
  const ex = createExecutors({}, net());
  assert.deepEqual(await ex.http({ method: "POST", url: "http://api.test/ok", headers: { "Content-Type": "application/json" }, body: "{}" }), { status: 200, json: { ok: true }, text: '{"ok":true}' });
  await assert.rejects(ex.http({ method: "GET", url: "http://api.test/busy", headers: {} }), TemporaryError);
  await assert.rejects(ex.http({ method: "GET", url: "http://api.test/bad", headers: {} }), (e: Error) => !(e instanceof TemporaryError));
  await assert.rejects(ex.http({ method: "GET", url: "http://api.test/redirect", headers: {} }), /not followed/);
  await assert.rejects(ex.http({ method: "GET", url: "http://internal.test/", headers: {} }), /private/);
});

test("email and slack use the project's own credentials", async () => {
  await assert.rejects(createExecutors({}, net()).email({ from: "a@x.dev", to: "b@x.dev", subject: "s", text: "t" }), /RESEND_API_KEY/);
  await assert.rejects(createExecutors({}, net()).slack({ text: "hi" }), /SLACK_WEBHOOK_URL/);
  await assert.rejects(createExecutors({ SLACK_WEBHOOK_URL: "https://evil.example/hook" }, net()).slack({ text: "hi" }), /hooks.slack.com/);
});
