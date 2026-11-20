import { test } from "node:test";
import assert from "node:assert/strict";
import { discover, findRoutes, matchRoute, classify } from "./discover";
import { parse, internalPaths } from "./html";
import { accessibility, functionalLive, journeys, securityLive, staticCode, ux, performance, load, responsive, fromChecks, hashHex, type PageSnap } from "./analyze";
import { scores, readiness, compare, priorityOf, categoriesFor } from "./score";
import { csv, html, resultRows } from "./report";
import { DEFAULT_SETTINGS, normalizeSettings } from "./types";

const files = [
  { path: "package.json", content: JSON.stringify({ dependencies: { next: "15", react: "19", stripe: "1", "@supabase/supabase-js": "2" } }) },
  { path: "src/app/page.tsx", content: "export default function P(){return <main><h1>Handmade mugs</h1></main>}" },
  { path: "src/app/(shop)/products/page.tsx", content: "<a href=\"/products/1\">x</a>" },
  { path: "src/app/(shop)/products/[id]/page.tsx", content: "x" },
  { path: "src/app/cart/page.tsx", content: "<button className=\"x\">Remove</button>" },
  { path: "src/app/checkout/page.tsx", content: "const u = await supabase.auth.getUser(); const total = parseFloat(price) * 1.2;" },
  { path: "src/app/api/orders/route.ts", content: "export async function GET(){ const { data } = await supabase.auth.getUser() } export async function POST(){}" },
  { path: "src/components/Bio.tsx", content: "<div dangerouslySetInnerHTML={{ __html: user.bio }} />" },
  { path: "supabase/migrations/1.sql", content: "create table public.orders (id uuid primary key); create table public.items (name text);\nalter table public.orders enable row level security;" },
];

test("discovery: routes, groups, dynamic segments, auth, type and journeys", () => {
  const routes = findRoutes(files);
  assert.deepEqual(routes.map((r) => r.path), ["/", "/api/orders", "/cart", "/checkout", "/products", "/products/[id]"]);
  assert.deepEqual(routes.find((r) => r.path === "/api/orders")!.methods, ["GET", "POST"]);
  assert.equal(routes.find((r) => r.path === "/checkout")!.auth, "protected");
  assert.equal(matchRoute(routes, "/products/42")!.path, "/products/[id]");
  assert.equal(matchRoute(routes, "/nope"), undefined);
  const p = discover(files, { backend: "supabase", description: "An online shop for mugs" });
  assert.equal(p.appType, "ecommerce");
  assert.ok(p.payments && p.integrations.includes("Stripe payments"));
  assert.deepEqual(p.tables, ["orders", "items"]);
  assert.ok(p.journeys.some((j) => j.key === "shop"));
  assert.ok(p.unknowns.length > 0, "business rules are flagged, not assumed");
  assert.equal(classify([{ path: "/api/x", file: "x", kind: "api", dynamic: false }], [], "").type, "api");
});

const page = (path: string, html: string, extra: Partial<PageSnap> = {}): PageSnap => ({ path, url: `http://127.0.0.1:3000${path}`, status: 200, ms: 120, bytes: html.length, headers: {}, html, ...extra });
const HOME = `<html lang="en"><head><title>Clay</title><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Handmade stoneware mugs and bowls, made in small batches and posted to your door."></head><body><nav><a href="/products">Shop</a><a href="/missing">Old</a><a href="#">Soon</a></nav><main><h1>Handmade mugs for everyday</h1><img src="/a.png"><a href="/products" class="btn">Shop now</a><form><label for="e">Email</label><input id="e" name="email" type="email" autocomplete="email"><input name="phone"></form></main><footer><a href="/privacy">Privacy</a><a href="/contact">Contact</a></footer></body></html>`;

