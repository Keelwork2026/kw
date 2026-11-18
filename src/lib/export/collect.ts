import { scanFiles, type SecretFinding } from "@/lib/checks/secret-scan";

/**
 * Decides what goes into a source export or a deployment upload: the whole
 * project except generated folders, logs and env files (only .env.example).
 */
const EXCLUDED_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", ".turbo", "coverage", "dist", "logs", ".open-next", ".wrangler", ".kw-bundle"]);
export const EXPORT_LIMITS = { files: 5000, bytes: 50 * 1024 * 1024 } as const;

export function shouldInclude(path: string): boolean {
  const segs = path.split("/");
  if (segs.some((s) => EXCLUDED_DIRS.has(s))) return false;
  const base = segs.at(-1)!;
  if (base.startsWith(".env") && base !== ".env.example") return false;
  if (base.endsWith(".log") || base.endsWith(".tsbuildinfo") || base === ".DS_Store") return false;
  return true;
}

export type CollectResult =
  | { ok: true; files: { path: string; content: Buffer }[]; bytes: number }
  | { ok: false; reason: "limits"; message: string }
  | { ok: false; reason: "credentials"; findings: SecretFinding[] };

/** Filters, enforces limits and scans every file (including exact vault values). Any credential blocks. */
export function collectForExport(files: { path: string; content: Buffer }[], knownValues: readonly string[]): CollectResult {
  const kept = files.filter((f) => shouldInclude(f.path));
  if (kept.length > EXPORT_LIMITS.files) return { ok: false, reason: "limits", message: `the project has more than ${EXPORT_LIMITS.files} files` };
  const bytes = kept.reduce((n, f) => n + f.content.length, 0);
  if (bytes > EXPORT_LIMITS.bytes) return { ok: false, reason: "limits", message: "the project is larger than 50 MB" };
  const textual = kept.filter((f) => !f.content.subarray(0, 8000).includes(0)).map((f) => ({ path: f.path, content: f.content.toString("utf8") }));
  const findings = scanFiles(textual, knownValues);
  if (findings.length) return { ok: false, reason: "credentials", findings };
  return { ok: true, files: kept, bytes };
}

/** A README listing the variables the app needs — names only, never values. */
export function envReadme(projectName: string, names: string[]): string {
  const list = [...new Set(names)].sort();
  return [
    `# ${projectName} — exported from Keelwork`,
    "",
    "This archive is the full source of your app. It contains no secrets.",
    "",
    "## Environment variables",
    "",
    list.length ? "Set these before running the app (values are in your Keelwork project's Secrets tab):" : "This app doesn't need any environment variables yet.",
    "",
    ...list.map((n) => `- \`${n}\``),
    "",
    "## Run it",
    "",
    "```sh",
    "pnpm install",
    "pnpm dev",
    "```",
    "",
  ].join("\n");
}
