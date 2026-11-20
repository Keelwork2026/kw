// Read-only preview gateway for sharing the public pages of a local Keelwork
// with a phone through a temporary tunnel.
//
//   node scripts/share-preview.mjs        # listens on 127.0.0.1:3077
//
// Only GET/HEAD requests for public marketing pages, template previews,
// static assets and connector logos are forwarded to the app on
// 127.0.0.1:3000. Everything else — sign-in, the app, the API, server actions,
// admin — gets a short "not available on this preview link" page. Cookies are
// stripped both ways so no session can be used or created through the link.
import http from "node:http";

const PORT = Number(process.env.SHARE_PORT ?? 3077);
const TARGET = { host: "127.0.0.1", port: Number(process.env.APP_PORT ?? 3000) };
const ALLOW = [
  /^\/$/, /^\/starters(\/[\w-]+)?\/?$/, /^\/demo\/[\w-]+(\/[\w./-]*)?$/, /^\/_next\/(static|image)\//, /^\/api\/connectors\/logo\/[a-z0-9-]+$/,
  /^\/(pricing|product|solutions|tutorials|docs|changelog|trust|privacy|acceptable-use|status)(\/[\w-]*)*\/?$/,
  /^\/(favicon\.ico|icon\.svg|apple-icon\.png|robots\.txt|manifest\.webmanifest)$/,
];

export function allowed(method, url) {
  if (method !== "GET" && method !== "HEAD") return false;
  const path = (url ?? "/").split("?")[0];
  if (path.includes("..") || path.includes("%2e") || path.includes("%2E")) return false;
  return ALLOW.some((re) => re.test(path));
}

const blocked = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview link</title>
<body style="font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.5rem;color:#1f1b18">
<h1 style="font-size:1.5rem">This part isn't on the preview link</h1>
<p>This temporary link shows Keelwork's public pages and template previews only. Signing in, projects and settings work on the computer running Keelwork.</p>
<p><a href="/" style="color:#b3263e;font-weight:600">Back to the homepage</a> · <a href="/starters" style="color:#b3263e;font-weight:600">Browse templates</a></p></body>`;

if (process.env.SHARE_NO_LISTEN !== "1") {
  http.createServer((req, res) => {
    if (!allowed(req.method, req.url)) {
      res.writeHead(403, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" });
      return res.end(req.method === "HEAD" ? undefined : blocked);
    }
    const headers = { ...req.headers, host: `${TARGET.host}:${TARGET.port}` };
    delete headers.cookie; delete headers.authorization;
    const up = http.request({ ...TARGET, method: req.method, path: req.url, headers }, (r) => {
      const h = { ...r.headers, "x-robots-tag": "noindex, nofollow" };
      delete h["set-cookie"];
      res.writeHead(r.statusCode ?? 502, h);
      r.pipe(res);
    });
    up.on("error", () => { res.writeHead(502, { "content-type": "text/plain" }); res.end("Keelwork isn't running on this computer right now."); });
    up.end();
  }).listen(PORT, "127.0.0.1", () => console.log(`share-preview on http://127.0.0.1:${PORT}`));
}
