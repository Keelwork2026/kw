/**
 * Keelwork preview proxy (`services/preview-proxy`).
 *
 * Runs next to the sandbox broker with wildcard DNS and TLS for
 * *.PREVIEW_BASE_DOMAIN. Each project is served at p-<projectId>.<base>.
 * Entry needs a signed token from the app; the proxy then sets a host-only
 * kw_preview cookie and forwards to the sandbox's dev server (including the
 * hot-reload websocket). Only Keelwork may frame previews.
 */
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from "node:http";
import { connect } from "node:net";
import { verifyPreviewToken, safeNext, projectFromHost } from "../../src/lib/preview/token";

export type ProxyOptions = {
  secret: string;
  baseDomain: string;
  appOrigin: string;
  /** Returns the dev server's loopback port for a project (asks the broker). */
  portFor: (projectId: string) => Promise<number | null>;
  now?: () => number;
};

const COOKIE = "kw_preview";
const EXPIRED = "This preview link has expired. Reopen it from Keelwork.";

export function brokerPortLookup(brokerUrl: string, token: string) {
  const cache = new Map<string, { port: number; at: number }>();
  return async (projectId: string): Promise<number | null> => {
    const hit = cache.get(projectId);
    if (hit && Date.now() - hit.at < 30_000) return hit.port;
    const res = await fetch(`${brokerUrl.replace(/\/$/, "")}/sandboxes/kw-${projectId}/port`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (!res?.ok) return null;
    const { port } = (await res.json()) as { port?: number };
    if (!Number.isInteger(port) || port! < 1024 || port! > 65535) return null;
    cache.set(projectId, { port: port!, at: Date.now() });
    return port!;
  };
}

function readCookie(header: string | undefined, name: string): string | null {
  for (const part of (header ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function stripCookie(header: string | undefined, name: string): string | undefined {
  const kept = (header ?? "").split(";").map((p) => p.trim()).filter((p) => p && !p.startsWith(`${name}=`));
  return kept.length ? kept.join("; ") : undefined;
}

function page(res: ServerResponse, status: number, text: string, csp: string) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; ${csp}`, "Cache-Control": "no-store" });
  res.end(`<!doctype html><meta charset="utf-8"><title>Keelwork preview</title><body style="font-family:system-ui;padding:3rem;color:#0b1f3a;background:#fbf8f4"><p>${text}</p></body>`);
}

export function createPreviewProxy(o: ProxyOptions) {
  const now = o.now ?? (() => Math.floor(Date.now() / 1000));
  const frame = `frame-ancestors ${new URL(o.appOrigin).origin}`;

  const authorize = (req: IncomingMessage, projectId: string) =>
    verifyPreviewToken(o.secret, readCookie(req.headers.cookie, COOKIE), projectId, now());

  const server = createServer(async (req, res) => {
    try {
      const projectId = projectFromHost(req.headers.host, o.baseDomain);
      if (!projectId) return page(res, 404, "Unknown preview.", frame);
      const url = new URL(req.url ?? "/", "http://preview.invalid");

      if (url.pathname === "/__kw/enter") {
        const token = url.searchParams.get("token");
        const check = verifyPreviewToken(o.secret, token, projectId, now());
        if (!check.ok) return page(res, check.reason === "expired" ? 401 : 403, check.reason === "expired" ? EXPIRED : "This preview link isn't valid.", frame);
        res.writeHead(302, {
          Location: safeNext(url.searchParams.get("next")),
          "Set-Cookie": `${COOKIE}=${token}; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=3600`,
          "Content-Security-Policy": frame,
          "Cache-Control": "no-store",
        });
        return res.end();
      }

      const auth = authorize(req, projectId);
      if (!auth.ok) return page(res, 401, auth.reason === "expired" ? EXPIRED : "Open this preview from Keelwork.", frame);

      const port = await o.portFor(projectId);
      if (!port) return page(res, 503, "The preview isn't running. Start the sandbox from Keelwork.", frame);

      const headers = { ...req.headers, host: `127.0.0.1:${port}`, cookie: stripCookie(req.headers.cookie, COOKIE) };
      delete (headers as Record<string, unknown>)["x-forwarded-for"];
      const upstream = httpRequest({ host: "127.0.0.1", port, method: req.method, path: req.url, headers }, (up) => {
        const out = { ...up.headers };
        delete out["x-frame-options"];
        delete out["content-security-policy"];
        out["content-security-policy"] = frame;
        res.writeHead(up.statusCode ?? 502, out);
        up.pipe(res);
      });
      upstream.on("error", () => { if (!res.headersSent) page(res, 502, "The preview's dev server isn't answering yet.", frame); else res.end(); });
      req.pipe(upstream);
    } catch {
      if (!res.headersSent) page(res, 500, "Preview error.", frame);
    }
  });

  // Hot-reload websockets.
  server.on("upgrade", async (req, socket, head) => {
    const projectId = projectFromHost(req.headers.host, o.baseDomain);
    if (!projectId || !authorize(req, projectId).ok) { socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n"); return; }
    const port = await o.portFor(projectId);
    if (!port) { socket.end("HTTP/1.1 503 Service Unavailable\r\n\r\n"); return; }
    const up = connect(port, "127.0.0.1", () => {
      const lines = [`${req.method} ${req.url} HTTP/1.1`];
      for (const [k, v] of Object.entries({ ...req.headers, host: `127.0.0.1:${port}`, cookie: stripCookie(req.headers.cookie, COOKIE) })) {
        if (v === undefined) continue;
        for (const val of Array.isArray(v) ? v : [v]) lines.push(`${k}: ${val}`);
      }
      up.write(lines.join("\r\n") + "\r\n\r\n");
      if (head.length) up.write(head);
      up.pipe(socket);
      socket.pipe(up);
    });
    up.on("error", () => socket.destroy());
    socket.on("error", () => up.destroy());
  });
  return server;
}

if (process.argv[1] && /preview-proxy\/proxy\.ts$/.test(process.argv[1])) {
  const need = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`${k} is not set`); return v; };
  const server = createPreviewProxy({
    secret: need("PREVIEW_SECRET"), baseDomain: need("PREVIEW_BASE_DOMAIN"), appOrigin: need("APP_ORIGIN"),
    portFor: brokerPortLookup(need("BROKER_URL"), need("BROKER_TOKEN")),
  });
  const port = Number(process.env.PORT ?? 8080);
  const host = process.env.HOST || "0.0.0.0";
  server.listen(port, host, () => console.log(`[preview-proxy] listening on ${host}:${port}`));
}