test("html reader: links, labels, forms, headings", () => {
  const d = parse(HOME);
  assert.equal(d.lang, "en");
  assert.equal(d.headings[0]!.text, "Handmade mugs for everyday");
  assert.equal(d.inputs.filter((i) => !i.labelled).length, 1);
  assert.equal(d.forms[0]!.fields, 2);
  assert.equal(d.forms[0]!.hasSubmit, false);
  assert.deepEqual(internalPaths(d, "http://127.0.0.1:3000/").sort(), ["/contact", "/missing", "/privacy", "/products"]);
});

test("functional: dead links, placeholder links, missing submit, 5xx and 404 handling", () => {
  const routes = findRoutes(files);
  const pages = [page("/", HOME), page("/products", "<html><body><a href='/products/1'>Mug</a></body></html>"), page("/cart", "<p>boom</p>", { status: 500 })];
  const rs = functionalLive(pages, routes, page("/zz", "<a href='/'>Home</a>", { status: 200 }));
  const by = (k: string) => rs.find((r) => r.key === k)!;
  assert.equal(by("deadlink:/missing").status, "failed");
  assert.ok(!rs.some((r) => r.key === "deadlink:/products/1"), "dynamic routes match");
  assert.equal(by("placeholder-links:/").status, "failed");
  assert.equal(by("page:/cart").status, "failed");
  assert.equal(by("page:/cart").issue!.severity, "high");
  assert.equal(by("errors:404-status").status, "failed", "a missing page answered 200");
  assert.equal(by("errors:404-recovery").status, "passed");
  assert.ok(rs.some((r) => r.key.startsWith("form-submit:/")));
  assert.match(by("deadlink:/missing").issue!.fingerprint, /^[0-9a-f]{16}$/);
});

test("accessibility: real failures, manual-review items are not passed", () => {
  const rs = accessibility([page("/", HOME)]);
  assert.equal(rs.find((r) => r.key === "a11y:img-alt:/")!.status, "failed");
  assert.equal(rs.find((r) => r.key === "a11y:labels:/")!.status, "failed");
  assert.equal(rs.find((r) => r.key === "a11y:lang:/")!.status, "passed");
  const contrast = rs.find((r) => r.key === "a11y-manual:contrast")!;
  assert.equal(contrast.status, "not_run");
});

test("security: headers, protected endpoints, malformed input", () => {
  const routes = findRoutes(files);
  const rs = securityLive([page("/", HOME, { headers: { "x-powered-by": "Next.js", "set-cookie": "sid=1; Path=/" } })], [
    { path: "/api/orders", method: "GET", variant: "plain", status: 200, ms: 40, headers: {}, body: '[{"id":1,"email":"a@b.c"}]' },
    { path: "/api/orders", method: "POST", variant: "malformed", status: 500, ms: 30, headers: {}, body: "SyntaxError at JSON.parse (<anonymous>:1:2)\n    at handler (/app/route.ts:3:9)" },
  ], routes, false);
  const by = (k: string) => rs.find((r) => r.key === k)!;
  assert.equal(by("sec-header:csp").status, "failed");
  assert.equal(by("sec-header:powered-by").status, "failed");
  assert.equal(by("sec-header:cookies").status, "failed");
  assert.equal(by("sec-header:hsts").status, "not_run", "HSTS can't be judged over http");
  assert.equal(by("api-auth:GET /api/orders").status, "failed");
  assert.equal(by("api-auth:GET /api/orders").issue!.confidence, "probable");
  assert.equal(by("api-validate:POST /api/orders").issue!.rule, "api-error-leak");
});

test("static code: XSS sink, money floats, RLS, error boundary", () => {
  const p = discover(files, { backend: "supabase" });
  const rs = staticCode(files, p);
  const by = (k: string) => rs.find((r) => r.key === k)!;
  assert.equal(by("static:dangerous-html").status, "failed");
  assert.equal(by("static:money-float").issue!.confidence, "needs_manual");
  assert.equal(by("db:rls").status, "failed");
  assert.match(by("db:rls").actual, /items/);
  assert.equal(by("db:pk").status, "failed");
  assert.equal(by("static:error-boundary").status, "failed");
  assert.equal(by("static:button-noop").status, "failed");
  assert.equal(by("static:eval").status, "passed");
});

