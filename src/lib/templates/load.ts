import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".open-next", ".wrangler", "coverage", "dist"]);

export function templatesRoot(): string {
  return process.env.KW_TEMPLATES_DIR ?? resolve(process.cwd(), "templates");
}

/**
 * Loads a starter template from disk as path → content. Env files (other
 * than .env.example) and generated folders are never included.
 */
export async function loadTemplate(name: string, root = templatesRoot()): Promise<Map<string, string>> {
  if (!/^[a-z0-9-]{1,48}$/.test(name)) throw new Error("invalid template name");
  const base = join(root, name);
  const files = new Map<string, string>();
  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) await walk(full); continue; }
      if (!entry.isFile()) continue;
      if (entry.name.startsWith(".env") && entry.name !== ".env.example") continue;
      files.set(relative(base, full).split(sep).join("/"), await readFile(full, "utf8"));
    }
  }
  await walk(base);
  if (!files.has("package.json")) throw new Error(`template ${name} not found`);
  return new Map([...files.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
