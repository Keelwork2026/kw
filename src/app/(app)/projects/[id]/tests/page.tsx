import Link from "next/link";
import { loadProject } from "@/lib/project";
import { brokerConfig } from "@/lib/sandbox/client";
import { ActionForm } from "@/components/action-form";
import { Notice, StatusPill, EmptyState, timeAgo } from "@/components/page-header";
import { requestChecks } from "./actions";

export const metadata = { title: "Tests" };
const BUTTONS: [string, string][] = [["tests", "Run tests"], ["affected_tests", "Run affected tests"], ["typecheck", "Type check"], ["lint", "Lint"], ["build", "Build"]];

type Summary = { tests?: { passed: number; failed: number; skipped: number; total: number; tool: string } | null; diagnostics?: { file: string; line: number; column: number; code: string; message: string; severity: string }[]; selective?: boolean; error?: string; timedOut?: boolean };
type Selection = { kind: string; reason?: string; tests?: { file: string; reason: string }[] } | null;

export default async function TestsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ log?: string }> }) {
  const { id } = await params;
  const { log } = await searchParams;
  const { supabase, project, can } = await loadProject(id);
  const { data: sandbox } = await supabase.from("sandboxes").select("status").eq("project_id", project.id).maybeSingle();
  const { data: runs } = await supabase.from("check_runs").select("id, kind, status, exit_code, summary, selection, duration_ms, created_at, requested_by_agent").eq("project_id", project.id).in("kind", ["tests", "affected_tests", "lint", "typecheck", "build"]).order("created_at", { ascending: false }).limit(30);
  const { data: full } = log ? await supabase.from("check_runs").select("id, kind, output").eq("id", log).eq("project_id", project.id).maybeSingle() : { data: null };
  const canRun = brokerConfig() && sandbox?.status === "running";

  return (
    <div className="grid gap-6">
      {!canRun ? <Notice>Checks run inside the project&apos;s sandbox, which {brokerConfig() ? "isn't running — start it from the builder" : "isn't connected to this installation"}. Nothing can run until it is.</Notice> : null}
      {can("project.write") ? (
        <div id="run" className="flex flex-wrap gap-2">
          {BUTTONS.map(([kind, label]) => (
            <ActionForm key={kind} action={requestChecks} submitLabel={label} submitClassName={`btn min-h-10 ${kind === "tests" ? "btn-primary" : "btn-secondary"}`}>
              <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="kind" value={kind} />
            </ActionForm>
          ))}
        </div>
      ) : null}
      {full ? (
        <section className="panel p-4" aria-labelledby="log">
          <div className="flex items-center justify-between"><h2 id="log" className="text-lg">Full log · {full.kind}</h2><Link href={`/projects/${project.id}/tests`} className="text-sm font-semibold text-accent">Close</Link></div>
          <pre className="mt-3 max-h-[60vh] overflow-auto rounded-xl bg-[#0b1f3a] p-4 font-mono text-xs leading-5 text-[#e7ecf4]">{full.output ?? "No output."}</pre>
        </section>
      ) : null}
      <section className="panel overflow-x-auto" aria-labelledby="history">
        <h2 id="history" className="px-5 pt-4 text-lg">Run history</h2>
        {runs?.length ? (
          <ul className="mt-2 divide-y divide-border">
            {runs.map((r) => {
              const s = (r.summary ?? {}) as Summary;
              const sel = r.selection as Selection;
              return (
                <li key={r.id} className="px-5 py-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={r.status} /><strong>{r.kind.replace("_", " ")}</strong>
                    <span className="text-muted">· {timeAgo(r.created_at)}{r.duration_ms ? ` · ${(r.duration_ms / 1000).toFixed(1)} s` : ""}{r.exit_code !== null ? ` · exit ${r.exit_code}` : ""}{r.requested_by_agent ? " · by an agent" : ""}</span>
                    <Link href={`?log=${r.id}`} className="ml-auto font-semibold text-accent">Full log</Link>
                  </div>
                  {s.tests ? <p className="mt-1">{s.tests.passed} passed · {s.tests.failed} failed · {s.tests.skipped} skipped <span className="text-muted">({s.tests.tool})</span></p> : null}
                  {s.error ? <p className="mt-1 text-danger">{s.error}</p> : null}
                  {s.diagnostics?.length ? (
                    <ul className="mt-2 grid gap-1 font-mono text-xs">{s.diagnostics.slice(0, 10).map((d, i) => <li key={i}><span className={d.severity === "error" ? "text-danger" : "text-muted"}>{d.file}:{d.line}:{d.column}</span> {d.code} {d.message}</li>)}</ul>
                  ) : null}
                  {sel ? (
                    <details className="mt-2"><summary className="cursor-pointer font-semibold">Why these tests</summary>
                      {sel.kind === "some" ? <ul className="mt-1 grid gap-1 text-xs">{sel.tests!.map((t) => <li key={t.file}><code>{t.file}</code> — {t.reason}</li>)}</ul> : <p className="mt-1 text-xs">{sel.reason}</p>}
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : <div className="p-5"><EmptyState title="No checks have run yet" /></div>}
      </section>
    </div>
  );
}
