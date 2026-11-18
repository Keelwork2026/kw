import { createHash } from "node:crypto";
import { shouldInclude } from "@/lib/export/collect";
import { scanFiles } from "@/lib/checks/secret-scan";
import { reviewDatabase } from "@/lib/checks/review";
import { buildSchema } from "@/lib/db/schema";

export const CATEGORIES = ["saas", "commerce", "internal-tool", "portfolio", "community", "ai", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Packaged = {
  files: Record<string, string>;
  manifest: { path: string; size: number; sha256: string }[];
  findings: { rule: string; severity: string; title: string; location: string }[];
  blocking: number;
};

/**
 * Packages a project as a free template: env files and generated folders
 * are excluded, every file is scanned for credentials (and exact vault
 * values), and the database is reviewed. Critical/high findings block
 * approval in review.
 */
export function packageTemplate(files: { path: string; content: string }[], knownValues: readonly string[], migrationsDir: string | null): Packaged {
  const kept = files.filter((f) => shouldInclude(f.path) && f.content.length <= 500_000 && !f.content.includes("\u0000"));
  const secrets = scanFiles(kept, knownValues).map((s) => ({ rule: s.rule, severity: s.severity, title: s.title, location: `${s.file}:${s.line}` }));
  const schema = migrationsDir ? buildSchema(kept.filter((f) => f.path.startsWith(`${migrationsDir}/`) && f.path.endsWith(".sql")).map((f) => ({ name: f.path, sql: f.content }))) : { tables: [] };
  const db = reviewDatabase(schema).map((r) => ({ rule: r.rule, severity: r.severity, title: r.title, location: r.location }));
  const findings = [...secrets, ...db];
  return {
    files: Object.fromEntries(kept.map((f) => [f.path, f.content])),
    manifest: kept.map((f) => ({ path: f.path, size: Buffer.byteLength(f.content), sha256: createHash("sha256").update(f.content).digest("hex") })),
    findings,
    blocking: findings.filter((f) => f.severity === "critical" || f.severity === "high").length,
  };
}

export function validateListing(input: { title: string; description: string; category: string; rightsConfirmed: boolean }): string | null {
  if (!input.rightsConfirmed) return "Confirm that you hold the rights to everything in the template.";
  if (input.title.trim().length < 3 || input.title.trim().length > 80) return "The title needs 3–80 characters.";
  if (input.description.trim().length < 10 || input.description.trim().length > 2000) return "The description needs 10–2000 characters.";
  if (!(CATEGORIES as readonly string[]).includes(input.category)) return "Choose a category.";
  return null;
}
