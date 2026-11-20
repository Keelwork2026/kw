import { loadProject } from "@/lib/project";
import { csv, html, resultRows, type IssueRow, type ReportKind, type RunInfo } from "@/lib/qa/report";
import { CATEGORY_INFO, type Category, type Result, type ReleaseStatus } from "@/lib/qa/types";

/** QA reports from stored results only: HTML (print to PDF), CSV and JSON. */
const KINDS: ReportKind[] = ["executive", "functional", "security", "ux", "performance", "accessibility", "responsive", "regression", "full"];

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "html";
  const kindParam = url.searchParams.get("kind") ?? "full";
  const { supabase, project } = await loadProject(id);
  const { data: issues } = await supabase.from("qa_issues").select("ref, title, category, severity, priority, status, confidence, target, description, impact, recommendation, verify, created_at, last_seen").eq("project_id", project.id).order("ref");
  const issueRows: IssueRow[] = (issues ?? []).map((i) => ({ ref: i.ref as number, title: i.title as string, category: CATEGORY_INFO[i.category as Category]?.label ?? (i.category as string), severity: i.severity as string, priority: i.priority as string, status: i.status as string, confidence: i.confidence as string, target: i.target as string | null, description: i.description as string, impact: i.impact as string, recommendation: i.recommendation as string, verify: i.verify as string, first_seen: i.created_at as string, last_seen: i.last_seen as string }));
  const fname = (ext: string, kind: string) => `${project.name.replace(/[^\w-]+/g, "-").toLowerCase()}-qa-${kind}.${ext}`;
  if (kindParam === "issues") {
    return new Response(csv(issueRows as unknown as Record<string, unknown>[]), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${fname("csv", "issues")}"`, "cache-control": "no-store" } });
  }
  const kind = KINDS.includes(kindParam as ReportKind) ? (kindParam as ReportKind) : "full";
  const runId = url.searchParams.get("run");
  const q = supabase.from("qa_runs").select("id, mode, status, created_at, finished_at, commit, scores, readiness").eq("project_id", project.id);
  const { data: run } = runId ? await q.eq("id", runId).maybeSingle() : await q.eq("status", "completed").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!run) return new Response("No QA run to report on yet.", { status: 404 });
  const { data: res } = await supabase.from("qa_results").select("key, name, category, method, objective, steps, expected, actual, status, severity, target, evidence").eq("run_id", run.id).limit(3000);
  const results = (res ?? []) as unknown as Result[];
  const scores = run.scores as { overall?: { value: number | null }; coverage?: number; areas?: { label: string; value: number | null; basis: string; executed: number; total: number }[] } | null;
  const readiness = run.readiness as { status: ReleaseStatus; reasons: string[] } | null;
  const info: RunInfo = { id: run.id as string, mode: run.mode as string, status: run.status as string, created_at: run.created_at as string, finished_at: run.finished_at as string | null, commit: run.commit as string | null, project: project.name, overall: scores?.overall?.value ?? null, coverage: scores?.coverage ?? 0, release: readiness?.status ?? "not_tested", reasons: readiness?.reasons ?? [], areas: scores?.areas ?? [] };
  if (format === "json") return Response.json({ run: info, results, issues: issueRows }, { headers: { "content-disposition": `attachment; filename="${fname("json", kind)}"`, "cache-control": "no-store" } });
  if (format === "csv") return new Response(csv(resultRows(results)), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${fname("csv", kind)}"`, "cache-control": "no-store" } });
  return new Response(html(kind, info, results, issueRows), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:" } });
}
