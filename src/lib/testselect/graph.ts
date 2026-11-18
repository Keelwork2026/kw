/**
 * Predictive test selection: from the files changed since the last passing
 * run, pick only the tests that depend on them — or all of them when that
 * can't be decided safely.
 */
export type Graph = {
  files: Set<string>;
  /** file → files that import it */
  reverse: Map<string, Set<string>>;
  /** file → specifiers that couldn't be followed */
  unresolved: Map<string, string[]>;
  tests: Set<string>;
};
export type Selection =
  | { kind: "none"; reason: string }
  | { kind: "some"; tests: { file: string; reason: string }[] }
  | { kind: "all"; reason: string };

const CODE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
export function isTestFile(path: string): boolean {
  return /\.(test|spec)\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(path) || (/^(tests?|__tests__)\//.test(path) && CODE.test(path));
}
const GLOBAL = /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|tsconfig(\.[\w-]+)?\.json|(vitest|jest|playwright|next|babel)\.config\.[cm]?[jt]s|\.babelrc|[\w-]*setup[\w-]*\.[cm]?[jt]sx?|\.nvmrc|\.node-version)$/;

/** Static, dynamic and require imports. Non-literal dynamic imports are reported as "?". */
export function importSpecifiers(src: string): string[] {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");
  const found: { at: number; spec: string }[] = [];
  for (const m of code.matchAll(/\b(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"']+)["']/g)) found.push({ at: m.index!, spec: m[1]! });
  for (const m of code.matchAll(/\b(?:import|require)\s*\(\s*([^)]*?)\s*\)/g)) found.push({ at: m.index!, spec: /^["'][^"']+["']$/.test(m[1]!) ? m[1]!.slice(1, -1) : "?" });
  return found.sort((a, b) => a.at - b.at).map((f) => f.spec);
}

function normalize(path: string): string {
  const parts: string[] = [];
  for (const p of path.split("/")) { if (p === "." || p === "") continue; if (p === "..") parts.pop(); else parts.push(p); }
  return parts.join("/");
}

const EXTS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
/** Resolves a specifier to a project file, "external" for packages, or null when it can't be followed. */
export function resolve(from: string, spec: string, files: Set<string>): string | "external" | null {
  if (spec === "?") return null;
  let base: string[];
  if (spec.startsWith("./") || spec.startsWith("../")) base = [normalize(`${from.split("/").slice(0, -1).join("/")}/${spec}`)];
  else if (spec.startsWith("@/")) base = [normalize(spec.slice(2)), normalize(`src/${spec.slice(2)}`)];
  else if (spec.startsWith("/")) return null;
  else return "external";
  for (const b of base) {
    const candidates = [b, b.replace(/\.(m|c)?js$/, (m) => m.replace("js", "ts")), b.replace(/\.jsx$/, ".tsx"), ...EXTS.map((e) => b + e), ...EXTS.map((e) => `${b}/index${e}`)];
    for (const c of candidates) if (files.has(c)) return c;
  }
  // Non-code imports (CSS, JSON, images) that exist are fine; missing ones can't be followed.
  for (const b of base) if (files.has(b)) return b;
  return /\.(css|scss|svg|png|jpe?g|gif|webp|json|md)$/.test(spec) ? "external" : null;
}

export function buildGraph(files: { path: string; content: string }[]): Graph {
  const set = new Set(files.map((f) => f.path));
  const reverse = new Map<string, Set<string>>();
  const unresolved = new Map<string, string[]>();
  for (const f of files) {
    if (!CODE.test(f.path)) continue;
    for (const spec of importSpecifiers(f.content)) {
      const r = resolve(f.path, spec, set);
      if (r === "external") continue;
      if (r === null) { unresolved.set(f.path, [...(unresolved.get(f.path) ?? []), spec]); continue; }
      if (!reverse.has(r)) reverse.set(r, new Set());
      reverse.get(r)!.add(f.path);
    }
  }
  return { files: set, reverse, unresolved, tests: new Set(files.map((f) => f.path).filter(isTestFile)) };
}

export function selectTests(graph: Graph, changedSinceLastPass: string[]): Selection {
  const changed = [...new Set(changedSinceLastPass)];
  if (changed.length === 0) return { kind: "none", reason: "nothing changed since the last passing run" };
  const global = changed.find((c) => GLOBAL.test(c));
  if (global) return { kind: "all", reason: `${global} can affect every test` };
  const code = changed.filter((c) => CODE.test(c));
  if (code.length === 0) return { kind: "none", reason: "only non-code files changed" };

  const chosen = new Map<string, string>();
  for (const file of code) {
    if (graph.tests.has(file)) { chosen.set(file, "the test itself changed"); continue; }
    // Breadth-first through importers, so transitive dependants are found too.
    const seen = new Set([file]);
    const queue: { f: string; via: string | null }[] = [{ f: file, via: null }];
    while (queue.length) {
      const { f, via } = queue.shift()!;
      for (const importer of graph.reverse.get(f) ?? []) {
        if (seen.has(importer)) continue;
        seen.add(importer);
        const path = via ?? (f === file ? null : f);
        if (graph.tests.has(importer) && !chosen.has(importer)) chosen.set(importer, path ? `imports ${file} (through ${path})` : `imports ${file}`);
        queue.push({ f: importer, via: path ?? (importer !== file ? importer : null) });
      }
    }
  }
  // If anything a chosen test (or a changed file) depends on has imports we
  // couldn't follow, the selection may be incomplete: run everything.
  const unfollowable = [...graph.unresolved.keys()].find((f) => code.includes(f) || chosen.has(f) || dependsOnChanged(graph, f, code));
  if (unfollowable) return { kind: "all", reason: `${unfollowable} has imports that couldn't be followed` };
  if (chosen.size === 0) return { kind: "none", reason: "no test depends on the changed files" };
  return { kind: "some", tests: [...chosen.entries()].map(([f, reason]) => ({ file: f, reason })).sort((a, b) => a.file.localeCompare(b.file)) };
}

function dependsOnChanged(graph: Graph, file: string, changed: string[]): boolean {
  // Is `file` an importer (direct or transitive) of any changed file?
  for (const c of changed) {
    const seen = new Set<string>([c]);
    const queue = [c];
    while (queue.length) {
      for (const imp of graph.reverse.get(queue.shift()!) ?? []) {
        if (imp === file) return true;
        if (!seen.has(imp)) { seen.add(imp); queue.push(imp); }
      }
    }
  }
  return false;
}

/** The argv for running only the selected tests with the project's runner. */
export function selectiveCommand(testScript: string | undefined, tests: string[]): string[] {
  const s = testScript ?? "";
  if (/\bvitest\b/.test(s)) return ["npx", "vitest", "run", ...tests];
  if (/\bjest\b/.test(s)) return ["npx", "jest", ...tests];
  if (/\bplaywright\b/.test(s)) return ["npx", "playwright", "test", ...tests];
  return ["node", "--test", ...tests];
}
