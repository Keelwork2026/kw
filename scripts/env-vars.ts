/**
 * Lists every environment variable each process reads, by walking the
 * imports from each entry point and collecting process.env reads. Used to
 * keep .env.example and the go-live checklist complete.
 *   pnpm tsx scripts/env-vars.ts          # human-readable
 *   pnpm tsx scripts/env-vars.ts --json
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { importSpecifiers, resolve } from "../src/lib/testselect/graph";

const ROOT = join(import.meta.dirname, "..");
const IGNORE = new Set(["node_modules", ".next", ".git"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name) || (dir === ROOT && name === "templates")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(relative(ROOT, p));
  }
  return out;
}

/** Variables read by this file: process.env.X, process.env["X"], env.X / env("X") / need("X") in service entry points. */
export function envReads(src: string): string[] {
  const names = new Set<string>();
  for (const m of src.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)|process\.env\[\s*["']([A-Z][A-Z0-9_]+)["']\s*\]|\b(?:env|need)\(\s*["']([A-Z][A-Z0-9_]+)["']\s*\)|\benv\.([A-Z][A-Z0-9_]+)/g)) {
    names.add((m[1] ?? m[2] ?? m[3] ?? m[4])!);
  }
  return [...names];
}

// NODE_PATH is read by scripts Keelwork runs inside sandboxes (to find Playwright), not by Keelwork itself.
const NOT_PLATFORM = new Set(["NODE_ENV", "HOME", "NODE_PATH"]);
// Read through billing_plans.stripe_price_env rather than a literal.
// Read indirectly: plan price ids through billing_plans.stripe_price_env, and the
// AI keys through the catalogue's apiKeyEnv (the Kimi + DeepSeek preset's names).
const INDIRECT: Record<string, string[]> = {
  "src/lib/billing/server.ts": ["STRIPE_PRICE_PRO", "STRIPE_PRICE_BUSINESS"],
  "src/lib/ai/server.ts": ["MOONSHOT_API_KEY", "DEEPSEEK_API_KEY"],
  "services/agent-worker/src/worker.ts": ["MOONSHOT_API_KEY", "DEEPSEEK_API_KEY"],
};
// Customer-app templates and analyzers mention variable names that Keelwork itself never reads.
const SKIP_FILES = new Set(["src/lib/stack/adapt.ts", "src/lib/backend/routes.ts", "src/lib/integrations/catalog.ts", "scripts/env-vars.ts"]);

export const ENTRIES: Record<string, string[]> = {
  "Web app": ["src/middleware.ts", ...walk(join(ROOT, "src/app"))],
  "Agent worker": ["services/agent-worker/src/worker.ts"],
  "Automation runner": ["services/automation-runner/runner.ts"],
  "Sandbox broker": ["services/sandbox-broker/server.ts"],
  "Preview proxy": ["services/preview-proxy/proxy.ts"],
};

export function envByProcess(): Record<string, string[]> {
  const files = walk(ROOT);
  const set = new Set(files);
  const content = new Map(files.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));
  const out: Record<string, string[]> = {};
  for (const [proc, entries] of Object.entries(ENTRIES)) {
    const seen = new Set<string>();
    const queue = entries.filter((e) => set.has(e));
    while (queue.length) {
      const f = queue.shift()!;
      if (seen.has(f)) continue;
      seen.add(f);
      for (const spec of importSpecifiers(content.get(f) ?? "")) {
        const r = resolve(f, spec, set);
        if (r && r !== "external" && !seen.has(r)) queue.push(r);
      }
    }
    const names = new Set<string>();
    for (const f of seen) {
      if (SKIP_FILES.has(f)) continue;
      for (const n of [...envReads(content.get(f)!), ...(INDIRECT[f] ?? [])]) if (!NOT_PLATFORM.has(n)) names.add(n);
    }
    out[proc] = [...names].sort();
  }
  return out;
}

if (process.argv[1] && /env-vars\.ts$/.test(process.argv[1])) {
  const byProc = envByProcess();
  if (process.argv.includes("--json")) process.stdout.write(JSON.stringify(byProc, null, 2) + "\n");
  else for (const [p, names] of Object.entries(byProc)) process.stdout.write(`${p}:\n${names.map((n) => `  ${n}`).join("\n")}\n\n`);
}
