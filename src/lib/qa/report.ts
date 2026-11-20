import type { Result } from "./types";
import { CATEGORY_INFO, METHOD_LABEL, RELEASE_LABEL, type ReleaseStatus } from "./types";

/** Exports of real results only: CSV for spreadsheets, JSON for tools, HTML for reading and printing to PDF. */
export type IssueRow = { ref: number; title: string; category: string; severity: string; priority: string; status: string; confidence: string; target: string | null; description: string; impact: string; recommendation: string; verify: string; first_seen: string; last_seen: string };
export type RunInfo = { id: string; mode: string; status: string; created_at: string; finished_at: string | null; commit: string | null; project: string; overall: number | null; coverage: number; release: ReleaseStatus; reasons: string[]; areas: { label: string; value: number | null; basis: string; executed: number; total: number }[] };

// Text that a spreadsheet would run as a formula (=, +, -, @, tab, CR) is
// prefixed with an apostrophe; findings can quote page content.
const cell = (v: unknown) => { let s = v === null || v === undefined ? "" : String(v); if (typeof v === "string" && /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function csv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]!);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
}
export const resultRows = (rs: Result[]) => rs.map((r) => ({ id: r.key, name: r.name, category: CATEGORY_INFO[r.category].label, method: METHOD_LABEL[r.method], status: r.status, severity: r.severity, target: r.target ?? "", expected: r.expected, actual: r.actual }));

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type ReportKind = "executive" | "functional" | "security" | "ux" | "performance" | "accessibility" | "responsive" | "regression" | "full";
const KIND_CATS: Record<ReportKind, string[] | null> = {
  executive: null, full: null,
  functional: ["functional", "logic", "api", "database", "build", "journeys", "browser", "errors", "integration"],
  security: ["security", "pentest"], ux: ["ux", "content", "journeys", "personas"], performance: ["performance", "load"],
  accessibility: ["accessibility"], responsive: ["responsive", "crossbrowser"], regression: ["regression"],
};

export function html(kind: ReportKind, run: RunInfo, results: Result[], issues: IssueRow[]): string {
  const cats = KIND_CATS[kind];
  const rs = cats ? results.filter((r) => cats.includes(r.category)) : results;
  const is = cats ? issues.filter((i) => cats.some((c) => CATEGORY_INFO[c as keyof typeof CATEGORY_INFO]?.label === i.category || c === i.category)) : issues;
  const count = (s: string) => rs.filter((r) => r.status === s).length;
  const title = `${kind === "full" ? "Full QA" : kind[0]!.toUpperCase() + kind.slice(1)} report — ${run.project}`;
  const byMethod = [...new Set(rs.map((r) => r.method))].map((m) => `${METHOD_LABEL[m]}: ${rs.filter((r) => r.method === m).length}`).join(" · ");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font:15px/1.55 system-ui,sans-serif;color:#1c1b19;max-width:1000px;margin:40px auto;padding:0 20px}h1{font-size:28px;margin:0}h2{margin-top:36px;border-bottom:1px solid #ddd;padding-bottom:6px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #eee;vertical-align:top}th{background:#f6f5f2}.pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600}.passed{background:#e3f4e8;color:#1d6b38}.failed{background:#fde4e1;color:#9b2c1d}.blocked,.not_run,.skipped{background:#eee;color:#555}.critical{color:#9b2c1d;font-weight:700}.high{color:#b3471d;font-weight:600}.muted{color:#666}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.box{border:1px solid #e5e2dc;border-radius:10px;padding:12px}.big{font-size:26px;font-weight:700}@media print{body{margin:0}}</style></head><body>
<h1>${esc(title)}</h1>
<p class="muted">Run ${esc(run.id.slice(0, 8))} · ${esc(run.mode)} · ${esc(run.status)} · started ${esc(run.created_at.replace("T", " ").slice(0, 16))} UTC${run.commit ? ` · version ${esc(run.commit.slice(0, 10))}` : ""}</p>
<div class="grid"><div class="box"><div class="muted">Release status</div><div class="big">${esc(RELEASE_LABEL[run.release])}</div></div><div class="box"><div class="muted">Overall score</div><div class="big">${run.overall ?? "—"}</div><div class="muted">${run.coverage}% of weighted areas measured</div></div><div class="box"><div class="muted">Results</div><div class="big">${count("passed")} / ${count("failed")}</div><div class="muted">passed / failed · ${count("blocked") + count("not_run") + count("skipped")} not run</div></div><div class="box"><div class="muted">Open issues</div><div class="big">${is.filter((i) => !["verified", "rejected", "false_positive", "accepted_risk"].includes(i.status)).length}</div></div></div>
<h2>Why this status</h2><ul>${run.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
<h2>Scores</h2><table><tr><th>Area</th><th>Score</th><th>Basis</th><th>Checks run</th></tr>${run.areas.map((a) => `<tr><td>${esc(a.label)}</td><td>${a.value ?? "—"}</td><td>${esc(a.basis)}</td><td>${a.executed} of ${a.total}</td></tr>`).join("")}</table>
<p class="muted">How results were obtained: ${esc(byMethod || "no results")}. Results labelled AI-simulated are not real human research. Scores count only checks that actually ran.</p>
<h2>Issues (${is.length})</h2>${is.length ? `<table><tr><th>#</th><th>Issue</th><th>Severity</th><th>Priority</th><th>Status</th><th>What to do</th></tr>${is.map((i) => `<tr><td>${i.ref}</td><td><b>${esc(i.title)}</b><br><span class="muted">${esc(i.category)} · ${esc(i.target ?? "")} · ${esc(i.confidence)}</span><br>${esc(i.description)}</td><td class="${esc(i.severity)}">${esc(i.severity)}</td><td>${esc(i.priority)}</td><td>${esc(i.status.replace(/_/g, " "))}</td><td>${esc(i.recommendation)}<br><span class="muted">Verify: ${esc(i.verify)}</span></td></tr>`).join("")}</table>` : "<p>No issues in this report's scope.</p>"}
${kind === "executive" ? "" : `<h2>Results (${rs.length})</h2><table><tr><th>Check</th><th>Method</th><th>Status</th><th>Expected</th><th>Actual</th></tr>${rs.map((r) => `<tr><td><b>${esc(r.name)}</b><br><span class="muted">${esc(CATEGORY_INFO[r.category].label)} · ${esc(r.severity)}</span></td><td>${esc(METHOD_LABEL[r.method])}</td><td><span class="pill ${esc(r.status)}">${esc(r.status.replace("_", " "))}</span></td><td>${esc(r.expected)}</td><td>${esc(r.actual)}</td></tr>`).join("")}</table>`}
<p class="muted" style="margin-top:40px">Generated by Keelwork QA. Automated accessibility checks can't establish full WCAG conformance; items marked for manual review need a person to check them.</p>
</body></html>`;
}
