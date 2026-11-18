/**
 * Parsers for test, compiler and linter output. Unknown output claims
 * nothing: pass/fail then rests on the exit code alone.
 */
export type TestSummary = { tool: "node:test" | "vitest" | "jest" | "playwright"; passed: number; failed: number; skipped: number; total: number };

const n = (s: string | undefined) => (s ? Number(s) : 0);

export function parseTestSummary(out: string): TestSummary | null {
  const text = out.replace(/\x1b\[[0-9;]*m/g, "");
  // node:test (TAP or spec reporter)
  const tapPass = /^#\s*pass\s+(\d+)/m.exec(text), tapFail = /^#\s*fail\s+(\d+)/m.exec(text);
  const specPass = /^ℹ\s*pass\s+(\d+)/m.exec(text), specFail = /^ℹ\s*fail\s+(\d+)/m.exec(text);
  if ((tapPass && tapFail) || (specPass && specFail)) {
    const passed = n((tapPass ?? specPass)![1]), failed = n((tapFail ?? specFail)![1]);
    const skipped = n((/^[#ℹ]\s*skipped\s+(\d+)/m.exec(text) ?? [])[1]) + n((/^[#ℹ]\s*todo\s+(\d+)/m.exec(text) ?? [])[1]);
    const total = n((/^[#ℹ]\s*tests\s+(\d+)/m.exec(text) ?? [])[1]) || passed + failed + skipped;
    return { tool: "node:test", passed, failed, skipped, total };
  }
  // Vitest: "Tests  3 failed | 12 passed | 1 skipped (16)"
  const v = /^\s*Tests\s+(.+?)\s+\((\d+)\)\s*$/m.exec(text);
  if (v && /passed|failed/.test(v[1]!)) {
    const part = (w: string) => n((new RegExp(`(\\d+) ${w}`).exec(v[1]!) ?? [])[1]);
    return { tool: "vitest", passed: part("passed"), failed: part("failed"), skipped: part("skipped") + part("todo"), total: Number(v[2]) };
  }
  // Jest: "Tests:       1 failed, 2 skipped, 3 passed, 6 total"
  const j = /^Tests:\s+(.+?(\d+) total)\s*$/m.exec(text);
  if (j) {
    const part = (w: string) => n((new RegExp(`(\\d+) ${w}`).exec(j[1]!) ?? [])[1]);
    return { tool: "jest", passed: part("passed"), failed: part("failed"), skipped: part("skipped") + part("todo"), total: Number(j[2]) };
  }
  // Playwright: "  3 passed (4.2s)" / "  1 failed" / "  2 skipped"
  const pw = /^\s+(\d+) passed \([\d.]+m?s\)\s*$/m.exec(text);
  const pwFail = /^\s+(\d+) failed\s*$/m.exec(text);
  if (pw || (pwFail && /Running \d+ tests? using/.test(text))) {
    const passed = n(pw?.[1]), failed = n(pwFail?.[1]), skipped = n((/^\s+(\d+) skipped\s*$/m.exec(text) ?? [])[1]), flaky = n((/^\s+(\d+) flaky\s*$/m.exec(text) ?? [])[1]);
    return { tool: "playwright", passed: passed + flaky, failed, skipped, total: passed + failed + skipped + flaky };
  }
  return null;
}

export type Diagnostic = { file: string; line: number; column: number; severity: "error" | "warning"; code: string; message: string };

/** tsc: "app/page.tsx(4,7): error TS2322: …" or "app/page.tsx:4:7 - error TS2322: …" */
export function parseTsc(out: string): Diagnostic[] {
  const text = out.replace(/\x1b\[[0-9;]*m/g, "");
  const diags: Diagnostic[] = [];
  for (const m of text.matchAll(/^(.+?)(?:\((\d+),(\d+)\)|:(\d+):(\d+))\s*[:-]\s*(error|warning)\s+(TS\d+):\s*(.+)$/gm)) {
    diags.push({ file: m[1]!.trim(), line: Number(m[2] ?? m[4]), column: Number(m[3] ?? m[5]), severity: m[6] as "error" | "warning", code: m[7]!, message: m[8]!.trim() });
  }
  return diags;
}

/** ESLint stylish output. */
export function parseEslint(out: string): Diagnostic[] {
  const text = out.replace(/\x1b\[[0-9;]*m/g, "");
  const diags: Diagnostic[] = [];
  let file: string | null = null;
  for (const line of text.split("\n")) {
    if (/^(\.?\/|[A-Za-z]:\\|[A-Za-z0-9_@.-]+\/)\S+\.(ts|tsx|js|jsx|mjs|cjs)$/.test(line.trim()) && !line.startsWith(" ")) { file = line.trim(); continue; }
    const m = /^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s{2,}([@\w/-]+)\s*$/.exec(line);
    if (m && file) diags.push({ file, line: Number(m[1]), column: Number(m[2]), severity: m[3] as "error" | "warning", code: m[5]!, message: m[4]!.trim() });
  }
  return diags;
}
