import type { AppType, Category, Confidence, IssueStatus, Priority, ReleaseStatus, Result, Score, Settings, Severity, Status } from "./types";
import { OPEN_ISSUE } from "./types";

/**
 * Transparent scoring, prioritisation, release readiness and run comparison.
 * Scores come only from executed results; coverage is shown next to every
 * score, and skipped areas are reported as unavailable rather than guessed.
 */

export const AREAS = [
  { key: "functional", label: "Functional reliability", weight: 20, categories: ["functional", "logic", "api", "database", "build", "journeys", "browser"] },
  { key: "security", label: "Security", weight: 20, categories: ["security", "pentest"] },
  { key: "ux", label: "User experience", weight: 15, categories: ["ux", "content", "personas"] },
  { key: "performance", label: "Performance", weight: 15, categories: ["performance", "load"] },
  { key: "accessibility", label: "Accessibility", weight: 10, categories: ["accessibility"] },
  { key: "responsive", label: "Responsive quality", weight: 10, categories: ["responsive", "crossbrowser"] },
  { key: "errors", label: "Reliability & error recovery", weight: 5, categories: ["errors", "regression"] },
  { key: "integration", label: "Integration quality", weight: 5, categories: ["integration"] },
] as const;
export type AreaKey = (typeof AREAS)[number]["key"];

/** Default weightings by kind of app (the owner can override them). */
export const WEIGHT_PRESETS: Partial<Record<AppType, Partial<Record<AreaKey, number>>>> = {
  banking: { security: 30, functional: 25, ux: 10, performance: 10, accessibility: 10, responsive: 5, errors: 5, integration: 5 },
  ecommerce: { functional: 25, security: 20, performance: 20, ux: 15, accessibility: 5, responsive: 10, errors: 3, integration: 2 },
  education: { accessibility: 20, functional: 20, ux: 15, responsive: 15, security: 15, performance: 10, errors: 3, integration: 2 },
  landing: { performance: 25, accessibility: 20, ux: 25, responsive: 15, functional: 10, security: 5 },
  business: { performance: 20, accessibility: 20, ux: 20, responsive: 15, functional: 15, security: 10 },
  healthcare: { security: 30, accessibility: 20, functional: 20, ux: 10, performance: 10, responsive: 5, errors: 5 },
};

const W: Record<Severity, number> = { critical: 10, high: 6, medium: 3, low: 1, info: 0.25 };
const EXECUTED: Status[] = ["passed", "failed"];

function areaScore(results: Result[]): { value: number | null; executed: number; total: number; aiOnly: boolean } {
  const executed = results.filter((r) => EXECUTED.includes(r.status));
  if (!executed.length) return { value: null, executed: 0, total: results.length, aiOnly: false };
  // Each executed check carries its severity's weight; a failure loses it.
  const total = executed.reduce((s, r) => s + W[r.severity === "info" && r.status === "passed" ? "low" : r.severity], 0);
  const lost = executed.filter((r) => r.status === "failed").reduce((s, r) => s + W[r.severity], 0);
  const value = Math.max(0, Math.round(100 * (1 - lost / Math.max(total, 1))));
  // A critical failure caps the area: it can't look healthy with a blocker in it.
  const capped = executed.some((r) => r.status === "failed" && r.severity === "critical") ? Math.min(value, 40) : executed.some((r) => r.status === "failed" && r.severity === "high") ? Math.min(value, 75) : value;
  return { value: capped, executed: executed.length, total: results.length, aiOnly: executed.every((r) => r.method === "ai" || r.method === "simulated") };
}

