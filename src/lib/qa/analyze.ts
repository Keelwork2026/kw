import type { Category, Confidence, Evidence, Finding, Method, Profile, Result, Route, Severity, Status } from "./types";
import { ACTION_WORDS, GENERIC_LINK_TEXT, internalPaths, parse } from "./html";
import { matchRoute, type SourceFile } from "./discover";

/**
 * Turns what the engine observed — fetched pages, endpoint responses, asset
 * sizes, load measurements, browser measurements and source files — into
 * results and findings. Nothing here runs anything: it only judges evidence
 * it is given, so a missing observation becomes "not run", never "passed".
 */

export type PageSnap = { path: string; url: string; status: number | null; ms: number | null; bytes: number; headers: Record<string, string>; html: string; finalPath?: string; error?: string };
export type ApiSnap = { path: string; method: string; variant: "plain" | "malformed"; status: number | null; ms: number | null; headers: Record<string, string>; body: string; error?: string };
export type AssetSnap = { url: string; kind: "script" | "style" | "image"; bytes: number | null; ms: number | null; status: number | null };
export type LoadSnap = { target: string; concurrency: number; seconds: number; requests: number; errors: number; p50: number; p95: number; p99: number; rps: number };
export type BrowserPage = { path: string; viewport: number; ok: boolean; status?: number | null; focusChecked?: number; overflowX: number; consoleErrors: string[]; smallTargets: number; focusMissing: number | null; loadMs: number | null; lcp: number | null; cls: number | null; screenshot?: string };
export type BrowserSnap = { available: boolean; reason?: string; engine?: string; pages: BrowserPage[] };

export function hashHex(s: string): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ s.length;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193) >>> 0; b = Math.imul(b ^ c, 0x5bd1e995) >>> 0; b = (b ^ (b >>> 13)) >>> 0; }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

