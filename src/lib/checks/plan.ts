export type CheckKind = "tests" | "affected_tests" | "lint" | "typecheck" | "build" | "audit" | "secrets" | "review";
export const CHECK_KINDS: CheckKind[] = ["tests", "affected_tests", "lint", "typecheck", "build", "audit", "secrets", "review"];

/** The command run in the sandbox for each kind (null = analysed by Keelwork, not a command). */
export function commandFor(kind: CheckKind): string[] | null {
  switch (kind) {
    case "tests": return ["pnpm", "run", "test"];
    case "lint": return ["pnpm", "run", "lint"];
    case "typecheck": return ["pnpm", "run", "typecheck"];
    case "build": return ["pnpm", "run", "build"];
    case "audit": return ["pnpm", "audit", "--json"];
    case "affected_tests": return null; // built from the test-selection graph
    case "secrets": case "review": return null;
  }
}

/**
 * Pass/fail rests on the real exit code. A check that couldn't run (no exit
 * code) is an error, never a pass. Blocking findings fail a check even when
 * the command exited 0.
 */
export function verdict(kind: CheckKind, exitCode: number | null | undefined, findings: { severity: string }[] = []): "passed" | "failed" | "error" {
  if (kind === "secrets" || kind === "review") {
    return findings.some((f) => f.severity === "critical" || f.severity === "high") ? "failed" : "passed";
  }
  if (exitCode === null || exitCode === undefined || !Number.isInteger(exitCode)) return "error";
  if (kind === "audit") return findings.some((f) => f.severity === "critical" || f.severity === "high") ? "failed" : exitCode === 0 || exitCode === 1 ? "passed" : "error";
  return exitCode === 0 ? "passed" : "failed";
}

export const OUTPUT_CAP = 200_000;
export function capOutput(text: string): string {
  return text.length > OUTPUT_CAP ? `${text.slice(0, OUTPUT_CAP / 2)}\n…[${text.length - OUTPUT_CAP} characters cut]…\n${text.slice(-OUTPUT_CAP / 2)}` : text;
}