export function scores(results: Result[], appType: AppType, settings?: Pick<Settings, "weights">): { areas: (Score & { key: AreaKey; label: string; weight: number })[]; overall: Score; coverage: number } {
  const preset = WEIGHT_PRESETS[appType] ?? {};
  const areas = AREAS.map((a) => {
    const rs = results.filter((r) => (a.categories as readonly string[]).includes(r.category));
    const s = areaScore(rs);
    const weight = (settings?.weights as Partial<Record<string, number>> | undefined)?.[a.key] ?? preset[a.key] ?? a.weight;
    const basis: Score["basis"] = s.value === null ? "unavailable" : s.aiOnly ? "estimated" : s.executed < Math.max(1, Math.ceil(s.total * 0.8)) ? "incomplete" : "verified";
    const explain = s.value === null ? `Not measured: no ${a.label.toLowerCase()} checks ran${s.total ? ` (${s.total} couldn't run)` : ""}.` : `${s.executed} of ${s.total} checks ran. Each passed check earns its severity weight (critical 10, high 6, medium 3, low 1); failures lose it.${basis === "estimated" ? " Based only on AI-assisted or simulated analysis." : ""}`;
    return { key: a.key, label: a.label, weight, category: a.key as unknown as Category, value: s.value, basis, executed: s.executed, total: s.total, explain };
  });
  const measured = areas.filter((a) => a.value !== null && a.weight > 0);
  const wsum = measured.reduce((s, a) => s + a.weight, 0);
  const allWeight = areas.reduce((s, a) => s + a.weight, 0);
  const coverage = allWeight ? Math.round((wsum / allWeight) * 100) : 0;
  const value = wsum ? Math.round(measured.reduce((s, a) => s + (a.value ?? 0) * a.weight, 0) / wsum) : null;
  const basis: Score["basis"] = value === null ? "unavailable" : coverage < 100 ? "incomplete" : measured.some((a) => a.basis !== "verified") ? "incomplete" : "verified";
  const executed = areas.reduce((s, a) => s + a.executed, 0);
  const total = areas.reduce((s, a) => s + a.total, 0);
  return { areas, coverage, overall: { category: "overall", value, basis, executed, total, explain: value === null ? "No checks have run yet." : `Weighted average of the ${measured.length} areas that were measured (${coverage}% of the total weight). Areas that weren't tested aren't counted as passes.` } };
}

export function priorityOf(severity: Severity, confidence: Confidence, criticalWorkflow = false): Priority {
  const base: Priority = severity === "critical" ? "P0" : severity === "high" ? "P1" : severity === "medium" ? "P2" : severity === "low" ? "P3" : "P4";
  const order: Priority[] = ["P0", "P1", "P2", "P3", "P4"];
  let i = order.indexOf(base);
  if ((confidence === "potential" || confidence === "needs_manual") && i < 2) i += 1; // unconfirmed blockers are reviewed first, not assumed
  if (criticalWorkflow && i > 0 && severity !== "info") i -= 1;
  return order[i]!;
}

export type IssueLite = { id?: string; title: string; severity: Severity; status: IssueStatus; category: Category; priority?: Priority; accepted_expires?: string | null };

export function readiness(input: {
  runStatus: "none" | "queued" | "running" | "completed" | "stopped" | "error";
  results: Result[];
  issues: IssueLite[];
  settings: Settings;
  overall: number | null;
  approved?: { by: string; at: string } | null;
  manualReviewDone?: boolean;
  now?: Date;
}): { status: ReleaseStatus; reasons: string[]; blocking: string[] } {
  const now = input.now ?? new Date();
  if (input.runStatus === "none") return { status: "not_tested", reasons: ["No QA run yet. Run Quick QA to get a first assessment."], blocking: [] };
  if (input.runStatus === "queued" || input.runStatus === "running") return { status: "in_progress", reasons: ["A QA run is in progress; readiness is recalculated when it finishes."], blocking: [] };
  const reasons: string[] = [];
  const blocking: string[] = [];
  const expired = (i: IssueLite) => i.status === "accepted_risk" && !!i.accepted_expires && new Date(i.accepted_expires) < now;
  const open = input.issues.filter((i) => OPEN_ISSUE.includes(i.status) || expired(i));
  for (const i of open) if (input.settings.gate.blockingSeverities.includes(i.severity)) blocking.push(`${i.severity === "critical" ? "Critical" : i.severity[0]!.toUpperCase() + i.severity.slice(1)}: ${i.title}${expired(i) ? " (accepted risk has expired)" : ""}`);
  const coreBroken = input.results.filter((r) => r.status === "failed" && (r.key === "page:/" || r.key === "check:build" || (r.category === "journeys" && r.severity === "high")));
  for (const r of coreBroken) blocking.push(`Core functionality: ${r.name} — ${r.actual}`);
  if (input.runStatus === "error") reasons.push("The last QA run stopped with an error, so results are incomplete.");
  if (input.runStatus === "stopped") reasons.push("The last QA run was stopped before it finished.");
  const missing = input.settings.gate.requiredCategories.filter((c) => !input.results.some((r) => r.category === c && (r.status === "passed" || r.status === "failed")));
  for (const c of missing) reasons.push(`Required checks didn't run: ${c}.`);
  if (input.overall !== null && input.overall < input.settings.gate.minOverall) reasons.push(`Overall score ${input.overall} is below the project's minimum of ${input.settings.gate.minOverall}.`);
  const high = open.filter((i) => i.severity === "high" && !input.settings.gate.blockingSeverities.includes("high"));
  if (high.length) reasons.push(`${high.length} high-severity issue(s) are still open.`);
  if (input.settings.gate.requireManualReview && !input.manualReviewDone) reasons.push("A manual review is required by this project's release gate.");
  if (coreBroken.length) return { status: "failed", reasons: [...blocking, ...reasons], blocking };
  if (blocking.length) return { status: "critical", reasons: [...blocking, ...reasons], blocking };
  if (input.runStatus !== "completed" || missing.length || (input.overall !== null && input.overall < input.settings.gate.minOverall) || (input.settings.gate.requireManualReview && !input.manualReviewDone)) return { status: "needs_review", reasons, blocking };
  if (high.length) return { status: "conditional", reasons, blocking };
  if (input.approved) return { status: "approved", reasons: [`Approved for release by ${input.approved.by} on ${input.approved.at.slice(0, 10)}.`], blocking };
  return { status: "ready", reasons: ["No blocking issues, required checks ran, and the score meets the project's minimum."], blocking };
}

export type Comparison = { newFailures: Result[]; fixed: Result[]; stillFailing: Result[]; newTests: Result[]; removed: string[]; scoreDelta: number | null };

export function compare(prev: Result[], curr: Result[], prevScore: number | null, currScore: number | null): Comparison {
  const before = new Map(prev.map((r) => [r.key, r]));
  const after = new Map(curr.map((r) => [r.key, r]));
  const newFailures: Result[] = [], fixed: Result[] = [], stillFailing: Result[] = [], newTests: Result[] = [];
  for (const r of curr) {
    const p = before.get(r.key);
    if (!p) { newTests.push(r); if (r.status === "failed") newFailures.push(r); continue; }
    if (r.status === "failed" && p.status === "passed") newFailures.push(r);
    else if (r.status === "passed" && p.status === "failed") fixed.push(r);
    else if (r.status === "failed" && p.status === "failed") stillFailing.push(r);
  }
  const removed = prev.filter((p) => !after.has(p.key)).map((p) => p.key);
  return { newFailures, fixed, stillFailing, newTests, removed, scoreDelta: prevScore !== null && currScore !== null ? currScore - prevScore : null };
}

/** Which categories to run for each mode. */
export function categoriesFor(mode: "quick" | "full" | "predeploy" | "regression" | "custom", chosen: Category[] = []): Category[] {
  switch (mode) {
    case "quick": return ["functional", "build", "security", "accessibility", "responsive", "errors", "content"];
    case "predeploy": return ["functional", "build", "security", "journeys", "api", "database", "performance", "accessibility", "responsive", "regression", "errors", "integration", "logic"];
    case "regression": return ["functional", "build", "regression", "api", "security", "accessibility", "responsive"];
    case "custom": return chosen.length ? chosen : ["functional"];
    case "full": return ["functional", "logic", "browser", "api", "database", "security", "pentest", "ux", "journeys", "personas", "performance", "load", "accessibility", "responsive", "crossbrowser", "regression", "integration", "errors", "content", "build"];
  }
}
