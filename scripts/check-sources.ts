/**
 * Static source checks (run in CI and locally):
 *  1. every .ts/.tsx file parses;
 *  2. "use server" is the first statement of its file, and such files
 *     export only async functions (types are allowed: they're erased);
 *  3. no client component ("use client") imports server-only code,
 *     directly or through other modules.
 */
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { importSpecifiers, resolve } from "../src/lib/testselect/graph";

const require = createRequire(import.meta.url);
const ts = require("typescript") as typeof import("typescript");
const ROOT = join(import.meta.dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", ".kw-tmp"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(relative(ROOT, p));
  }
  return out;
}

const files = ["src", "services", "scripts", "templates"].flatMap((d) => walk(join(ROOT, d)));
const set = new Set(files);
const src = new Map(files.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));
const problems: string[] = [];

const directive = (sf: import("typescript").SourceFile): string | null => {
  const first = sf.statements[0];
  return first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) ? first.expression.text : null;
};

for (const f of files) {
  const text = src.get(f)!;
  const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, f.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const diags = (sf as unknown as { parseDiagnostics: import("typescript").Diagnostic[] }).parseDiagnostics ?? [];
  for (const d of diags) problems.push(`${f}: parse error: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);

  const hasUseServer = /^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use server["']/.test(text) || /\n\s*["']use server["'];?\s*\n/.test(text);
  if (hasUseServer) {
    if (directive(sf) !== "use server") problems.push(`${f}: "use server" must be the first statement`);
    for (const st of sf.statements) {
      const exported = ts.canHaveModifiers(st) && ts.getModifiers(st)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (!exported) continue;
      if (ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st)) continue;
      const asyncFn = ts.isFunctionDeclaration(st) && ts.getModifiers(st)?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
      const asyncConst = ts.isVariableStatement(st) && st.declarationList.declarations.every((d) => d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) && ts.getModifiers(d.initializer)?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword));
      if (!asyncFn && !asyncConst) problems.push(`${f}: "use server" files may export only async functions`);
    }
    for (const st of sf.statements) if (ts.isExportDeclaration(st) && !st.isTypeOnly) problems.push(`${f}: re-exports are not allowed in "use server" files`);
  }
}

// Client components must not reach server-only modules.
const serverOnly = (f: string) => /^\s*import\s+["']server-only["']/m.test(src.get(f) ?? "") || /from\s+["']next\/headers["']/.test(src.get(f) ?? "");
const isClient = (f: string) => /^\s*["']use client["']/.test(src.get(f) ?? "");
const isServerAction = (f: string) => /^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use server["']/.test(src.get(f) ?? "");
for (const f of files.filter((x) => x.startsWith("src/") && isClient(x))) {
  const seen = new Set<string>([f]);
  const queue: { file: string; via: string[] }[] = [{ file: f, via: [] }];
  while (queue.length) {
    const { file, via } = queue.shift()!;
    for (const spec of importSpecifiers(src.get(file) ?? "")) {
      const r = resolve(file, spec, set);
      if (!r || r === "external" || seen.has(r)) continue;
      seen.add(r);
      // Server actions imported by client components are fine: Next calls them over the network.
      if (isServerAction(r)) continue;
      if (serverOnly(r)) { problems.push(`${f}: client component imports server-only ${r}${via.length ? ` (via ${via.join(" → ")})` : ""}`); continue; }
      queue.push({ file: r, via: [...via, r] });
    }
  }
}

if (problems.length) {
  console.log(problems.join("\n"));
  console.log(`\nFAILED: ${problems.length} problem(s) in ${files.length} files.`);
  process.exit(1);
}
console.log(`ok   ${files.length} TS/TSX files parse; "use server" files are well-formed; no client component imports server-only code.`);
