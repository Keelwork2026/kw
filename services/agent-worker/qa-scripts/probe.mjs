// Keelwork QA probe. Runs INSIDE the project's own sandbox against its dev
// server only (cfg.base is always http://127.0.0.1:3000). It reads pages,
// calls endpoints and measures timings; it never sends DELETE requests and
// never sends well-formed bodies to endpoints that change data.
import fs from "node:fs";

const cfg = JSON.parse(fs.readFileSync(".keelwork/qa/config.json", "utf8"));
const base = cfg.base;
const out = { startedAt: new Date().toISOString(), pages: [], apis: [], assets: [], notFound: null, load: null, errors: [] };
const ASSET = /\.(png|jpe?g|gif|svg|webp|ico|pdf|zip|mp4|mp3|woff2?|ttf|css|js|map|txt|xml)$/i;

function headersOf(r) {
  const h = {};
  r.headers.forEach((v, k) => { h[k.toLowerCase()] = v; });
  const cookies = typeof r.headers.getSetCookie === "function" ? r.headers.getSetCookie() : [];
  if (cookies.length) h["set-cookie"] = cookies.join(", ");
  return h;
}

async function request(path, init = {}) {
  const t0 = performance.now();
  let current = path;
  try {
    for (let hop = 0; hop < 6; hop++) {
      const r = await fetch(new URL(current, base), { redirect: "manual", signal: AbortSignal.timeout(cfg.timeoutMs), ...init });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location") && hop < 5 && (!init.method || init.method === "GET")) {
        const next = new URL(r.headers.get("location"), new URL(current, base));
        if (next.origin !== new URL(base).origin) return { status: r.status, ms: Math.round(performance.now() - t0), headers: headersOf(r), body: "", finalPath: next.href };
        current = next.pathname + next.search;
        continue;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      return { status: r.status, ms: Math.round(performance.now() - t0), headers: headersOf(r), body: buf.toString("utf8"), bytes: buf.length, finalPath: current };
    }
    return { status: null, ms: null, headers: {}, body: "", error: "too many redirects" };
  } catch (e) {
    return { status: null, ms: null, headers: {}, body: "", error: String(e && e.message || e).slice(0, 200) };
  }
}

function links(html, from) {
  const outLinks = new Set();
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(m[1].replace(/&amp;/g, "&"), new URL(from, base));
      if (u.origin !== new URL(base).origin) continue;
      const p = u.pathname.replace(/\/+$/, "") || "/";
      if (ASSET.test(p) || p.startsWith("/api/") || p.startsWith("/_next/")) continue;
      outLinks.add(p);
    } catch { /* bad href */ }
  }
  return [...outLinks];
}

const excluded = (p) => cfg.excluded.some((x) => x && (p === x || p.startsWith(x.endsWith("/") ? x : `${x}/`)));

// 1. Crawl pages (GET only), breadth first from the known routes.
const queue = [...new Set(cfg.paths)];
const seen = new Set();
while (queue.length && out.pages.length < cfg.maxPages) {
  const path = queue.shift();
  if (seen.has(path) || excluded(path)) continue;
  seen.add(path);
  const r = await request(path, { headers: { accept: "text/html" } });
  const isHtml = /text\/html/.test(r.headers["content-type"] || "");
  out.pages.push({ path, url: new URL(path, base).href, status: r.status, ms: r.ms, bytes: r.bytes || 0, headers: r.headers, html: isHtml ? r.body.slice(0, 400000) : "", finalPath: r.finalPath, error: r.error });
  if (isHtml && r.status && r.status < 400 && cfg.follow) for (const l of links(r.body, path)) if (!seen.has(l)) queue.push(l);
}

// 2. A page that doesn't exist.
const missing = `/keelwork-qa-missing-${Math.random().toString(36).slice(2, 8)}`;
const nf = await request(missing, { headers: { accept: "text/html" } });
out.notFound = { path: missing, url: new URL(missing, base).href, status: nf.status, ms: nf.ms, bytes: nf.bytes || 0, headers: nf.headers, html: nf.body.slice(0, 100000), finalPath: nf.finalPath };

