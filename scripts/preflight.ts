/**
 * Pre-deployment check of a production environment file. Reports missing,
 * malformed, unsafe or placeholder values per process. Values are never
 * printed — only variable names and what's wrong with them.
 *
 *   pnpm preflight path/to/production.env            # every process
 *   pnpm preflight path/to/web.env --process "Web app"
 *
 * Exits 1 when anything blocks a deployment; warnings don't.
 */
import { readFileSync } from "node:fs";
import { loadMasterKeys } from "../src/lib/secrets/vault";
import { envByProcess } from "./env-vars";

export type Finding = { level: "error" | "warning"; name: string; message: string };

/** Variables a process can run without (a feature is simply off, or a default applies). */
export const OPTIONAL = new Set([
  "CREDIT_PACKS", "STRIPE_PRICE_PRO", "STRIPE_PRICE_BUSINESS", "BRAVE_SEARCH_API_KEY", "BRAVE_SEARCH_COST_MICROS", "WORKER_CONCURRENCY",
  "KW_TEMPLATES_DIR", "HOST", "PORT", "SANDBOX_MEMORY_MB", "SANDBOX_NETWORK", "SANDBOX_RUNTIME", "SANDBOX_IMAGE", "AUTH_PROVIDERS",
  "DEEPSEEK_API_KEY", "MOONSHOT_API_KEY",
]);
/** Optional, but its absence turns off something people will notice. */
const NOTICEABLE: Record<string, string> = {
  STRIPE_PRICE_PRO: "the Pro plan can't be bought", STRIPE_PRICE_BUSINESS: "the Business plan can't be bought",
  BRAVE_SEARCH_API_KEY: "agents can't search the web", SANDBOX_RUNTIME: "sandboxes run without gVisor (set SANDBOX_RUNTIME=runsc)",
  SANDBOX_IMAGE: "sandboxes use the plain Node image, so browser QA and screenshots are unavailable (keelwork/runtime-browser)",
};
const URLS = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL", "KW_APP_ORIGIN", "APP_ORIGIN"];
const INTERNAL_URLS = ["SANDBOX_BROKER_URL", "BROKER_URL"];
const LONG_SECRETS = ["BROKER_TOKEN", "SANDBOX_BROKER_TOKEN", "PREVIEW_SECRET"];
const PLACEHOLDER = /^(changeme|change-me|todo|xxx+|placeholder|your[-_].*|<.*>|\[.*\]|example)$/i;

export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2]!.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]!] = v;
  }
  return out;
}

export function checkEnv(env: Record<string, string>, names: string[]): Finding[] {
  const f: Finding[] = [];
  const err = (name: string, message: string) => f.push({ level: "error", name, message });
  const warn = (name: string, message: string) => f.push({ level: "warning", name, message });
  const has = (n: string) => typeof env[n] === "string" && env[n]!.trim() !== "";

  for (const n of names) {
    if (!has(n)) {
      if (!OPTIONAL.has(n)) err(n, "missing");
      else if (NOTICEABLE[n]) warn(n, `not set: ${NOTICEABLE[n]}`);
      continue;
    }
    const v = env[n]!.trim();
    if (PLACEHOLDER.test(v)) { err(n, "still a placeholder"); continue; }
    if (URLS.includes(n)) {
      let u: URL | null = null;
      try { u = new URL(v); } catch { err(n, "isn't a URL"); continue; }
      if (u.protocol !== "https:") err(n, "must use https in production");
      if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(u.hostname) || u.hostname.endsWith(".localhost")) err(n, "points at this machine, not a public address");
    }
    if (INTERNAL_URLS.includes(n)) {
      try { const u = new URL(v); if (u.protocol === "http:" && !/^(127\.|localhost|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)) warn(n, "plain http over a public network; use https or a private network"); } catch { err(n, "isn't a URL"); }
    }
    if (LONG_SECRETS.includes(n) && v.length < 32) err(n, "too short (use openssl rand -hex 32)");
    if (n === "SECRETS_MASTER_KEYS") { try { loadMasterKeys(v); } catch (e) { err(n, (e as Error).message); } }
    if (n === "AI_MODEL_CATALOG") { try { JSON.parse(v); } catch { err(n, "isn't valid JSON (generate it with scripts/print-stack-catalog.ts)"); } }
    if (n === "STRIPE_SECRET_KEY" && v.startsWith("sk_test_")) warn(n, "is a test key; real payments won't be taken");
    if (n === "STRIPE_SECRET_KEY" && !/^(sk|rk)_(test|live)_/.test(v)) err(n, "doesn't look like a Stripe secret key");
    if (n === "STRIPE_WEBHOOK_SECRET" && !v.startsWith("whsec_")) err(n, "doesn't look like a Stripe webhook secret");
    if (n === "HOST" && !["127.0.0.1", "localhost", "::1"].includes(v)) warn(n, "binds beyond this machine; keep services on 127.0.0.1 behind the proxy");
    if (n === "SANDBOX_RUNTIME" && v !== "runsc") warn(n, "isn't gVisor (runsc); sandboxes are less isolated");
    if (n === "NEXT_PUBLIC_SUPABASE_ANON_KEY" && env.SUPABASE_SERVICE_ROLE_KEY && v === env.SUPABASE_SERVICE_ROLE_KEY.trim()) err(n, "is the service-role key — that key must never reach browsers");
  }
  if (names.includes("BROKER_TOKEN") && names.includes("SANDBOX_BROKER_TOKEN") && has("BROKER_TOKEN") && has("SANDBOX_BROKER_TOKEN") && env.BROKER_TOKEN !== env.SANDBOX_BROKER_TOKEN) err("SANDBOX_BROKER_TOKEN", "doesn't match BROKER_TOKEN");
  if (names.includes("KW_APP_ORIGIN") && names.includes("NEXT_PUBLIC_SITE_URL") && has("KW_APP_ORIGIN") && has("NEXT_PUBLIC_SITE_URL")) {
    try { if (new URL(env.KW_APP_ORIGIN!).origin !== new URL(env.NEXT_PUBLIC_SITE_URL!).origin) warn("KW_APP_ORIGIN", "differs from NEXT_PUBLIC_SITE_URL; Design mode only works from KW_APP_ORIGIN"); } catch { /* reported above */ }
  }
  return f;
}

if (process.argv[1] && /preflight\.ts$/.test(process.argv[1])) {
  const file = process.argv[2];
  if (!file) { process.stderr.write("usage: pnpm preflight <env-file> [--process \"Web app\"]\n"); process.exit(2); }
  const env = parseEnvFile(readFileSync(file, "utf8"));
  const pi = process.argv.indexOf("--process");
  const byProc = envByProcess();
  const procs = pi > 0 ? [process.argv[pi + 1]!] : Object.keys(byProc);
  let errors = 0;
  for (const p of procs) {
    const names = byProc[p];
    if (!names) { process.stderr.write(`unknown process "${p}"; one of: ${Object.keys(byProc).join(", ")}\n`); process.exit(2); }
    const found = checkEnv(env, names);
    errors += found.filter((x) => x.level === "error").length;
    process.stdout.write(`${p}: ${found.length ? "" : "ok"}\n${found.map((x) => `  ${x.level === "error" ? "✗" : "!"} ${x.name} ${x.message}`).join("\n")}${found.length ? "\n" : ""}`);
  }
  process.stdout.write(errors ? `\n${errors} problem${errors === 1 ? "" : "s"} block deployment.\n` : "\nNo blocking problems.\n");
  process.exit(errors ? 1 : 0);
}