test("ux, journeys, performance, load, responsive, checks", () => {
  const p = discover(files, { description: "shop" });
  const pages = [page("/", HOME), page("/products", "<html><body><a href='/products/1'>Mug</a><a href='/cart'>Cart</a></body></html>"), page("/cart", "<a href='/checkout'>Checkout</a>"), page("/checkout", "", { finalPath: "/sign-in" })];
  const u = ux(pages, p);
  assert.equal(u.find((r) => r.key === "ftue:purpose")!.status, "passed");
  assert.equal(u.find((r) => r.key === "trust:terms")!.status, "failed");
  assert.equal(u.find((r) => r.key === "form-ux:/:0")!.status, "failed");
  const j = journeys(p, pages);
  const shop = j.outcomes.find((o) => o.key === "shop")!;
  assert.equal(shop.status, "failed", "no order confirmation page exists");
  assert.ok(shop.steps.some((s) => s.status === "needs_sign_in"));
  const perf = performance([page("/", HOME, { ms: 2600 })], [{ url: "/a.js", kind: "script", bytes: 900_000, ms: 10, status: 200 }]);
  assert.equal(perf.find((r) => r.key === "perf-ttfb:/")!.issue!.severity, "high");
  assert.equal(perf.find((r) => r.key === "perf-vitals")!.status, "not_run");
  assert.equal(load(null)[0]!.status, "not_run");
  assert.equal(load({ target: "/", concurrency: 5, seconds: 5, requests: 100, errors: 20, p50: 10, p95: 20, p99: 30, rps: 20 })[0]!.status, "failed");
  const resp = responsive(pages, { available: false, reason: "no browser", pages: [] });
  assert.equal(resp.find((r) => r.key === "resp:browser")!.status, "blocked");
  assert.equal(resp.find((r) => r.key === "browser:engines")!.status, "blocked");
  const bp = (o: Partial<import("./analyze").BrowserPage>) => ({ path: "/", viewport: 1280, ok: true, status: 200, overflowX: 0, consoleErrors: [], smallTargets: 0, focusMissing: 0, focusChecked: 3, loadMs: 100, lcp: null, cls: null, ...o });
  const errPage = responsive(pages, { available: true, pages: [bp({ ok: false, status: 500, focusMissing: null })] });
  assert.equal(errPage.find((r) => r.key === "resp:overflow:/:1280")!.status, "blocked", "an error page's layout is never a pass");
  assert.equal(errPage.find((r) => r.key === "a11y-b:focus:/:1280")!.status, "blocked");
  assert.match(errPage.find((r) => r.key === "browser:load:/:1280")!.actual, /HTTP 500/);
  const nothing = responsive(pages, { available: true, pages: [bp({ focusChecked: 0 })] });
  assert.equal(nothing.find((r) => r.key === "a11y-b:focus:/:1280")!.status, "skipped", "no focusable elements isn't a pass");
  const ch = fromChecks([{ kind: "build", status: "failed", exit_code: 1, summary: {}, output: "err", finished_at: null }, { kind: "tests", status: "error", exit_code: null, summary: { error: "no sandbox" }, output: null, finished_at: null }]);
  assert.equal(ch[0]!.issue!.severity, "critical");
  assert.equal(ch[1]!.status, "blocked", "a check that couldn't run is never a pass");
});

test("scores: only executed checks count; coverage is explicit", () => {
  const p = discover(files);
  const rs = [...accessibility([page("/", HOME)]), ...load(null)];
  const s = scores(rs, p.appType);
  const a11y = s.areas.find((a) => a.key === "accessibility")!;
  assert.ok(a11y.value !== null && a11y.value < 100);
  assert.equal(s.areas.find((a) => a.key === "performance")!.value, null);
  assert.equal(s.areas.find((a) => a.key === "performance")!.basis, "unavailable");
  assert.ok(s.coverage < 100);
  assert.equal(s.overall.basis, "incomplete");
  assert.equal(scores([], "unknown").overall.value, null);
});