type Mk = { key: string; name: string; category: Category; method: Method; objective: string; steps?: string[]; expected: string; actual: string; status: Status; severity?: Severity; target?: string; evidence?: Evidence[]; durationMs?: number; finding?: Omit<Finding, "fingerprint" | "category" | "evidence" | "target" | "title"> & { title?: string } };
export function mk(o: Mk): Result {
  const severity = o.severity ?? "medium";
  const r: Result = { key: o.key, name: o.name, category: o.category, method: o.method, objective: o.objective, steps: o.steps ?? [], expected: o.expected, actual: o.actual, status: o.status, severity, target: o.target, evidence: (o.evidence ?? []).slice(0, 12), durationMs: o.durationMs };
  if (o.finding && (o.status === "failed")) {
    r.issue = { fingerprint: hashHex(`${o.category}|${o.finding.rule}|${o.target ?? ""}`), title: o.finding.title ?? o.name, category: o.category, target: o.target, evidence: r.evidence, ...o.finding, severity: o.finding.severity ?? severity };
  }
  return r;
}
const F = (rule: string, severity: Severity, confidence: Confidence, description: string, impact: string, recommendation: string, verify: string, extra: { title?: string; wcag?: string } = {}) => ({ rule, severity, confidence, description, impact, recommendation, verify, ...extra });
const snip = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n)}…` : s);

/* ------------------------------------------------------------------ */
/* Functional (live)                                                   */
/* ------------------------------------------------------------------ */

export function functionalLive(pages: PageSnap[], routes: Route[], notFound?: PageSnap): Result[] {
  const out: Result[] = [];
  const byPath = new Map(pages.map((p) => [p.path, p]));
  for (const p of pages) {
    const ev: Evidence[] = [{ kind: "http", method: "GET", url: p.path, status: p.status, ms: p.ms ?? undefined }];
    const route = matchRoute(routes, p.path);
    const signInRedirect = p.finalPath && /sign-?in|login/.test(p.finalPath) && p.finalPath !== p.path;
    if (p.status === null) {
      out.push(mk({ key: `page:${p.path}`, name: `Page loads: ${p.path}`, category: "functional", method: "automated", objective: "The page responds.", steps: [`GET ${p.path}`], expected: "A response from the app", actual: `No response (${p.error ?? "connection failed"})`, status: "failed", severity: "high", target: p.path, evidence: ev,
        finding: F("page-unreachable", "high", "confirmed", `Requesting ${p.path} got no response.`, "People can't open this page.", "Check the server logs for this route and make sure the page renders without throwing.", "Reload the page and run Quick QA again.") }));
    } else if (p.status >= 500) {
      out.push(mk({ key: `page:${p.path}`, name: `Page loads: ${p.path}`, category: "functional", method: "automated", objective: "The page renders without a server error.", steps: [`GET ${p.path}`], expected: "200 OK", actual: `${p.status} server error`, status: "failed", severity: p.path === "/" ? "critical" : "high", target: p.path, evidence: [...ev, { kind: "html", page: p.path, snippet: snip(parse(p.html).bodyText, 300) }],
        finding: F("page-5xx", p.path === "/" ? "critical" : "high", "confirmed", `${p.path} returns a ${p.status} server error.`, p.path === "/" ? "Nobody can use the app: the home page fails." : "People who open this page see an error.", "Open the page in the preview, read the error, and fix the code that throws while rendering.", "Run Quick QA and confirm the page returns 200.") }));
    } else if (p.status === 404 && route && !route.dynamic) {
      out.push(mk({ key: `page:${p.path}`, name: `Page loads: ${p.path}`, category: "functional", method: "automated", objective: "A page defined in the code is reachable.", steps: [`GET ${p.path}`], expected: "200 OK", actual: "404 Not Found", status: "failed", severity: "high", target: p.path, evidence: [...ev, { kind: "code", file: route.file }],
        finding: F("route-404", "high", "confirmed", `${route.file} defines ${p.path}, but requesting it returns 404.`, "A page you built can't be opened.", "Check that the page component calls notFound() only for missing records, and that the route folder name is correct.", "Request the page again after the fix.") }));
    } else {
      out.push(mk({ key: `page:${p.path}`, name: `Page loads: ${p.path}`, category: "functional", method: "automated", objective: "The page responds successfully.", steps: [`GET ${p.path}`], expected: "2xx, or a redirect to sign-in for protected pages", actual: signInRedirect ? `Redirected to ${p.finalPath} (sign-in required)` : `${p.status} in ${p.ms ?? "?"} ms`, status: "passed", severity: "info", target: p.path, evidence: ev }));
    }
  }
  // Dead links: internal links whose target was crawled and failed, or matches no route.
  const dead = new Map<string, Set<string>>();
  const placeholders = new Map<string, string[]>();
  for (const p of pages) {
    if (!p.html || (p.status ?? 0) >= 400) continue;
    const doc = parse(p.html);
    for (const target of internalPaths(doc, p.url)) {
      const path = target.split("?")[0]!;
      const crawled = byPath.get(path);
      const exists = crawled ? (crawled.status ?? 0) < 400 : !!matchRoute(routes, path) || /\.(png|jpe?g|svg|webp|ico|pdf|txt|xml|css|js)$/.test(path) || path.startsWith("/api/");
      if (!exists) dead.set(path, (dead.get(path) ?? new Set()).add(p.path));
    }
    const ph = doc.links.filter((l) => /^(#|javascript:)/i.test(l.href.trim()) && l.href.trim().length <= 1 + (l.href.startsWith("javascript") ? 30 : 0) && !l.attrs.role && !l.attrs["aria-controls"]).map((l) => l.text || "(no text)");
    if (ph.length) placeholders.set(p.path, ph);
  }
  for (const [path, from] of dead) {
    out.push(mk({ key: `deadlink:${path}`, name: `Link target exists: ${path}`, category: "functional", method: "automated", objective: "Every internal link leads to a real page.", steps: [`Collect links on ${[...from].slice(0, 3).join(", ")}`, `Request ${path}`], expected: "The linked page exists", actual: byPath.get(path) ? `${byPath.get(path)!.status} response` : "No page or route matches this address", status: "failed", severity: "medium", target: path, evidence: [...from].slice(0, 5).map((f) => ({ kind: "html" as const, page: f, snippet: `links to ${path}` })),
      finding: F("dead-link", "medium", "confirmed", `Links on ${[...from].slice(0, 3).join(", ")} point to ${path}, which doesn't exist.`, "People who click the link reach a dead end.", "Point the link at an existing page, or create the page it promises.", "Run the functional suite and confirm no dead links remain.", { title: `Dead link to ${path}` }) }));
  }
  if (!dead.size && pages.length) out.push(mk({ key: "deadlinks:none", name: "No dead internal links", category: "functional", method: "automated", objective: "Every internal link leads to a real page.", expected: "No dead links", actual: `Checked links on ${pages.length} pages`, status: "passed", severity: "info" }));
  for (const [path, labels] of placeholders) {
    out.push(mk({ key: `placeholder-links:${path}`, name: `Links do something: ${path}`, category: "functional", method: "static", objective: "Controls that look clickable lead somewhere.", expected: "Real destinations", actual: `${labels.length} link(s) go to “#”: ${labels.slice(0, 5).join(", ")}`, status: "failed", severity: "low", target: path,
      finding: F("placeholder-link", "low", "probable", `${labels.length} link(s) on ${path} point to “#”, which usually means a destination was never filled in.`, "Clicking them does nothing or jumps to the top of the page.", "Give each link a real destination, or make it a button that performs an action.", "Click each link in the preview.", { title: `Placeholder links on ${path}` }) }));
  }
  // Forms that can't be submitted.
  for (const p of pages) {
    if (!p.html || (p.status ?? 0) >= 400) continue;
    parse(p.html).forms.forEach((f, i) => {
      if (f.fields > 0 && !f.hasSubmit) out.push(mk({ key: `form-submit:${p.path}:${i}`, name: `Form can be submitted: ${p.path} #${i + 1}`, category: "functional", method: "static", objective: "Every form has a way to submit.", expected: "A submit button", actual: `${f.fields} field(s) and no submit button in the rendered form`, status: "failed", severity: "medium", target: p.path,
        finding: F("form-no-submit", "medium", "probable", `A form on ${p.path} has ${f.fields} field(s) but no submit button in the rendered page.`, "People may fill it in and have no way to send it (keyboard users especially).", "Add a <button type=\"submit\"> inside the form.", "Submit the form with the keyboard (Enter) and with the button.") }));
    });
  }
  if (notFound) {
    const doc = notFound.html ? parse(notFound.html) : null;
    const ok = notFound.status === 404;
    const helpful = !!doc && doc.links.some((l) => l.href === "/" || /home|back/i.test(l.text));
    out.push(mk({ key: "errors:404-status", name: "Unknown pages return 404", category: "errors", method: "automated", objective: "Missing pages are reported as missing, not as success or a crash.", steps: [`GET ${notFound.path}`], expected: "404", actual: String(notFound.status ?? "no response"), status: ok ? "passed" : "failed", severity: notFound.status && notFound.status >= 500 ? "high" : "medium", target: notFound.path, evidence: [{ kind: "http", method: "GET", url: notFound.path, status: notFound.status }],
      finding: F("404-status", "medium", "confirmed", `A request for a page that doesn't exist returned ${notFound.status}.`, "Search engines index error pages and people get no clear explanation.", "Add a not-found page and make unknown routes return 404.", "Request a random address and check the status.") }));
    out.push(mk({ key: "errors:404-recovery", name: "Not-found page offers a way back", category: "errors", method: "automated", objective: "People who reach a missing page can recover.", steps: [`GET ${notFound.path}`, "Look for a link home or back in the returned page"], expected: "A link home or to search", actual: helpful ? "Has a link back" : "No link home or back found", status: helpful ? "passed" : "failed", severity: "low", target: notFound.path,
      finding: F("404-dead-end", "low", "probable", "The not-found page has no link home or back.", "People who follow an old link hit a dead end.", "Add a clear message and a link to the home page (and search, if you have it).", "Open a missing address and use the link.") }));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Accessibility (rendered HTML)                                       */
/* ------------------------------------------------------------------ */

export function accessibility(pages: PageSnap[]): Result[] {
  const out: Result[] = [];
  const ok = pages.filter((p) => p.html && (p.status ?? 0) < 400);
  for (const p of ok) {
    const d = parse(p.html);
    const t = p.path;
    const check = (rule: string, name: string, wcag: string, pass: boolean, actual: string, severity: Severity, recommendation: string, evidence: Evidence[] = []) =>
      out.push(mk({ key: `a11y:${rule}:${t}`, name: `${name} (${t})`, category: "accessibility", method: "static", objective: `WCAG ${wcag}`, expected: name, actual, status: pass ? "passed" : "failed", severity, target: t, evidence,
        finding: F(rule, severity, "confirmed", `${name}: ${actual} on ${t}.`, "People using screen readers, keyboards or zoom may be unable to use this page.", recommendation, "Run the accessibility suite again; also check with a screen reader.", { title: `${name} — ${t}`, wcag }) }));
    check("lang", "Page language is set", "3.1.1", !!d.lang, d.lang ? `lang="${d.lang}"` : "No lang attribute on <html>", "medium", "Add lang=\"en\" (or the page's language) to the <html> element.");
    check("title", "Page has a title", "2.4.2", d.title.trim().length > 0, d.title ? `“${snip(d.title, 60)}”` : "Empty <title>", "medium", "Give every page a unique, descriptive <title>.");
    const noAlt = d.images.filter((i) => i.alt === undefined && i.role !== "presentation" && i["aria-hidden"] !== "true");
    check("img-alt", "Images have text alternatives", "1.1.1", noAlt.length === 0, noAlt.length ? `${noAlt.length} of ${d.images.length} image(s) have no alt attribute` : `${d.images.length} image(s) checked`, "high", "Add alt text that describes each meaningful image, or alt=\"\" for decorative ones.", noAlt.slice(0, 5).map((i) => ({ kind: "html" as const, page: t, snippet: `<img src="${snip(i.src ?? "", 80)}">` })));
    const unlabelled = d.inputs.filter((i) => !i.labelled && !["submit", "button", "reset"].includes(i.attrs.type ?? ""));
    check("labels", "Form fields have labels", "1.3.1 / 4.1.2", unlabelled.length === 0, unlabelled.length ? `${unlabelled.length} of ${d.inputs.length} field(s) have no label` : `${d.inputs.length} field(s) checked`, "high", "Give every field a visible <label for=…> (placeholders are not labels).", unlabelled.slice(0, 5).map((i) => ({ kind: "html" as const, page: t, snippet: `<${i.tag} name="${i.attrs.name ?? ""}" placeholder="${snip(i.attrs.placeholder ?? "", 40)}">` })));
    const nameless = d.buttons.filter((b) => !b.text.trim());
    check("button-name", "Buttons have accessible names", "4.1.2", nameless.length === 0, nameless.length ? `${nameless.length} button(s) with no text or label` : `${d.buttons.length} button(s) checked`, "high", "Add visible text or an aria-label to icon-only buttons.");
    const emptyLinks = d.links.filter((l) => !l.text.trim());
    check("link-name", "Links have accessible names", "2.4.4 / 4.1.2", emptyLinks.length === 0, emptyLinks.length ? `${emptyLinks.length} link(s) with no text` : `${d.links.length} link(s) checked`, "medium", "Give icon links an aria-label that says where they go.");
    const vague = d.links.filter((l) => GENERIC_LINK_TEXT.test(l.text.trim()));
    check("link-purpose", "Link text explains where it goes", "2.4.4", vague.length === 0, vague.length ? `${vague.length} link(s) say only “${vague[0]!.text}”` : "Link text is descriptive", "low", "Replace “click here” with words that describe the destination.");
    const h1 = d.headings.filter((h) => h.level === 1).length;
    let skip = "";
    for (let i = 1; i < d.headings.length; i++) if (d.headings[i]!.level - d.headings[i - 1]!.level > 1) { skip = `h${d.headings[i - 1]!.level} → h${d.headings[i]!.level}`; break; }
    check("headings", "Headings form an outline", "1.3.1 / 2.4.6", h1 === 1 && !skip, h1 !== 1 ? `${h1} <h1> element(s)` : skip ? `Heading level skipped (${skip})` : "One h1, no skipped levels", "low", "Use exactly one h1 per page and don't skip heading levels.");
    check("landmarks", "Main content is marked up", "1.3.1 / 2.4.1", d.landmarks.has("main"), d.landmarks.has("main") ? "Has <main>" : "No <main> landmark", "low", "Wrap the page's main content in <main> so assistive tech can jump to it.");
    const zoomBlocked = !!d.viewport && (/user-scalable\s*=\s*(no|0)/i.test(d.viewport) || /maximum-scale\s*=\s*1(\.0)?\b/i.test(d.viewport));
    check("zoom", "Page can be zoomed", "1.4.4", !zoomBlocked, zoomBlocked ? `viewport: ${d.viewport}` : "Zoom allowed", "high", "Remove user-scalable=no and maximum-scale=1 from the viewport meta tag.");
    const untitled = d.iframes.filter((f) => !f.title);
    if (d.iframes.length) check("frame-title", "Embedded frames have titles", "4.1.2", untitled.length === 0, untitled.length ? `${untitled.length} iframe(s) without a title` : "All frames titled", "medium", "Add a title attribute to each iframe.");
    const tabjump = d.inputs.map((i) => i.attrs).concat(d.links.map((l) => l.attrs), d.buttons.map((b) => b.attrs)).filter((a) => Number(a.tabindex) > 0);
    check("tabindex", "Focus order follows the page", "2.4.3", tabjump.length === 0, tabjump.length ? `${tabjump.length} element(s) with tabindex > 0` : "No positive tabindex", "medium", "Remove positive tabindex values; order elements in the markup instead.");
  }
  if (ok.length) {
    for (const [rule, name, wcag] of [["contrast", "Text colour contrast", "1.4.3"], ["focus-visible", "Keyboard focus is visible", "2.4.7"], ["keyboard", "Everything works with a keyboard, without traps", "2.1.1 / 2.1.2"], ["reflow", "Content reflows at 320 px without loss", "1.4.10"]] as const) {
      out.push(mk({ key: `a11y-manual:${rule}`, name, category: "accessibility", method: "static", objective: `WCAG ${wcag}`, expected: name, actual: "Can't be decided from HTML alone. The browser suite checks this when a browser runtime is available; otherwise it needs manual review.", status: "not_run", severity: "info" }));
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Security (live responses)                                           */
/* ------------------------------------------------------------------ */

export function securityLive(pages: PageSnap[], apis: ApiSnap[], routes: Route[], https: boolean): Result[] {
  const out: Result[] = [];
  const first = pages.find((p) => p.status && p.status < 400);
  if (first) {
    const h = first.headers;
    const header = (rule: string, name: string, present: boolean, severity: Severity, recommendation: string, actual: string) =>
      out.push(mk({ key: `sec-header:${rule}`, name, category: "security", method: "automated", objective: "Responses carry protective security headers.", steps: [`GET ${first.path}`, "Read the response headers"], expected: name, actual, status: present ? "passed" : "failed", severity, target: first.path, evidence: [{ kind: "http", method: "GET", url: first.path, status: first.status, headers: Object.fromEntries(Object.entries(h).filter(([k]) => /content-security|x-frame|x-content|referrer|permissions|strict-transport|x-powered|server|set-cookie/.test(k)).map(([k, v]) => [k, snip(v, 200)])) }],
        finding: F(`header-${rule}`, severity, "confirmed", `${name}: ${actual}.`, "Without it, some attacks (clickjacking, content sniffing, data leakage through referrers) are easier.", recommendation, "Check the response headers again after deploying the fix.", { title: `Missing: ${name}` }) }));
    header("csp", "Content-Security-Policy is set", !!h["content-security-policy"], "medium", "Send a Content-Security-Policy that restricts scripts to your own origin (use nonces for inline scripts).", h["content-security-policy"] ? "Present" : "Not sent");
    header("xcto", "X-Content-Type-Options: nosniff", (h["x-content-type-options"] ?? "").toLowerCase() === "nosniff", "low", "Send X-Content-Type-Options: nosniff on every response.", h["x-content-type-options"] ?? "Not sent");
    header("framing", "Framing is restricted", !!h["x-frame-options"] || /frame-ancestors/.test(h["content-security-policy"] ?? ""), "medium", "Send frame-ancestors 'none' (or 'self') in the CSP, or X-Frame-Options: DENY.", h["x-frame-options"] ?? (/frame-ancestors/.test(h["content-security-policy"] ?? "") ? "CSP frame-ancestors" : "Not restricted"));
    header("referrer", "Referrer-Policy is set", !!h["referrer-policy"], "low", "Send Referrer-Policy: strict-origin-when-cross-origin.", h["referrer-policy"] ?? "Not sent");
    if (https) header("hsts", "Strict-Transport-Security is set", !!h["strict-transport-security"], "medium", "Send Strict-Transport-Security with a long max-age.", h["strict-transport-security"] ?? "Not sent");
    else out.push(mk({ key: "sec-header:hsts", name: "Strict-Transport-Security is set", category: "security", method: "automated", objective: "HTTPS is enforced.", expected: "HSTS on HTTPS", actual: "The sandbox serves plain HTTP, so HSTS can only be checked on the deployed site.", status: "not_run", severity: "info" }));
    const powered = h["x-powered-by"];
    header("powered-by", "Server technology isn't advertised", !powered, "low", "Remove the X-Powered-By header (poweredByHeader: false in next.config).", powered ? `X-Powered-By: ${powered}` : "Not advertised");
    const cookies = (h["set-cookie"] ?? "").split(/,(?=\s*[^;,=\s]+=)/).filter(Boolean);
    const weak = cookies.filter((c) => !/httponly/i.test(c) || !/samesite/i.test(c));
    if (cookies.length) header("cookies", "Cookies are HttpOnly and SameSite", weak.length === 0, "medium", "Set HttpOnly and SameSite=Lax (or Strict) on session cookies, and Secure in production.", weak.length ? `${weak.length} cookie(s) missing flags: ${weak.map((c) => c.split("=")[0]).join(", ")}` : `${cookies.length} cookie(s) checked`);
  }
  // Endpoints
  const byEndpoint = new Map<string, ApiSnap[]>();
  for (const a of apis) byEndpoint.set(`${a.method} ${a.path}`, [...(byEndpoint.get(`${a.method} ${a.path}`) ?? []), a]);
  for (const [key, snaps] of byEndpoint) {
    const plain = snaps.find((s) => s.variant === "plain");
    const bad = snaps.find((s) => s.variant === "malformed");
    const route = matchRoute(routes, plain?.path ?? bad?.path ?? "");
    const ev = snaps.map((s) => ({ kind: "http" as const, method: s.method, url: s.path, status: s.status, ms: s.ms ?? undefined, body: snip(s.body, 240) }));
    if (plain && route?.auth === "protected") {
      const leaked = plain.status !== null && plain.status < 300 && plain.body.trim().length > 2 && !/^\s*(\[\]|\{\})\s*$/.test(plain.body);
      out.push(mk({ key: `api-auth:${key}`, name: `Requires sign-in: ${key}`, category: "security", method: "automated", objective: "Protected endpoints refuse anonymous requests.", steps: [`${key} with no session`], expected: "401/403 or a redirect", actual: `${plain.status} with ${plain.body.length} bytes`, status: leaked ? "failed" : "passed", severity: leaked ? "high" : "info", target: key, evidence: ev,
        finding: F("api-missing-auth", "high", "probable", `${key} checks for a signed-in user in code, but an anonymous request got ${plain.status} with data back.`, "Anyone could read or change data through this endpoint.", "Return 401 before doing any work when there is no user, and check ownership of the requested record.", "Call the endpoint without signing in and confirm it is refused.", { title: `Anonymous access to ${key}` }) }));
    }
    if (bad) {
      const crashed = bad.status !== null && bad.status >= 500;
      const leaks = /\bat\s+\S+\s+\(.*:\d+:\d+\)|Traceback|stack|ECONNREFUSED|SQLSTATE|syntax error at or near/i.test(bad.body);
      out.push(mk({ key: `api-validate:${key}`, name: `Rejects malformed input: ${key}`, category: "api", method: "automated", objective: "Bad input gets a clear 4xx, not a crash.", steps: [`${key} with an invalid JSON body`], expected: "400 or 422 with a helpful message", actual: `${bad.status ?? "no response"}${leaks ? " and an internal error message in the body" : ""}`, status: crashed || leaks ? "failed" : "passed", severity: leaks ? "medium" : crashed ? "medium" : "info", target: key, evidence: ev,
        finding: F(leaks ? "api-error-leak" : "api-unhandled-input", "medium", "confirmed", leaks ? `${key} returns internal error details when sent malformed input.` : `${key} crashes (${bad.status}) when sent malformed input.`, leaks ? "Stack traces and database errors help attackers map the system." : "Clients get a generic failure instead of a fixable message; logs fill with errors.", "Parse and validate the body (for example with zod) and return 400 with a short message; never return error stacks.", "Send invalid JSON again and check for a 400.") }));
    }
    const cors = plain?.headers["access-control-allow-origin"];
    if (cors === "*" && /true/i.test(plain?.headers["access-control-allow-credentials"] ?? ""))
      out.push(mk({ key: `api-cors:${key}`, name: `CORS is restricted: ${key}`, category: "security", method: "automated", objective: "Cross-origin access is limited.", expected: "No wildcard with credentials", actual: "Access-Control-Allow-Origin: * with credentials", status: "failed", severity: "high", target: key, evidence: ev,
        finding: F("cors-wildcard-credentials", "high", "confirmed", `${key} allows any origin with credentials.`, "Other websites could make signed-in requests on a user's behalf.", "Allow only your own origins, and never combine * with credentials.", "Check the CORS headers again.") }));
    if (plain?.ms && plain.ms > 1500) out.push(mk({ key: `api-perf:${key}`, name: `Responds quickly: ${key}`, category: "performance", method: "automated", objective: "Endpoints respond in good time.", expected: "Under 1.5 s", actual: `${plain.ms} ms`, status: "failed", severity: plain.ms > 4000 ? "high" : "medium", target: key, evidence: ev,
      finding: F("api-slow", plain.ms > 4000 ? "high" : "medium", "confirmed", `${key} took ${plain.ms} ms.`, "Slow endpoints make the app feel broken and time out under load.", "Add indexes for the queries it runs, avoid sequential awaits, and cache where safe.", "Re-run the performance suite.") }));
    else if (plain?.ms) out.push(mk({ key: `api-perf:${key}`, name: `Responds quickly: ${key}`, category: "performance", method: "automated", objective: "Endpoints respond in good time.", expected: "Under 1.5 s", actual: `${plain.ms} ms`, status: "passed", severity: "info", target: key, evidence: ev }));
    if (plain && plain.status !== null) out.push(mk({ key: `api-up:${key}`, name: `Endpoint responds: ${key}`, category: "api", method: "automated", objective: "The endpoint is reachable and doesn't crash on a plain request.", expected: "Any non-5xx status", actual: String(plain.status), status: plain.status >= 500 ? "failed" : "passed", severity: plain.status >= 500 ? "high" : "info", target: key, evidence: ev,
      finding: F("api-5xx", "high", "confirmed", `${key} returns ${plain.status} to a plain request.`, "Anything that relies on this endpoint is broken.", "Read the server log for this route and handle the failing case.", "Call the endpoint again.") }));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Performance                                                          */
/* ------------------------------------------------------------------ */

/** Reads per-route "First Load JS" sizes (KB) from `next build`'s route table. */
export function parseFirstLoadJs(output: string): { route: string; kb: number }[] {
  const out: { route: string; kb: number }[] = [];
  const unit = (v: string, u: string) => (u.toLowerCase() === "mb" ? parseFloat(v) * 1024 : u.toLowerCase() === "b" ? parseFloat(v) / 1024 : parseFloat(v));
  for (const line of output.replace(/\x1b\[[0-9;]*m/g, "").split("\n")) {
    const m = /^[\s│├└┌]*[○●ƒλ◐]\s+(\/\S*)\s+([\d.]+)\s*(B|kB|KB|MB)\s+([\d.]+)\s*(B|kB|KB|MB)\s*$/.exec(line);
    if (m) out.push({ route: m[1]!, kb: Math.round(unit(m[4]!, m[5]!)) });
  }
  return out;
}

export function performance(pages: PageSnap[], assets: AssetSnap[], browser?: BrowserSnap, opts: { buildOutput?: string } = {}): Result[] {
  const out: Result[] = [];
  for (const p of pages.filter((x) => x.status && x.status < 400 && x.ms !== null)) {
    const ms = p.ms!;
    const sev: Severity = ms > 2500 ? "high" : "medium";
    out.push(mk({ key: `perf-ttfb:${p.path}`, name: `Server responds quickly: ${p.path}`, category: "performance", method: "automated", objective: "The server returns the page quickly.", expected: "Under 800 ms (measured in the sandbox)", actual: `${ms} ms, ${Math.round(p.bytes / 1024)} KB of HTML`, status: ms <= 800 ? "passed" : "failed", severity: ms <= 800 ? "info" : sev, target: p.path, evidence: [{ kind: "measure", name: "response time", value: ms, unit: "ms", note: "Sandbox dev server; production builds are usually faster." }],
      finding: F("slow-page", sev, "confirmed", `${p.path} took ${ms} ms to respond in the sandbox.`, "Slow first responses delay everything else on the page.", "Move slow data fetching off the critical path, cache stable data, and check database queries.", "Run the performance suite again (and on the production build).") }));
    const d = parse(p.html);
    const unsized = d.images.filter((i) => !i.width && !i.height && !/fill|absolute/.test(i.style ?? "") && !(i["data-nimg"] === "fill"));
    if (d.images.length) out.push(mk({ key: `perf-cls:${p.path}`, name: `Images reserve their space: ${p.path}`, category: "performance", method: "static", objective: "Images don't shift the layout as they load.", expected: "Width and height on images", actual: unsized.length ? `${unsized.length} of ${d.images.length} image(s) without dimensions` : "All images sized", status: unsized.length ? "failed" : "passed", severity: "low", target: p.path,
      finding: F("unsized-images", "low", "probable", `${unsized.length} image(s) on ${p.path} have no width or height.`, "The page jumps as images load (layout shift), which is annoying and can cause mis-taps.", "Set width and height (or use next/image), so the browser reserves space.", "Watch the page load on a slow connection.") }));
  }
  // Bundle size is judged on the production build (from `next build`'s route
  // table), never on the sandbox's development server, whose bundles are
  // unminified and several times larger.
  const scripts = assets.filter((a) => a.kind === "script" && a.bytes !== null);
  const prod = parseFirstLoadJs(opts.buildOutput ?? "");
  const budget = 300;
  if (prod.length) {
    const worst = [...prod].sort((x, y) => y.kb - x.kb)[0]!;
    const over = prod.filter((r) => r.kb > budget);
    out.push(mk({ key: "perf-js", name: "JavaScript size is reasonable", category: "performance", method: "automated", objective: "Pages don't ship more JavaScript than they need.", expected: `First-load JavaScript under ${budget} KB per page (production build, compressed; Keelwork's default budget)`, actual: over.length ? `${over.length} page(s) over budget; largest ${worst.route} at ${worst.kb} KB` : `Largest page ${worst.route} at ${worst.kb} KB`, status: over.length ? "failed" : "passed", severity: worst.kb > budget * 2 ? "high" : "medium",
      evidence: [...prod].sort((x, y) => y.kb - x.kb).slice(0, 6).map((r) => ({ kind: "measure" as const, name: `First Load JS ${r.route}`, value: r.kb, unit: "KB", note: "From the production build output" })),
      finding: F("heavy-js", worst.kb > budget * 2 ? "high" : "medium", "confirmed", `${over.map((r) => `${r.route} (${r.kb} KB)`).join(", ")} load more than ${budget} KB of JavaScript.`, "Large bundles are slow to download and run on phones.", "Load heavy libraries only where they're used (dynamic import) and keep components server-side where possible.", "Run the build check and QA again.") }));
  } else if (scripts.length) {
    const kb = Math.round(scripts.reduce((s, a) => s + (a.bytes ?? 0), 0) / 1024);
    out.push(mk({ key: "perf-js", name: "JavaScript size is reasonable", category: "performance", method: "automated", objective: "Pages don't ship more JavaScript than they need.", expected: `First-load JavaScript under ${budget} KB per page (production build)`, actual: `Not measured: the production build's sizes weren't available, and the ${kb} KB served by the development server isn't representative.`, status: "not_run", severity: "info" }));
  }
  const vitals = browser?.available ? browser.pages.filter((b) => b.lcp !== null) : [];
  if (vitals.length) for (const b of vitals) {
    out.push(mk({ key: `perf-lcp:${b.path}:${b.viewport}`, name: `Largest content paints in time: ${b.path} @${b.viewport}px`, category: "performance", method: "browser", objective: "The main content appears quickly.", expected: "LCP under 2.5 s", actual: `${Math.round(b.lcp!)} ms`, status: b.lcp! <= 2500 ? "passed" : "failed", severity: b.lcp! > 4000 ? "high" : "medium", target: b.path, evidence: [{ kind: "measure", name: "LCP", value: Math.round(b.lcp!), unit: "ms" }],
      finding: F("slow-lcp", b.lcp! > 4000 ? "high" : "medium", "confirmed", `LCP on ${b.path} was ${Math.round(b.lcp!)} ms at ${b.viewport}px.`, "People wait too long to see the page.", "Prioritise the hero image, reduce render-blocking CSS/JS and server time.", "Re-run the browser suite.") }));
    if (b.cls !== null) out.push(mk({ key: `perf-cls-b:${b.path}:${b.viewport}`, name: `Layout stays stable: ${b.path} @${b.viewport}px`, category: "performance", method: "browser", objective: "Content doesn't jump around.", expected: "CLS under 0.1", actual: b.cls.toFixed(3), status: b.cls <= 0.1 ? "passed" : "failed", severity: "medium", target: b.path,
      finding: F("cls", "medium", "confirmed", `Layout shift on ${b.path} was ${b.cls.toFixed(3)}.`, "Things move as people try to tap them.", "Reserve space for images, ads and late content.", "Re-run the browser suite.") }));
  } else {
    out.push(mk({ key: "perf-vitals", name: "Core Web Vitals (LCP, CLS)", category: "performance", method: "browser", objective: "Measure loading and stability in a real browser.", expected: "LCP < 2.5 s, CLS < 0.1", actual: browser?.reason ?? "No browser runtime available, so these weren't measured.", status: "not_run", severity: "info" }));
  }
  return out;
}

export function load(snap: LoadSnap | null, reason?: string): Result[] {
  if (!snap) return [mk({ key: "load", name: "Load test", category: "load", method: "automated", objective: "Measure behaviour under concurrent traffic.", expected: "Low error rate and stable latency", actual: reason ?? "Load testing is off in this project's QA settings.", status: "not_run", severity: "info" })];
  const errRate = snap.requests ? snap.errors / snap.requests : 1;
  const ev: Evidence[] = [{ kind: "measure", name: "requests", value: snap.requests, unit: "" }, { kind: "measure", name: "p50", value: snap.p50, unit: "ms" }, { kind: "measure", name: "p95", value: snap.p95, unit: "ms" }, { kind: "measure", name: "p99", value: snap.p99, unit: "ms" }, { kind: "measure", name: "throughput", value: Math.round(snap.rps * 10) / 10, unit: "req/s" }, { kind: "measure", name: "errors", value: snap.errors, unit: "" }];
  return [
    mk({ key: "load:errors", name: `Error rate under ${snap.concurrency} concurrent users`, category: "load", method: "automated", objective: "The app keeps answering correctly under load.", steps: [`${snap.concurrency} concurrent clients for ${snap.seconds} s against ${snap.target} (sandbox only)`], expected: "Under 1% errors", actual: `${(errRate * 100).toFixed(1)}% of ${snap.requests} requests failed`, status: errRate < 0.01 ? "passed" : "failed", severity: errRate > 0.1 ? "high" : "medium", target: snap.target, evidence: ev,
      finding: F("load-errors", errRate > 0.1 ? "high" : "medium", "confirmed", `${(errRate * 100).toFixed(1)}% of requests failed with ${snap.concurrency} concurrent users in the sandbox.`, "Real traffic spikes may produce errors.", "Look for timeouts, connection limits and unhandled errors in the logs during the test.", "Re-run the load test.") }),
    mk({ key: "load:p95", name: `Latency under load (p95)`, category: "load", method: "automated", objective: "Response time stays reasonable under load.", expected: "p95 under 1,500 ms", actual: `p50 ${snap.p50} ms · p95 ${snap.p95} ms · p99 ${snap.p99} ms · ${snap.rps.toFixed(1)} req/s`, status: snap.p95 <= 1500 ? "passed" : "failed", severity: "medium", target: snap.target, evidence: ev,
      finding: F("load-latency", "medium", "confirmed", `p95 latency was ${snap.p95} ms under ${snap.concurrency} concurrent users.`, "The app slows sharply when busy.", "Profile the slowest requests and add caching or indexes.", "Re-run the load test.") }),
  ];
}

/* ------------------------------------------------------------------ */
/* Responsive & browser                                                 */
/* ------------------------------------------------------------------ */

export function responsive(pages: PageSnap[], browser: BrowserSnap): Result[] {
  const out: Result[] = [];
  const home = pages.find((p) => p.status && p.status < 400 && p.html);
  if (home) {
    const vp = parse(home.html).viewport;
    out.push(mk({ key: "resp:viewport", name: "Mobile viewport is configured", category: "responsive", method: "static", objective: "Phones render the page at device width.", expected: "<meta name=viewport content=\"width=device-width…\">", actual: vp ?? "No viewport meta tag", status: vp && /width\s*=\s*device-width/.test(vp) ? "passed" : "failed", severity: "high", target: home.path,
      finding: F("no-viewport", "high", "confirmed", "The page has no device-width viewport.", "Phones show a zoomed-out desktop page.", "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.", "Open the page on a phone.") }));
  }
  if (!browser.available) {
    out.push(mk({ key: "resp:browser", name: "Layout at phone, tablet and desktop widths", category: "responsive", method: "browser", objective: "No overflow, clipping or tiny tap targets at any width.", expected: "Checked in a real browser", actual: browser.reason ?? "No browser runtime", status: "blocked", severity: "info" }));
    out.push(mk({ key: "browser:engines", name: "Browsers tested", category: "crossbrowser", method: "browser", objective: "Record which browser engines were used.", expected: "Chromium, Firefox and WebKit where available", actual: `None — ${browser.reason ?? "no browser runtime"}`, status: "blocked", severity: "info" }));
    return out;
  }
  out.push(mk({ key: "browser:engines", name: "Browsers tested", category: "crossbrowser", method: "browser", objective: "Record which browser engines were used.", expected: "Chromium, Firefox and WebKit where available", actual: `Tested: ${browser.engine ?? "Chromium"}. Not tested: Firefox, WebKit (Safari).`, status: "passed", severity: "info" }));
  for (const b of browser.pages) {
    const where = `${b.path} @${b.viewport}px`;
    out.push(mk({ key: `browser:load:${b.path}:${b.viewport}`, name: `Opens without errors: ${where}`, category: "browser", method: "browser", objective: "The page loads in a browser without script errors.", expected: "No console errors", actual: b.ok ? (b.consoleErrors.length ? `${b.consoleErrors.length} console error(s)` : "Loaded cleanly") : b.status ? `Returned HTTP ${b.status}` : "Failed to load", status: b.ok && !b.consoleErrors.length ? "passed" : "failed", severity: b.ok ? "medium" : "high", target: b.path, evidence: [...b.consoleErrors.slice(0, 5).map((t) => ({ kind: "log" as const, text: snip(t, 300) })), ...(b.screenshot ? [{ kind: "screenshot" as const, viewport: `${b.viewport}`, page: b.path, dataUrl: b.screenshot }] : [])],
      finding: F("console-errors", b.ok ? "medium" : "high", "confirmed", `${where}: ${b.consoleErrors.length} console error(s).`, "Script errors often mean a feature silently doesn't work.", "Open the browser console on this page, fix the first error and reload.", "Re-run the browser suite.") }));
    if (!b.ok) {
      // The page itself didn't load (an error status or a timeout), so the
      // layout and keyboard checks have nothing real to look at.
      const why = b.status ? `The page returned HTTP ${b.status}, so this couldn't be checked` : "The page didn't load in the browser, so this couldn't be checked";
      out.push(mk({ key: `resp:overflow:${b.path}:${b.viewport}`, name: `No sideways scrolling: ${where}`, category: "responsive", method: "browser", objective: "Content fits the screen width.", expected: "No horizontal overflow", actual: why, status: "blocked", severity: "info", target: b.path }));
      if (b.viewport < 800) out.push(mk({ key: `resp:targets:${b.path}:${b.viewport}`, name: `Tap targets are big enough: ${where}`, category: "responsive", method: "browser", objective: "Buttons and links are easy to tap (WCAG 2.5.8).", expected: "At least 24×24 px", actual: why, status: "blocked", severity: "info", target: b.path }));
      if (b.viewport >= 1000) out.push(mk({ key: `a11y-b:focus:${b.path}:${b.viewport}`, name: `Keyboard focus is visible: ${where}`, category: "accessibility", method: "browser", objective: "WCAG 2.4.7", expected: "A visible focus indicator on every focusable element", actual: why, status: "blocked", severity: "info", target: b.path }));
      continue;
    }
    out.push(mk({ key: `resp:overflow:${b.path}:${b.viewport}`, name: `No sideways scrolling: ${where}`, category: "responsive", method: "browser", objective: "Content fits the screen width.", expected: "No horizontal overflow", actual: b.overflowX > 1 ? `${b.overflowX}px wider than the screen` : "Fits", status: b.overflowX > 1 ? "failed" : "passed", severity: b.viewport < 500 ? "medium" : "low", target: b.path, evidence: b.screenshot ? [{ kind: "screenshot", viewport: `${b.viewport}`, page: b.path, dataUrl: b.screenshot }] : [],
      finding: F("overflow-x", b.viewport < 500 ? "medium" : "low", "confirmed", `${b.path} is ${b.overflowX}px wider than a ${b.viewport}px screen.`, "People have to scroll sideways and may miss content.", "Find the element that's too wide (often fixed widths, long words or grids without minmax(0,1fr)) and let it shrink.", "Re-run the responsive suite.") }));
    if (b.viewport < 800) out.push(mk({ key: `resp:targets:${b.path}:${b.viewport}`, name: `Tap targets are big enough: ${where}`, category: "responsive", method: "browser", objective: "Buttons and links are easy to tap (WCAG 2.5.8).", expected: "At least 24×24 px", actual: b.smallTargets ? `${b.smallTargets} target(s) smaller than 24 px` : "All targets large enough", status: b.smallTargets ? "failed" : "passed", severity: "low", target: b.path,
      finding: F("tap-targets", "low", "confirmed", `${b.smallTargets} control(s) on ${b.path} are smaller than 24×24 px on phones.`, "Mis-taps and frustration on touch screens.", "Increase padding on small links and icon buttons.", "Re-run the responsive suite.", { wcag: "2.5.8" }) }));
    if (b.focusMissing !== null) out.push(mk({ key: `a11y-b:focus:${b.path}:${b.viewport}`, name: `Keyboard focus is visible: ${where}`, category: "accessibility", method: "browser", objective: "WCAG 2.4.7", expected: "A visible focus indicator on every focusable element", actual: b.focusMissing ? `${b.focusMissing} of ${b.focusChecked ?? "?"} element(s) showed no focus indicator` : b.focusChecked === 0 ? "Nothing on the page takes keyboard focus" : `Focus visible on ${b.focusChecked ?? "every"} element(s)`, status: b.focusMissing ? "failed" : b.focusChecked === 0 ? "skipped" : "passed", severity: "medium", target: b.path,
      finding: F("focus-visible", "medium", "confirmed", `${b.focusMissing} focusable element(s) on ${b.path} show no visible focus.`, "Keyboard users can't see where they are.", "Don't remove outlines; style :focus-visible clearly.", "Tab through the page.", { wcag: "2.4.7" }) }));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* UX, content, trust, forms, cognitive load                            */
/* ------------------------------------------------------------------ */

const LOREM = /lorem ipsum|dolor sit amet|consectetur adipiscing/i;
const GENERIC = /welcome to our website|your (text|content|title) here|insert (text|content)|coming soon\.?$|placeholder text|^untitled\b/i;

export function ux(pages: PageSnap[], profile: Profile): Result[] {
  const out: Result[] = [];
  const ok = pages.filter((p) => p.html && (p.status ?? 0) < 400);
  const home = ok.find((p) => p.path === "/") ?? ok[0];
  const sensitive = profile.payments || ["banking", "healthcare", "ecommerce"].includes(profile.appType) || profile.auth.present;
  if (home) {
    const d = parse(home.html);
    const h1 = d.headings.find((h) => h.level === 1)?.text ?? "";
    const ctas = [...d.buttons.map((b) => b.text), ...d.links.map((l) => l.text)].filter((t) => ACTION_WORDS.test(t));
    const ft = (key: string, name: string, pass: boolean, actual: string, severity: Severity, rule: string, rec: string) =>
      out.push(mk({ key: `ftue:${key}`, name, category: "ux", method: "static", objective: "A first-time visitor understands the app and knows what to do first.", expected: name, actual, status: pass ? "passed" : "failed", severity, target: home.path, evidence: [{ kind: "html", page: home.path, snippet: snip(`h1: ${h1 || "(none)"} · ${d.bodyText}`, 280) }],
        finding: F(rule, severity, "probable", `${name}: ${actual}.`, "New visitors may not understand what this is or where to start, and leave.", rec, "Show the home page to someone new and ask what it does and what they'd click first.", { title: `First impression: ${name.toLowerCase()}` }) }));
    ft("purpose", "The home page says what this is", h1.split(/\s+/).length >= 3 && !GENERIC.test(h1), h1 ? `Main heading: “${snip(h1, 80)}”` : "No main heading", "medium", "unclear-purpose", "Make the main heading say what the app does and for whom, in plain words.");
    ft("cta", "There is an obvious first action", ctas.length > 0, ctas.length ? `Actions found: ${[...new Set(ctas)].slice(0, 4).map((c) => `“${snip(c, 30)}”`).join(", ")}` : "No action-oriented button or link", "medium", "no-cta", "Add one clear primary button for the main thing people come to do.");
    const distinct = new Set(ctas.map((c) => c.toLowerCase().trim())).size;
    ft("cta-conflict", "Calls to action don't compete", distinct <= 6, `${distinct} different action labels on the home page`, "low", "competing-ctas", "Keep one primary action per screen and make the rest secondary.");
    ft("meta", "The page has a search description", !!d.metaDescription && d.metaDescription.length >= 50, d.metaDescription ? `${d.metaDescription.length} characters` : "No meta description", "low", "no-meta-description", "Write a 120–160 character description of what the page offers.");
  }
  for (const p of ok) {
    const d = parse(p.html);
    const text = d.bodyText;
    if (LOREM.test(text) || GENERIC.test(text))
      out.push(mk({ key: `content:placeholder:${p.path}`, name: `No placeholder copy: ${p.path}`, category: "content", method: "static", objective: "All copy is real.", expected: "No lorem ipsum or template filler", actual: snip((text.match(LOREM) ?? text.match(GENERIC))![0], 80), status: "failed", severity: "medium", target: p.path, evidence: [{ kind: "html", page: p.path, snippet: snip(text.slice(Math.max(0, text.search(LOREM.test(text) ? LOREM : GENERIC) - 60)), 200) }],
        finding: F("placeholder-copy", "medium", "confirmed", `${p.path} still contains placeholder text.`, "It looks unfinished and erodes trust.", "Replace it with real content about your product.", "Search the page for the phrase again.") }));
    else out.push(mk({ key: `content:placeholder:${p.path}`, name: `No placeholder copy: ${p.path}`, category: "content", method: "static", objective: "All copy is real.", expected: "No lorem ipsum or template filler", actual: "None found", status: "passed", severity: "info", target: p.path }));
    if (d.links.length > 120) out.push(mk({ key: `load:links:${p.path}`, name: `Page isn't overloaded with links: ${p.path}`, category: "ux", method: "static", objective: "Cognitive load: a manageable number of choices.", expected: "Under 120 links", actual: `${d.links.length} links`, status: "failed", severity: "low", target: p.path,
      finding: F("too-many-links", "low", "potential", `${p.path} has ${d.links.length} links.`, "Too many choices make it harder to find the right one.", "Group links, move rarely used ones to secondary pages, and use progressive disclosure.", "Review the page's navigation with a first-time user.") }));
    d.forms.forEach((f, i) => {
      const fields = d.inputs.filter((x) => x.form === i);
      const emailNoType = fields.filter((x) => /e-?mail/i.test(`${x.attrs.name ?? ""} ${x.attrs.id ?? ""}`) && x.attrs.type !== "email");
      const telNoType = fields.filter((x) => /phone|tel|mobile/i.test(`${x.attrs.name ?? ""} ${x.attrs.id ?? ""}`) && x.attrs.type !== "tel");
      const noAuto = fields.filter((x) => /name|email|phone|tel|address|postcode|zip|city/i.test(x.attrs.name ?? "") && !x.attrs.autocomplete);
      const problems = [
        ...(f.fields > 12 ? [`${f.fields} fields (long forms are often abandoned)`] : []),
        ...(emailNoType.length ? [`${emailNoType.length} email field(s) not type="email" (wrong phone keyboard, no validation)`] : []),
        ...(telNoType.length ? [`${telNoType.length} phone field(s) not type="tel"`] : []),
        ...(noAuto.length ? [`${noAuto.length} personal-detail field(s) without autocomplete`] : []),
      ];
      out.push(mk({ key: `form-ux:${p.path}:${i}`, name: `Form is easy to fill in: ${p.path} #${i + 1}`, category: "ux", method: "static", objective: "Forms use the right input types, help autofill and stay short.", expected: "Correct types, autocomplete, no unnecessary fields", actual: problems.length ? problems.join("; ") : `${f.fields} field(s), types and autofill look right`, status: problems.length ? "failed" : "passed", severity: f.fields > 12 ? "medium" : "low", target: p.path,
        finding: F("form-usability", f.fields > 12 ? "medium" : "low", "confirmed", `Form ${i + 1} on ${p.path}: ${problems.join("; ")}.`, "Harder to complete, especially on phones; more people give up.", "Use type=\"email\"/\"tel\", add autocomplete attributes and remove fields you don't need yet.", "Fill the form on a phone using autofill.") }));
    });
  }
  // Trust signals, checked across the whole site (footers usually carry them).
  if (ok.length) {
    const allLinks = ok.flatMap((p) => parse(p.html).links.map((l) => `${l.href} ${l.text}`.toLowerCase()));
    const has = (re: RegExp) => allLinks.some((l) => re.test(l));
    const trust = (key: string, name: string, pass: boolean, severity: Severity, rec: string) =>
      out.push(mk({ key: `trust:${key}`, name, category: "ux", method: "static", objective: "People can see who runs the app and how their data is handled.", expected: name, actual: pass ? "Found" : "Not found on any crawled page", status: pass ? "passed" : "failed", severity, finding: F(`trust-${key}`, severity, "probable", `${name}: not found on any page.`, sensitive ? "This app handles accounts, money or personal data; people need this before they trust it." : "Visitors look for this before getting in touch or buying.", rec, "Check the footer on every page.") }));
    trust("privacy", "A privacy policy is linked", has(/privacy/), sensitive ? "medium" : "low", "Link a privacy policy from every page's footer.");
    trust("terms", "Terms are linked", has(/terms|conditions/), sensitive ? "medium" : "low", "Link your terms from the footer and at sign-up or checkout.");
    trust("contact", "A way to contact you is visible", has(/contact|support|help|mailto:|tel:/), "medium", "Add a contact page or email address in the footer.");
    const nav = ok.some((p) => parse(p.html).landmarks.has("nav"));
    out.push(mk({ key: "nav:present", name: "Pages have a navigation menu", category: "ux", method: "static", objective: "People can move between sections.", expected: "A <nav> on pages", actual: nav ? "Found" : "No <nav> found", status: nav ? "passed" : "failed", severity: "medium", finding: F("no-nav", "medium", "probable", "No navigation landmark found on any page.", "People can't find their way around, and assistive tech can't jump to the menu.", "Add a <nav> with links to the main sections.", "Navigate the site using only the menu.") }));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Journeys                                                             */
/* ------------------------------------------------------------------ */

export type JourneyOutcome = { key: string; name: string; goal: string; steps: { label: string; page: string | null; status: "found" | "missing" | "unreachable" | "needs_sign_in" | "error" }[]; status: Status; friction: string[] };

export function journeys(profile: Profile, pages: PageSnap[]): { results: Result[]; outcomes: JourneyOutcome[] } {
  const graph = new Map<string, string[]>();
  for (const p of pages) if (p.html && (p.status ?? 0) < 400) graph.set(p.path, internalPaths(parse(p.html), p.url).map((x) => x.split("?")[0]!));
  const reachable = new Set<string>();
  const queue = ["/"]; while (queue.length) { const x = queue.shift()!; if (reachable.has(x)) continue; reachable.add(x); for (const n of graph.get(x) ?? []) if (!reachable.has(n)) queue.push(n); }
  const candidates = [...new Set([...pages.map((p) => p.path), ...profile.routes.filter((r) => r.kind === "page").map((r) => r.path)])];
  const outcomes: JourneyOutcome[] = [];
  const results: Result[] = [];
  for (const j of profile.journeys) {
    const steps = j.steps.map((s) => {
      const re = s.match instanceof RegExp ? s.match : new RegExp(s.match);
      const page = candidates.find((c) => re.test(c)) ?? null;
      if (!page) return { label: s.label, page, status: "missing" as const };
      const snap = pages.find((p) => p.path === page);
      if (snap && (snap.status ?? 0) >= 500) return { label: s.label, page, status: "error" as const };
      if (snap?.finalPath && /sign-?in|login/.test(snap.finalPath) && snap.finalPath !== page) return { label: s.label, page, status: "needs_sign_in" as const };
      if (!page.includes("[") && !reachable.has(page) && snap) return { label: s.label, page, status: "unreachable" as const };
      return { label: s.label, page, status: "found" as const };
    });
    const missing = steps.filter((s) => s.status === "missing");
    const errors = steps.filter((s) => s.status === "error");
    const gated = steps.filter((s) => s.status === "needs_sign_in");
    const unreachable = steps.filter((s) => s.status === "unreachable");
    const friction = [
      ...unreachable.map((s) => `“${s.label}” (${s.page}) exists but no link on the crawled pages leads to it`),
      ...gated.map((s) => `“${s.label}” needs sign-in; the rest of this journey needs a test session`),
    ];
    const status: Status = errors.length || missing.length ? "failed" : gated.length ? "blocked" : "passed";
    outcomes.push({ key: j.key, name: j.name, goal: j.goal, steps, status, friction });
    const sev: Severity = errors.length ? "high" : missing.length ? "medium" : unreachable.length ? "low" : "info";
    results.push(mk({ key: `journey:${j.key}`, name: `Journey: ${j.name}`, category: "journeys", method: "automated", objective: j.goal, steps: steps.map((s) => `${s.label}: ${s.page ?? "no matching page"} — ${s.status.replace(/_/g, " ")}`), expected: "Every step has a working page that can be reached", actual: status === "passed" ? (unreachable.length ? `Possible, with ${unreachable.length} hard-to-find step(s)` : "Every step found and reachable") : status === "blocked" ? "Needs a signed-in test session to continue" : `${missing.length} step(s) missing, ${errors.length} erroring`, status: status === "passed" && unreachable.length ? "failed" : status, severity: sev, target: j.name,
      finding: F(`journey-${missing.length ? "missing" : errors.length ? "error" : "unreachable"}`, sev, missing.length ? "probable" : "confirmed", missing.length ? `The “${j.name}” journey has no page for: ${missing.map((m) => m.label).join(", ")}.` : errors.length ? `Steps in “${j.name}” return errors: ${errors.map((e) => e.page).join(", ")}.` : friction.join(". "), "People can't complete this task, or struggle to find the next step.", missing.length ? "Build the missing step, or confirm the journey doesn't apply to your app (mark the issue as rejected)." : "Link each step from the previous one so people can find it.", "Run the journeys suite again.", { title: `Journey “${j.name}”: ${missing.length ? "missing steps" : errors.length ? "errors" : "hard to follow"}` }) }));
  }
  return { results, outcomes };
}

/* ------------------------------------------------------------------ */
/* Static code analysis                                                 */
/* ------------------------------------------------------------------ */

export function staticCode(files: SourceFile[], profile: Profile): Result[] {
  const out: Result[] = [];
  const code = files.filter((f) => /\.(tsx|jsx|ts|js)$/.test(f.path) && !/node_modules|\.next\/|\.test\.|\.spec\.|__tests__/.test(f.path));
  const lineOf = (src: string, idx: number) => src.slice(0, idx).split("\n").length;
  const scan = (rule: string, category: Category, re: RegExp, filter: (f: SourceFile, m: RegExpMatchArray) => boolean, mkF: (hits: Evidence[]) => ReturnType<typeof F> & { name: string }) => {
    const hits: Evidence[] = [];
    for (const f of code) for (const m of f.content.matchAll(re)) if (filter(f, m)) hits.push({ kind: "code", file: f.path, line: lineOf(f.content, m.index ?? 0), snippet: snip(m[0].replace(/\s+/g, " "), 140) });
    const spec = mkF(hits);
    out.push(mk({ key: `static:${rule}`, name: spec.name, category, method: "static", objective: spec.description.split(":")[0]!, expected: "None found", actual: hits.length ? `${hits.length} occurrence(s), first in ${(hits[0] as { file: string }).file}` : `Checked ${code.length} files`, status: hits.length ? "failed" : "passed", severity: hits.length ? spec.severity : "info", target: hits.length ? (hits[0] as { file: string }).file : undefined, evidence: hits.slice(0, 8), finding: spec }));
  };
  scan("dangerous-html", "security", /dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*([^}]+)\}\}/g, (_f, m) => !/^\s*["'`][^${}]*["'`]\s*$/.test(m[1]!) && !/JSON\.stringify|SITE_CSS|css\b|nonce/i.test(m[1]!),
    () => ({ name: "No unescaped HTML from data", ...F("xss-inner-html", "high", "potential", "Untrusted HTML may be rendered: dangerouslySetInnerHTML with a non-literal value.", "If any of that value comes from users, scripts can run in other people's browsers (stored or DOM XSS).", "Render text instead, or sanitise with a well-maintained sanitiser (e.g. DOMPurify) before inserting HTML.", "Try saving <img src=x onerror=alert(1)> in the field that feeds it.") }));
  scan("eval", "security", /\beval\s*\(|new\s+Function\s*\(/g, () => true,
    () => ({ name: "No eval or new Function", ...F("eval", "high", "probable", "Code runs strings as code: eval/new Function.", "If the string can be influenced by input, attackers can run code.", "Remove eval; parse data with JSON.parse or explicit logic.", "Search the code for eval after the fix.") }));
  scan("open-redirect", "security", /redirect\(\s*(?:searchParams|params|req\.query|request\.nextUrl\.searchParams)[^)]*\)|router\.push\(\s*(?:searchParams|params)\.get\([^)]*\)\s*\)/g, () => true,
    () => ({ name: "Redirects aren't taken from the URL unchecked", ...F("open-redirect", "medium", "potential", "A redirect target comes straight from the URL.", "Attackers can craft links on your domain that send people to phishing sites.", "Only allow relative paths that start with a single \"/\" (not \"//\"), or a list of known destinations.", "Visit the page with ?next=https://example.com and confirm you stay on the site.") }));
  scan("public-secret", "security", /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|PRIVATE|SERVICE_ROLE|PASSWORD|TOKEN)[A-Z0-9_]*/g, () => true,
    () => ({ name: "Secrets aren't exposed to the browser", ...F("public-secret-env", "critical", "probable", "A secret-looking value is exposed to the browser: NEXT_PUBLIC_ variables are bundled into client code.", "Anyone can read the secret from your site's JavaScript.", "Rename it without NEXT_PUBLIC_, use it only on the server, and rotate the value.", "Search the built JavaScript for the value.") }));
  scan("service-role-client", "security", /SUPABASE_SERVICE_ROLE_KEY/g, (f) => /["']use client["']/.test(f.content.slice(0, 300)),
    () => ({ name: "Admin keys stay on the server", ...F("service-role-in-client", "critical", "confirmed", "A client component references the service role key.", "It bypasses all row-level security for anyone who loads the page.", "Move that code to a server action or route handler.", "Rebuild and search the client bundle for the key name.") }));
  scan("sql-concat", "security", /(?:query|execute|raw|unsafe)\s*\(\s*`[^`]*\b(SELECT|INSERT|UPDATE|DELETE)\b[^`]*\$\{/gi, () => true,
    () => ({ name: "SQL isn't built from strings", ...F("sql-injection", "high", "potential", "SQL is built with string interpolation.", "Input could change the query (SQL injection).", "Use parameterised queries or the query builder.", "Send ' OR 1=1 -- in the related input.") }));
  scan("cors-wildcard", "security", /Access-Control-Allow-Origin["']?\s*[:,]\s*["']\*["']|origin:\s*["']\*["']/g, () => true,
    () => ({ name: "CORS isn't open to every origin", ...F("cors-wildcard", "medium", "probable", "CORS allows any origin.", "Other sites can call your API from users' browsers.", "List your own origins explicitly.", "Check the response headers from another origin.") }));
  scan("weak-random", "security", /Math\.random\(\)[^;\n]{0,80}(token|secret|password|code|otp|id\b)|(token|secret|password|otp)\w*\s*=\s*[^;\n]{0,40}Math\.random\(\)/gi, () => true,
    () => ({ name: "Tokens use secure randomness", ...F("weak-random", "medium", "probable", "Security tokens are made with Math.random().", "They can be predicted.", "Use crypto.randomUUID() or crypto.getRandomValues().", "Review how tokens are generated.") }));
  scan("money-float", "logic", /(parseFloat|Number)\(\s*[^)]*(price|amount|total|balance|fee|tax|subtotal)[^)]*\)[^;\n]*[*\/+-]|\b(price|amount|total|balance|subtotal)\w*\s*\*\s*0?\.\d+/gi, () => profile.payments || ["banking", "ecommerce", "restaurant", "marketplace"].includes(profile.appType),
    () => ({ name: "Money is calculated in whole units", ...F("money-float", "medium", "needs_manual", "Money looks like it's calculated with floating-point numbers: needs review.", "Rounding errors can make totals, taxes or balances wrong by a cent or more.", "Store and calculate money in minor units (integers, e.g. pence/kobo) and round once, explicitly, when displaying.", "Check totals with values like 0.1 + 0.2 and many line items.") }));
  scan("button-noop", "functional", /<button(?![^>]*\b(onClick|type=["'](submit|reset)["']|formAction|disabled|aria-disabled|\{\.\.\.)\b)[^>]*>/g, (f, m) => { const before = f.content.slice(0, m.index); const open = before.lastIndexOf("<form"); return open === -1 || before.lastIndexOf("</form>") > open; },
    () => ({ name: "Buttons outside forms have an action", ...F("button-no-handler", "low", "potential", "Buttons outside a form have no onClick: they may do nothing.", "People click and nothing happens.", "Give each button an onClick, make it a link, or put it inside a form with type=\"submit\".", "Click each listed button in the preview.") }));
  const hasError = files.some((f) => /(?:^|\/)app\/(?:.*\/)?(global-)?error\.(tsx|jsx|js)$/.test(f.path));
  const hasNotFound = files.some((f) => /(?:^|\/)app\/(?:.*\/)?not-found\.(tsx|jsx|js)$/.test(f.path));
  if (profile.framework === "Next.js") {
    out.push(mk({ key: "static:error-boundary", name: "Errors show a friendly page", category: "errors", method: "static", objective: "Unexpected errors are caught and explained.", expected: "app/error.tsx", actual: hasError ? "Present" : "No error boundary found", status: hasError ? "passed" : "failed", severity: "medium", finding: F("no-error-boundary", "medium", "confirmed", "There's no app/error.tsx, so an unexpected error shows a blank or generic screen.", "People get stuck with no explanation or way to retry.", "Add app/error.tsx with a plain explanation and a Try again button (reset()).", "Throw a test error in a page and check what appears.") }));
    out.push(mk({ key: "static:not-found", name: "A custom not-found page exists", category: "errors", method: "static", objective: "Missing pages are explained.", expected: "app/not-found.tsx", actual: hasNotFound ? "Present" : "Using the framework default", status: hasNotFound ? "passed" : "failed", severity: "low", finding: F("no-not-found", "low", "confirmed", "There's no custom not-found page.", "The default page doesn't help people get back on track.", "Add app/not-found.tsx with a link home.", "Open a missing address.") }));
  }
  // Database: tables without row-level security (Supabase/Postgres migrations).
  const sql = files.filter((f) => f.path.endsWith(".sql")).map((f) => f.content).join("\n");
  if (profile.tables.length && /supabase/i.test(profile.backend ?? "")) {
    const noRls = profile.tables.filter((t) => !new RegExp(`alter\\s+table\\s+(public\\.)?"?${t}"?\\s+enable\\s+row\\s+level\\s+security`, "i").test(sql));
    out.push(mk({ key: "db:rls", name: "Every table has row-level security", category: "database", method: "static", objective: "Data is isolated per user or workspace by the database itself.", expected: "RLS enabled on every table", actual: noRls.length ? `${noRls.length} table(s) without RLS: ${noRls.slice(0, 6).join(", ")}` : `${profile.tables.length} table(s) checked`, status: noRls.length ? "failed" : "passed", severity: noRls.length ? "critical" : "info", target: noRls[0],
      finding: F("rls-missing", "critical", "confirmed", `Tables without row-level security: ${noRls.join(", ")}.`, "With the public API key, anyone could read or change every row.", "Enable RLS on each table and add policies that limit rows to their owner or workspace.", "Query the table as another user and confirm you get nothing.") }));
    const noPk = profile.tables.filter((t) => { const m = new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?"?${t}"?\\s*\\(([\\s\\S]*?)\\);`, "i").exec(sql); return m ? !/primary\s+key/i.test(m[1]!) : false; });
    out.push(mk({ key: "db:pk", name: "Every table has a primary key", category: "database", method: "static", objective: "Rows can be identified and related reliably.", expected: "A primary key on each table", actual: noPk.length ? `Missing on: ${noPk.join(", ")}` : "All tables have one", status: noPk.length ? "failed" : "passed", severity: "medium", target: noPk[0],
      finding: F("no-primary-key", "medium", "confirmed", `Tables without a primary key: ${noPk.join(", ")}.`, "Duplicate rows and unreliable updates.", "Add an id primary key.", "Inspect the schema.") }));
    const destructive = /\bdrop\s+(table|column)\b|\btruncate\b/i.test(sql);
    out.push(mk({ key: "db:migration-safety", name: "Migrations don't destroy data", category: "database", method: "static", objective: "Migrations are safe to apply to a database with real data.", expected: "No DROP TABLE/COLUMN or TRUNCATE", actual: destructive ? "Found a destructive statement" : "None found", status: destructive ? "failed" : "passed", severity: "high",
      finding: F("destructive-migration", "high", "needs_manual", "A migration drops a table or column, or truncates data: needs review.", "Applying it to production deletes data permanently.", "Make sure the data is migrated or backed up first, or split it into a safe multi-step change.", "Review the migration and test it on a copy of production data.") }));
  }
  // Integrations configured without obvious test mode.
  if (profile.integrations.length) {
    const live = code.filter((f) => /sk_live_|pk_live_|LIVE_SECRET/.test(f.content));
    out.push(mk({ key: "integration:live-keys", name: "No live payment keys in code", category: "integration", method: "static", objective: "Tests can't move real money.", expected: "Keys come from environment variables; test keys during testing", actual: live.length ? `Live key patterns in ${live.map((f) => f.path).join(", ")}` : `${profile.integrations.join(", ")} — no live keys in code`, status: live.length ? "failed" : "passed", severity: live.length ? "critical" : "info",
      finding: F("live-keys", "critical", "confirmed", "Live payment keys appear in the code.", "Real charges could be made, and the keys can be stolen.", "Remove them, rotate them, and load keys from environment variables.", "Run the secrets scan.") }));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Checks the project already runs (tests, types, lint, build, audit)    */
/* ------------------------------------------------------------------ */

export type CheckRow = { kind: string; status: string; exit_code: number | null; summary: Record<string, unknown>; output: string | null; finished_at: string | null };

export function fromChecks(rows: CheckRow[]): Result[] {
  const names: Record<string, [string, Category]> = { tests: ["Project test suite passes", "build"], affected_tests: ["Tests for changed code pass", "regression"], typecheck: ["Type check passes", "build"], lint: ["Lint passes", "build"], build: ["Production build succeeds", "build"], audit: ["No vulnerable dependencies", "security"], secrets: ["No secrets in the code", "security"], review: ["Security code review", "security"] };
  return rows.filter((r) => names[r.kind]).map((r) => {
    const [name, category] = names[r.kind]!;
    const status: Status = r.status === "passed" ? "passed" : r.status === "failed" ? "failed" : r.status === "queued" || r.status === "running" ? "in_progress" : "blocked";
    const severity: Severity = r.kind === "build" || r.kind === "secrets" ? "critical" : r.kind === "tests" || r.kind === "audit" ? "high" : "medium";
    return mk({ key: `check:${r.kind}`, name, category, method: "automated", objective: `Run the project's ${r.kind.replace("_", " ")} in its sandbox.`, expected: "Exit code 0 / no blocking findings", actual: r.status === "error" ? `Couldn't run: ${String((r.summary as { error?: string }).error ?? "error")}` : `${r.status}${r.exit_code !== null ? ` (exit ${r.exit_code})` : ""}`, status, severity, evidence: r.output ? [{ kind: "log", text: snip(r.output.slice(-1200), 1200) }] : [],
      finding: F(`check-${r.kind}`, severity, "confirmed", `${name}: failed.`, r.kind === "build" ? "The app can't be deployed." : "Something the project's own checks rely on is broken.", r.kind === "audit" ? "Update the vulnerable packages listed in the Security Centre." : r.kind === "secrets" ? "Rotate the exposed credentials and remove them from the code; see the Security Centre." : "Open the log, fix the first error, and run the check again.", "Run the check again.", { title: name.replace("passes", "fails").replace("succeeds", "fails") }) });
  });
}

/* ------------------------------------------------------------------ */
/* Authorised penetration probes and business rules                     */
/* ------------------------------------------------------------------ */

export type PentestSnap = { reflections: { path: string; status: number | null; reflectedRaw: boolean; reflectedEscaped: boolean }[]; redirects: { path: string; param: string; status: number | null; location: string | null; external: boolean }[] };

export function pentest(snap: PentestSnap | null, authorized: { scope: string } | null): Result[] {
  if (!authorized) return [mk({ key: "pentest:authorization", name: "Authorised penetration probes", category: "pentest", method: "automated", objective: "Deeper probes run only with explicit authorisation and scope.", expected: "Authorisation recorded in QA settings", actual: "Not authorised for this project. A project manager can authorise sandbox-only probes in QA settings.", status: "blocked", severity: "info" })];
  if (!snap) return [mk({ key: "pentest:run", name: "Authorised penetration probes", category: "pentest", method: "automated", objective: "Probe the sandbox for reflected input and open redirects.", expected: "Probes run", actual: "The running app wasn't reachable, so no probes ran.", status: "blocked", severity: "info" })];
  const out: Result[] = [];
  for (const r of snap.reflections) {
    out.push(mk({ key: `pentest:reflect:${r.path}`, name: `Input isn't reflected as code: ${r.path}`, category: "pentest", method: "automated", objective: "Query parameters can't inject script (reflected XSS).", steps: [`GET ${r.path}?q=<script>marker</script>`, "Search the response for the unescaped payload"], expected: "Payload absent or escaped", actual: r.reflectedRaw ? "The payload came back unescaped in the HTML" : r.reflectedEscaped ? "Reflected, but escaped" : "Not reflected", status: r.reflectedRaw ? "failed" : "passed", severity: r.reflectedRaw ? "high" : "info", target: r.path, evidence: [{ kind: "http", method: "GET", url: `${r.path}?q=…`, status: r.status }],
      finding: F("reflected-xss", "high", "confirmed", `${r.path} echoes a query parameter into the page without escaping (scope: ${authorized.scope}).`, "A crafted link could run script in a visitor's browser and act as them.", "Render the value as text (React escapes by default — look for dangerouslySetInnerHTML or string-built HTML) and validate the parameter.", "Repeat the probe after the fix.") }));
  }
  for (const r of snap.redirects.filter((x) => x.status !== null)) {
    out.push(mk({ key: `pentest:redirect:${r.path}:${r.param}`, name: `No open redirect: ${r.path}?${r.param}=`, category: "pentest", method: "automated", objective: "Redirect parameters can't send people to other sites.", steps: [`GET ${r.path}?${r.param}=https://keelwork-qa.invalid/x`], expected: "Stay on this site", actual: r.external ? `Redirected to ${r.location}` : `${r.status}${r.location ? ` → ${r.location}` : ""}`, status: r.external ? "failed" : "passed", severity: r.external ? "medium" : "info", target: `${r.path}?${r.param}`,
      finding: F("open-redirect-live", "medium", "confirmed", `${r.path} redirects to any address given in ?${r.param}=.`, "Phishing links can borrow your domain's credibility.", "Accept only relative paths starting with a single \"/\", or an allow-list.", "Repeat the probe after the fix.") }));
  }
  if (!out.length) out.push(mk({ key: "pentest:none", name: "Authorised penetration probes", category: "pentest", method: "automated", objective: "Probe the sandbox for reflected input and open redirects.", expected: "Probes run", actual: "No pages suitable for these probes were found.", status: "skipped", severity: "info" }));
  return out;
}

/** Business rules can't be guessed: each unknown becomes an explicit question, not a pass. */
export function businessRules(profile: Profile): Result[] {
  return profile.unknowns.map((u) => mk({ key: `logic:rule:${hashHex(u)}`, name: `Business rule to confirm: ${u}`, category: "logic", method: "static", objective: "Test the rule once it's documented.", expected: "A documented rule Keelwork can test against", actual: "Not documented in the project, so it wasn't assumed or tested. Add it to the project description or plan.", status: "not_run", severity: "info" }));
}