// 3. Endpoints. GET as-is; data-changing methods only with a malformed body.
for (const ep of cfg.endpoints) {
  if (excluded(ep.path)) continue;
  const path = ep.path.replace(/\[\[?\.\.\.[^\]]+\]\]?/g, "x").replace(/\[[^\]]+\]/g, "00000000-0000-0000-0000-000000000000");
  for (const method of ep.methods) {
    if (method === "GET") {
      const r = await request(path, { headers: { accept: "application/json" } });
      out.apis.push({ path: ep.path, method, variant: "plain", status: r.status, ms: r.ms, headers: r.headers, body: r.body.slice(0, 2000), error: r.error });
    } else if (cfg.active && ["POST", "PUT", "PATCH"].includes(method)) {
      const r = await request(path, { method, headers: { "content-type": "application/json", accept: "application/json" }, body: "{\"keelwork_qa\": " });
      out.apis.push({ path: ep.path, method, variant: "malformed", status: r.status, ms: r.ms, headers: r.headers, body: r.body.slice(0, 2000), error: r.error });
    }
  }
}

// 4. Asset weight on the first page that loaded.
const first = out.pages.find((p) => p.status && p.status < 400 && p.html);
if (first) {
  const srcs = [...first.html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map((m) => ["script", m[1]])
    .concat([...first.html.matchAll(/<link\b[^>]*rel\s*=\s*["']stylesheet["'][^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => ["style", m[1]]));
  for (const [kind, src] of srcs.slice(0, 40)) {
    let u; try { u = new URL(src.replace(/&amp;/g, "&"), first.url); } catch { continue; }
    if (u.origin !== new URL(base).origin) continue;
    const r = await request(u.pathname + u.search);
    out.assets.push({ url: u.pathname, kind, bytes: r.bytes ?? null, ms: r.ms, status: r.status });
  }
}

// 5. Authorised penetration probes (sandbox only): reflected input and open redirects.
if (cfg.pentest) {
  out.pentest = { reflections: [], redirects: [] };
  const marker = "kwqa" + Math.random().toString(36).slice(2, 7);
  const payload = `<script>${marker}</script>"'`;
  for (const p of out.pages.filter((x) => x.status && x.status < 400 && x.html).slice(0, 15)) {
    const r = await request(`${p.path}${p.path.includes("?") ? "&" : "?"}q=${encodeURIComponent(payload)}&search=${encodeURIComponent(payload)}`, { headers: { accept: "text/html" } });
    out.pentest.reflections.push({ path: p.path, status: r.status, reflectedRaw: r.body.includes(`<script>${marker}</script>`), reflectedEscaped: r.body.includes(marker) && !r.body.includes(`<script>${marker}</script>`) });
  }
  const authish = out.pages.filter((p) => /sign-?in|login|auth|logout|redirect|callback/i.test(p.path)).slice(0, 6);
  for (const p of authish) for (const param of ["next", "redirect", "returnTo", "redirect_to", "callbackUrl"]) {
    const r = await fetch(new URL(`${p.path}?${param}=${encodeURIComponent("https://keelwork-qa.invalid/x")}`, base), { redirect: "manual", signal: AbortSignal.timeout(cfg.timeoutMs) }).catch(() => null);
    const loc = r && r.headers.get("location");
    out.pentest.redirects.push({ path: p.path, param, status: r ? r.status : null, location: loc, external: !!loc && /keelwork-qa\.invalid/.test(loc) });
  }
}

// 6. Optional load test, capped, against this sandbox only.
if (cfg.load) {
  const targets = out.pages.filter((p) => p.status && p.status < 400).slice(0, 4).map((p) => p.path);
  if (targets.length) {
    const lat = []; let errors = 0; let n = 0;
    const end = Date.now() + cfg.load.seconds * 1000;
    const worker = async () => {
      while (Date.now() < end && n < 20000) {
        const p = targets[n++ % targets.length];
        const t0 = performance.now();
        try { const r = await fetch(new URL(p, base), { signal: AbortSignal.timeout(10000) }); await r.arrayBuffer(); if (r.status >= 500) errors++; } catch { errors++; }
        lat.push(performance.now() - t0);
      }
    };
    const t0 = Date.now();
    await Promise.all(Array.from({ length: cfg.load.concurrency }, worker));
    lat.sort((a, b) => a - b);
    const pct = (q) => Math.round(lat[Math.min(lat.length - 1, Math.floor(q * lat.length))] || 0);
    out.load = { target: targets.join(", "), concurrency: cfg.load.concurrency, seconds: cfg.load.seconds, requests: lat.length, errors, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), rps: lat.length / ((Date.now() - t0) / 1000) };
  }
}

fs.writeFileSync(".keelwork/qa/out.json", JSON.stringify(out));
console.log(`probe: ${out.pages.length} pages, ${out.apis.length} endpoint calls, ${out.assets.length} assets`);