test("readiness: blockers, required categories, approval", () => {
  const settings = DEFAULT_SETTINGS;
  assert.equal(readiness({ runStatus: "none", results: [], issues: [], settings, overall: null }).status, "not_tested");
  const pass = (category: "functional" | "security" | "accessibility") => ({ key: category, name: category, category, method: "automated" as const, objective: "", steps: [], expected: "", actual: "", status: "passed" as const, severity: "info" as const, evidence: [] });
  const base = [pass("functional"), pass("security"), pass("accessibility")];
  assert.equal(readiness({ runStatus: "completed", results: base, issues: [], settings, overall: 90 }).status, "ready");
  assert.equal(readiness({ runStatus: "completed", results: base, issues: [{ title: "RLS", severity: "critical", status: "new", category: "database" }], settings, overall: 90 }).status, "critical");
  assert.equal(readiness({ runStatus: "completed", results: base, issues: [{ title: "RLS", severity: "critical", status: "accepted_risk", category: "database" }], settings, overall: 90 }).status, "ready");
  assert.equal(readiness({ runStatus: "completed", results: base, issues: [{ title: "RLS", severity: "critical", status: "accepted_risk", category: "database", accepted_expires: "2020-01-01" }], settings, overall: 90 }).status, "critical", "expired acceptance blocks again");
  assert.equal(readiness({ runStatus: "completed", results: [base[0]!], issues: [], settings, overall: 90 }).status, "needs_review");
  assert.equal(readiness({ runStatus: "completed", results: base, issues: [{ title: "x", severity: "high", status: "new", category: "ux" }], settings, overall: 90 }).status, "conditional");
  assert.equal(readiness({ runStatus: "completed", results: base, issues: [], settings, overall: 90, approved: { by: "Sam", at: "2026-11-20T10:00:00Z" } }).status, "approved");
  const broken = [...base, { ...pass("functional"), key: "page:/", status: "failed" as const, name: "Home", actual: "500" }];
  assert.equal(readiness({ runStatus: "completed", results: broken, issues: [], settings, overall: 90 }).status, "failed");
});

test("compare, priority, modes, settings, reports", () => {
  const r = (key: string, status: "passed" | "failed") => ({ key, name: key, category: "functional" as const, method: "automated" as const, objective: "", steps: [], expected: "", actual: "", status, severity: "medium" as const, evidence: [] });
  const c = compare([r("a", "passed"), r("b", "failed"), r("c", "failed"), r("d", "passed")], [r("a", "failed"), r("b", "passed"), r("c", "failed"), r("e", "failed")], 80, 70);
  assert.deepEqual([c.newFailures.map((x) => x.key), c.fixed.map((x) => x.key), c.stillFailing.map((x) => x.key), c.removed, c.scoreDelta], [["a", "e"], ["b"], ["c"], ["d"], -10]);
  assert.equal(priorityOf("critical", "confirmed"), "P0");
  assert.equal(priorityOf("critical", "potential"), "P1");
  assert.equal(priorityOf("medium", "confirmed", true), "P1");
  assert.ok(categoriesFor("full").length >= 20);
  assert.ok(categoriesFor("quick").includes("functional"));
  const s = normalizeSettings({ load: { enabled: true, concurrency: 5000, seconds: 9999 }, gate: { blockingSeverities: ["high", "bogus"], minOverall: 300 }, viewports: [100, 375] });
  assert.deepEqual([s.load.concurrency, s.load.seconds, s.gate.blockingSeverities, s.gate.minOverall, s.viewports], [50, 120, ["high"], 100, [375]]);
  const rows = resultRows([r("x,1", "failed")]);
  assert.match(csv(rows), /"x,1"/);
  const h = html("full", { id: "abcdef12", mode: "quick", status: "completed", created_at: "2026-11-20T10:00:00Z", finished_at: null, commit: null, project: "<Shop>", overall: 70, coverage: 50, release: "needs_review", reasons: ["x"], areas: [] }, [r("y", "passed")], []);
  assert.ok(h.includes("&lt;Shop&gt;") && !h.includes("<Shop>"));
  assert.equal(hashHex("a"), hashHex("a"));
  assert.notEqual(hashHex("a"), hashHex("b"));
});

test("personas: walks must follow real links and are labelled simulated", async () => {
  const { siteMap, evaluateWalk, parseWalk, DEFAULT_PERSONAS } = await import("./personas");
  const pages = [page("/", "<a href='/menu'>Menu</a>"), page("/menu", "<a href='/book'>Book</a>"), page("/book", "<form><input name=a></form>")];
  const map = siteMap(pages);
  const p = DEFAULT_PERSONAS[0]!;
  const ok = evaluateWalk(p, parseWalk('{"path":["/","/menu","/book"],"completed":true,"confusion":[],"friction":[],"summary":"Easy"}'), map);
  assert.equal(ok.status, "passed");
  assert.equal(ok.method, "simulated");
  const invented = evaluateWalk(p, parseWalk('{"path":["/","/book"],"completed":true,"friction":[]}'), map);
  assert.equal(invented.status, "blocked", "jumps along links that don't exist don't count");
  const gaveUp = evaluateWalk(p, parseWalk('```json {"path":["/","/menu"],"completed":false,"friction":["No price shown"],"summary":"Gave up"} ```'), map);
  assert.equal(gaveUp.status, "failed");
  assert.match(gaveUp.issue!.description, /AI-simulated/);
  assert.equal(evaluateWalk(p, parseWalk("nonsense"), map).status, "blocked");
});

test("pentest needs authorisation; business rules become questions", async () => {
  const { pentest, businessRules } = await import("./analyze");
  assert.equal(pentest(null, null)[0]!.status, "blocked");
  const r = pentest({ reflections: [{ path: "/search", status: 200, reflectedRaw: true, reflectedEscaped: false }], redirects: [{ path: "/login", param: "next", status: 307, location: "https://keelwork-qa.invalid/x", external: true }] }, { scope: "sandbox" });
  assert.equal(r.filter((x) => x.status === "failed").length, 2);
  const rules = businessRules(discover(files, { description: "shop" }));
  assert.ok(rules.length && rules.every((x) => x.status === "not_run"));
});

test("hashHex: always 16 lowercase hex characters (issue fingerprints)", async () => {
  const { hashHex } = await import("./analyze");
  for (let i = 0; i < 5000; i++) assert.match(hashHex(`security|header-${i}|/${i % 7}`), /^[0-9a-f]{16}$/);
  for (const s of ["security|check-audit|", "security|header-xcto|/", "security|header-referrer|/"]) assert.match(hashHex(s), /^[0-9a-f]{16}$/);
});

test("performance: bundle size comes from the production build, never the dev server", async () => {
  const { parseFirstLoadJs, performance } = await import("./analyze");
  const out = ["Route (app)                                 Size  First Load JS", "┌ ○ /                                      123 B         102 kB", "├ ○ /_not-found                            995 B         103 kB", "├ ƒ /dashboard                            90 kB          410 kB", "└ ƒ /api/health                            123 B         102 kB", "+ First Load JS shared by all             102 kB"].join("\n");
  assert.deepEqual(parseFirstLoadJs(out).map((r) => r.route), ["/", "/_not-found", "/dashboard", "/api/health"]);
  const devAssets = [{ url: "/_next/static/chunks/main.js", kind: "script" as const, bytes: 3_000_000, ms: 5, status: 200 }];
  const dev = performance([], devAssets).find((r) => r.key === "perf-js")!;
  assert.equal(dev.status, "not_run", "a dev-server bundle is never judged");
  const prod = performance([], devAssets, undefined, { buildOutput: out }).find((r) => r.key === "perf-js")!;
  assert.equal(prod.status, "failed");
  assert.match(prod.actual, /\/dashboard at 410 KB/);
  assert.equal(performance([], devAssets, undefined, { buildOutput: out.replace("410 kB", "200 kB") }).find((r) => r.key === "perf-js")!.status, "passed");
});
