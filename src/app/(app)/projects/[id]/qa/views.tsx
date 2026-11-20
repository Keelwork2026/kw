import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, Notice, timeAgo } from "@/components/page-header";
import { Bar, MethodTag, ReleaseBadge, ResultChip, ScoreRing, SeverityChip, Sparkline } from "@/components/qa/ui";
import { CATEGORIES, CATEGORY_INFO, METHOD_LABEL, METHODS, RELEASE_LABEL, SEVERITIES, type Category, type Evidence, type Result, type ReleaseStatus, type Settings } from "@/lib/qa/types";
import { AREAS, compare, WEIGHT_PRESETS } from "@/lib/qa/score";
import type { JourneyOutcome } from "@/lib/qa/analyze";
import { acceptRisk, addPersona, approveRelease, askAgentsToFix, authorizePentest, deletePersona, retestIssue, runQa, saveQaSettings, setIssueStatus, stopQa } from "./actions";

export type RunRow = {
  id: string; mode: string; status: string; trigger: string; categories: string[]; scope: Record<string, unknown>; progress: { phase?: string; done?: number; total?: number; waiting?: number; results?: number };
  scores: { overall: { value: number | null; basis: string; explain: string; executed: number; total: number }; areas: { key: string; label: string; value: number | null; basis: string; executed: number; total: number; weight: number; explain: string }[]; coverage: number; counts?: Record<string, number> } | null;
  readiness: { status: ReleaseStatus; reasons: string[]; blocking: string[] } | null;
  comparison: { previousRun: string; newFailures: { key: string; name: string; category: string; severity: string }[]; fixed: { key: string; name: string }[]; stillFailing: { key: string; name: string }[]; newTests: number; removed: number; scoreDelta: number | null } | null;
  commit: string | null; error: string | null; created_at: string; started_at: string | null; finished_at: string | null; approved_at: string | null; approval_note: string | null; stop_requested: boolean;
};
export type IssueRow = {
  id: string; ref: number; fingerprint: string; title: string; category: Category; rule: string; test_key: string | null; severity: string; priority: string; confidence: string; status: string;
  description: string; impact: string; recommendation: string; verify: string; target: string | null; wcag: string | null; evidence: Evidence[]; history: { at: string; from: string; to: string; note: string }[];
  accepted_reason: string | null; accepted_expires: string | null; accepted_at: string | null; first_run: string | null; last_run: string | null; last_seen: string; created_at: string; updated_at: string;
};
export type Ctx = {
  project: { id: string; name: string }; can: { write: boolean; manage: boolean };
  runs: RunRow[]; active: RunRow | null; latest: RunRow | null; selectedRunId: string | null;
  results: (Result & { issue_id: string | null })[]; issues: IssueRow[]; settings: Settings;
  personas: { id: string; name: string; description: string; goal: string }[];
  detail: { id: string; profile: unknown; outcomes: unknown; log: string | null } | null;
  sandboxRunning: boolean; sp: Record<string, string | undefined>;
};

const OPEN = ["new", "confirmed", "in_progress", "awaiting_review", "fixed", "awaiting_retest", "reopened"];
const base = (ctx: Ctx) => `/projects/${ctx.project.id}/qa`;
const Hidden = ({ ctx }: { ctx: Ctx }) => <input type="hidden" name="projectId" value={ctx.project.id} />;
const MODE_LABEL: Record<string, string> = { quick: "Quick QA", full: "Full QA", predeploy: "Pre-deployment QA", regression: "Regression", custom: "Custom" };

function Section({ title, id, children, action, sub }: { title: string; id?: string; children: React.ReactNode; action?: React.ReactNode; sub?: string }) {
  return (
    <section className="panel p-5" aria-labelledby={id ?? title.replace(/\W+/g, "-").toLowerCase()} id={id}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id={id ?? title.replace(/\W+/g, "-").toLowerCase()} className="text-lg">{title}</h2>{sub ? <p className="mt-0.5 text-sm text-muted">{sub}</p> : null}</div>{action}</div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Run controls and live progress                                       */
/* ------------------------------------------------------------------ */

function RunControls({ ctx, compact = false }: { ctx: Ctx; compact?: boolean }) {
  if (!ctx.can.write) return <p className="text-sm text-muted">You have read-only access, so you can see results but not start runs.</p>;
  if (ctx.active) return null;
  const btn = (mode: string, label: string, primary = false, hint = "") => (
    <ActionForm key={mode} action={runQa} submitLabel={label} pendingLabel="Queuing…" submitClassName={`btn min-h-10 ${primary ? "btn-gradient" : "btn-secondary"}`}>
      <Hidden ctx={ctx} /><input type="hidden" name="mode" value={mode} />{hint ? <span className="sr-only">{hint}</span> : null}
    </ActionForm>
  );
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start gap-2">
        {btn("quick", "Run Quick QA", true, "Core pages, links, build, basic security, accessibility and layout")}
        {btn("full", "Run Full QA", false, "Every category, including browser, load (if enabled), personas and pentest (if authorised)")}
        {btn("predeploy", "Pre-deployment QA")}
        {btn("regression", "Regression (changed code)")}
      </div>
      {!compact && (
        <details className="rounded-2xl border border-border p-3">
          <summary className="cursor-pointer text-sm font-semibold">Custom run — choose categories, pages or endpoints</summary>
          <ActionForm action={runQa} submitLabel="Run selected tests" submitClassName="btn btn-primary min-h-10" className="mt-3 grid gap-3">
            <Hidden ctx={ctx} /><input type="hidden" name="mode" value="custom" />
            <fieldset><legend className="text-sm font-semibold">Categories</legend>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">{CATEGORIES.map((c) => <label key={c} className="flex items-start gap-2 text-sm" title={CATEGORY_INFO[c].about}><input type="checkbox" name="category" value={c} className="mt-1" />{CATEGORY_INFO[c].label}</label>)}</div>
            </fieldset>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">Only these pages <span className="font-normal text-muted">e.g. /checkout /cart</span><input name="pages" className="input" placeholder="/checkout" /></label>
              <label className="grid gap-1 text-sm font-semibold">Only these endpoints <span className="font-normal text-muted">e.g. /api/orders</span><input name="endpoints" className="input" placeholder="/api/orders" /></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="changedOnly" /> Only test code that changed since the last completed run</label>
          </ActionForm>
        </details>
      )}
    </div>
  );
}

function Live({ ctx }: { ctx: Ctx }) {
  const r = ctx.active!;
  const p = r.progress ?? {};
  return (
    <section className="panel border-accent p-5" aria-live="polite" aria-labelledby="live">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="kw-live h-2.5 w-2.5 rounded-full bg-accent" />
        <h2 id="live" className="text-lg">{MODE_LABEL[r.mode] ?? r.mode} {r.status === "queued" ? "is queued" : "is running"}</h2>
        <span className="text-sm text-muted">started {timeAgo(r.started_at ?? r.created_at)} · {r.categories.length} categories · environment: project sandbox</span>
        {ctx.can.write && !r.stop_requested ? <ActionForm action={stopQa} submitLabel="Stop" pendingLabel="Stopping…" submitClassName="btn btn-secondary min-h-9 ml-auto"><Hidden ctx={ctx} /><input type="hidden" name="runId" value={r.id} /></ActionForm> : null}
      </div>
      <div className="mt-4"><Bar value={p.done ?? 0} max={p.total ?? 8} label={`Step ${p.done ?? 0} of ${p.total ?? 8}`} /></div>
      <p className="mt-2 text-sm"><b>{r.status === "queued" ? "Waiting for the worker to pick it up" : p.phase ?? "Starting"}</b>{p.waiting ? ` — waiting for ${p.waiting} project check(s)` : ""}{r.stop_requested ? " · stopping after this step" : ""}</p>
      <p className="mt-1 text-xs text-muted">Progress reflects real steps the worker has completed. <Link href={`${base(ctx)}?view=log&run=${r.id}`} className="font-semibold text-accent">View the log</Link></p>
      {!ctx.sandboxRunning ? <p className="mt-2 text-xs text-muted">The sandbox isn&apos;t marked running; the worker will try to start it. Checks that need the running app are recorded as blocked if it can&apos;t.</p> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                             */
/* ------------------------------------------------------------------ */

export function Overview({ ctx }: { ctx: Ctx }) {
  const r = ctx.latest;
  if (!r && !ctx.active) {
    return (
      <div className="panel grid justify-items-center gap-4 p-10 text-center">
        <h2 className="text-2xl">Your application hasn&apos;t been tested yet.</h2>
        <p className="max-w-xl text-muted">Keelwork can analyse your application, discover its pages, endpoints and journeys, build a test plan, and run a quality assessment — functional, security, accessibility, performance, UX and more — against the running app in its sandbox.</p>
        <RunControls ctx={ctx} compact />
        <p className="flex flex-wrap justify-center gap-4 text-sm"><Link className="font-semibold text-accent" href={`${base(ctx)}?view=settings`}>Configure testing</Link><Link className="font-semibold text-accent" href="/docs#testing">Testing guide</Link></p>
      </div>
    );
  }
  const sc = r?.scores;
  const counts = sc?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const open = ctx.issues.filter((i) => OPEN.includes(i.status));
  const sevCount = (s: string) => open.filter((i) => i.severity === s).length;
  const status = (ctx.active ? "in_progress" : r?.readiness?.status) ?? "not_tested";
  const history = ctx.runs.filter((x) => x.status === "completed").slice(0, 10).reverse().map((x) => x.scores?.overall.value ?? null);
  const methods = METHODS.map((m) => [m, ctx.results.filter((x) => x.method === m).length] as const).filter(([, n]) => n);
  const top = open.filter((i) => i.priority === "P0" || i.priority === "P1").slice(0, 6);
  return (
    <div className="grid gap-6">
      {ctx.active ? <Live ctx={ctx} /> : null}
      <section className="panel grid gap-6 p-6 lg:grid-cols-[1.2fr_1fr]" aria-labelledby="release-h">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Release readiness</p>
          <h2 id="release-h" className="mt-2"><ReleaseBadge s={status} large /></h2>
          {r?.readiness?.reasons?.length ? <ul className="mt-4 grid gap-1.5 text-sm">{r.readiness.reasons.slice(0, 5).map((x) => <li key={x} className="flex gap-2"><span aria-hidden>•</span>{x}</li>)}</ul> : null}
          <p className="mt-3 text-xs text-muted">{r ? `Last run: ${MODE_LABEL[r.mode] ?? r.mode}, ${timeAgo(r.finished_at ?? r.created_at)}${r.commit ? ` · version ${r.commit.slice(0, 8)}` : ""}${r.status !== "completed" ? ` · ${r.status}` : ""}` : ""} · <Link href={`${base(ctx)}?view=readiness`} className="font-semibold text-accent">Why this status</Link></p>
          <div className="mt-5"><RunControls ctx={ctx} /></div>
        </div>
        <div className="grid content-start justify-items-center gap-3 rounded-3xl bg-surface-2 p-5">
          <ScoreRing value={sc?.overall.value ?? null} label="Overall quality" basis={sc?.overall.basis ?? "unavailable"} size={150} />
          <p className="text-center text-xs text-muted">{sc ? `${sc.coverage}% of weighted areas measured. ${sc.overall.explain}` : "No scores yet."}</p>
          <Sparkline points={history} />
        </div>
      </section>

      {sc ? (
        <Section title="Quality by area" sub="Each score uses only checks that actually ran. “Not run” areas aren't counted as passes.">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sc.areas.map((a) => (
              <li key={a.key} className="rounded-2xl border border-border p-4" title={a.explain}>
                <div className="flex items-baseline justify-between gap-2"><span className="text-sm font-semibold">{a.label}</span><span className="text-xl font-bold">{a.value ?? "—"}</span></div>
                <div className="mt-2"><Bar value={a.value ?? 0} max={100} colour={a.value === null ? "var(--border)" : a.value >= 85 ? "var(--success)" : a.value >= 65 ? "#f59e0b" : "var(--danger)"} label={`${a.label} ${a.value ?? "not measured"}`} /></div>
                <p className="mt-2 text-xs text-muted">{a.basis} · {a.executed} of {a.total} checks ran · weight {a.weight}%</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Tests in the last run" action={<Link href={`${base(ctx)}?view=tests`} className="text-sm font-semibold text-accent">All results →</Link>}>
          <dl className="grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
            {[["Total", total], ["Passed", counts.passed ?? 0], ["Failed", counts.failed ?? 0], ["Blocked", counts.blocked ?? 0], ["Not run", (counts.not_run ?? 0) + (counts.skipped ?? 0)], ["Running", ctx.active ? 1 : 0]].map(([k, v]) => <div key={k as string} className="rounded-xl bg-surface-2 p-2"><dt className="text-[11px] text-muted">{k}</dt><dd className="text-lg font-bold">{v}</dd></div>)}
          </dl>
          <p className="mt-3 text-xs text-muted">How results were obtained: {methods.length ? methods.map(([m, n]) => `${METHOD_LABEL[m]} ${n}`).join(" · ") : "—"}</p>
        </Section>
        <Section title="Issues" action={<Link href={`${base(ctx)}?view=issues`} className="text-sm font-semibold text-accent">Manage issues →</Link>}>
          <dl className="grid grid-cols-5 gap-2 text-center">
            {SEVERITIES.map((s) => <div key={s} className="rounded-xl bg-surface-2 p-2"><dt className="text-[11px] capitalize text-muted">{s}</dt><dd className="text-lg font-bold">{sevCount(s)}</dd></div>)}
          </dl>
          <p className="mt-3 text-sm">{open.length} open · {ctx.issues.filter((i) => i.status === "verified").length} verified · {ctx.issues.filter((i) => i.status === "reopened").length} reopened · {ctx.issues.filter((i) => ["fixed", "awaiting_retest"].includes(i.status)).length} awaiting verification · {ctx.issues.filter((i) => i.status === "accepted_risk").length} accepted risks</p>
        </Section>
      </div>

      {top.length ? (
        <Section title="Fix these first" sub="P0 and P1 issues — release blockers and high-impact problems.">
          <ul className="grid gap-2">{top.map((i) => <li key={i.id}><Link href={`${base(ctx)}?view=issues&issue=${i.id}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3 hover:border-accent"><span className="font-mono text-xs text-muted">QA-{i.ref}</span><SeverityChip s={i.severity} /><span className="pill bg-surface-2">{i.priority}</span><span className="font-semibold">{i.title}</span><span className="ml-auto text-xs text-muted">{CATEGORY_INFO[i.category]?.label}</span></Link></li>)}</ul>
        </Section>
      ) : null}

      {r?.comparison ? <ComparisonBlock ctx={ctx} c={r.comparison} /> : null}
    </div>
  );
}

function ComparisonBlock({ ctx, c }: { ctx: Ctx; c: NonNullable<RunRow["comparison"]> }) {
  return (
    <Section title="Compared with the previous run" action={<Link href={`${base(ctx)}?view=history`} className="text-sm font-semibold text-accent">History →</Link>}>
      <div className="grid gap-4 md:grid-cols-3">
        <div><p className="text-sm font-semibold text-danger">New failures ({c.newFailures.length})</p><ul className="mt-1 grid gap-1 text-sm">{c.newFailures.slice(0, 8).map((x) => <li key={x.key}>{x.name}</li>)}{!c.newFailures.length && <li className="text-muted">None</li>}</ul></div>
        <div><p className="text-sm font-semibold text-success">Fixed ({c.fixed.length})</p><ul className="mt-1 grid gap-1 text-sm">{c.fixed.slice(0, 8).map((x) => <li key={x.key}>{x.name}</li>)}{!c.fixed.length && <li className="text-muted">None</li>}</ul></div>
        <div><p className="text-sm font-semibold">Still failing ({c.stillFailing.length})</p><p className="mt-1 text-sm text-muted">Score change: {c.scoreDelta === null ? "—" : `${c.scoreDelta > 0 ? "+" : ""}${c.scoreDelta}`} · {c.newTests} new checks · {c.removed} no longer run</p></div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Test plan / application profile                                     */
/* ------------------------------------------------------------------ */

type ProfileJson = { appType: string; appTypeReason: string; framework: string; backend: string | null; routes: { path: string; file: string; kind: string; methods?: string[]; dynamic: boolean; auth?: string }[]; components: number; forms: { file: string; fields: number; hasSubmit: boolean }[]; integrations: string[]; dependencies: number; tables: string[]; auth: { present: boolean; provider: string | null; roles: string[] }; payments: boolean; uploads: boolean; highRisk: string[]; journeys: { key: string; name: string; goal: string; steps: { label: string }[] }[]; priorities: string[]; unknowns: string[] };

export function PlanView({ ctx }: { ctx: Ctx }) {
  const p = ctx.detail?.profile as ProfileJson | null | undefined;
  if (!p) return <EmptyState title="No application profile yet">Run Quick QA and Keelwork inspects the project — routes, endpoints, forms, auth, integrations and database — and builds a test plan from what it finds.<div className="mt-4 flex justify-center"><RunControls ctx={ctx} compact /></div></EmptyState>;
  const pages = p.routes.filter((r) => r.kind === "page");
  const apis = p.routes.filter((r) => r.kind === "api");
  return (
    <div className="grid gap-6">
      <Section title="Application testing profile" sub="Worked out from the project's code in the last run. Nothing here is assumed beyond what the code shows.">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Application type", `${p.appType}`, p.appTypeReason], ["Framework", p.framework, p.backend ? `Backend: ${p.backend}` : ""], ["Pages and endpoints", `${pages.length} pages · ${apis.length} endpoints`, `${p.components} component files · ${p.dependencies} packages`], ["Sign-in", p.auth.present ? p.auth.provider ?? "Yes" : "None found", p.auth.roles.length ? `Roles: ${p.auth.roles.join(", ")}` : "No role checks found"]].map(([k, v, s]) => <div key={k} className="rounded-2xl bg-surface-2 p-4"><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 font-semibold capitalize">{v}</dd>{s ? <dd className="mt-1 text-xs text-muted">{s}</dd> : null}</div>)}
        </dl>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div><h3 className="text-sm font-semibold">High-risk functionality</h3><ul className="mt-1 grid gap-1 text-sm">{p.highRisk.length ? p.highRisk.map((h) => <li key={h}>⚠ {h}</li>) : <li className="text-muted">None found</li>}</ul></div>
          <div><h3 className="text-sm font-semibold">Integrations</h3><ul className="mt-1 grid gap-1 text-sm">{p.integrations.length ? p.integrations.map((h) => <li key={h}>{h}</li>) : <li className="text-muted">None found</li>}</ul></div>
          <div><h3 className="text-sm font-semibold">Database</h3><p className="mt-1 text-sm">{p.tables.length ? `${p.tables.length} tables: ${p.tables.slice(0, 8).join(", ")}${p.tables.length > 8 ? "…" : ""}` : "No migrations found"}</p></div>
        </div>
      </Section>
      <Section title="Recommended test plan" sub={`Priorities for a ${p.appType} app, in order.`} action={ctx.can.write && !ctx.active ? (
        <ActionForm action={runQa} submitLabel="Run recommended tests" submitClassName="btn btn-primary min-h-10"><Hidden ctx={ctx} /><input type="hidden" name="mode" value="custom" />{p.priorities.map((c) => <input key={c} type="hidden" name="category" value={c} />)}</ActionForm>
      ) : null}>
        <ol className="grid gap-2 md:grid-cols-2">{p.priorities.map((c, i) => <li key={c} className="rounded-xl border border-border p-3 text-sm"><b>{i + 1}. {CATEGORY_INFO[c as Category]?.label ?? c}</b><br /><span className="text-muted">{CATEGORY_INFO[c as Category]?.about}</span></li>)}</ol>
      </Section>
      {p.unknowns.length ? (
        <Section title="Business rules to confirm" sub="Keelwork never invents expected behaviour. Document these (in the project description or the plan) so they can be tested.">
          <ul className="grid gap-1.5 text-sm">{p.unknowns.map((u) => <li key={u}>? {u}</li>)}</ul>
        </Section>
      ) : null}
      <Section title="User journeys" sub="Checked step by step against real pages and links.">
        <ul className="grid gap-2">{p.journeys.map((j) => <li key={j.key} className="rounded-xl border border-border p-3 text-sm"><b>{j.name}</b> — {j.goal}<br /><span className="text-muted">{j.steps.map((s) => s.label).join(" → ")}</span></li>)}{!p.journeys.length && <li className="text-sm text-muted">No journeys apply to an API-only project.</li>}</ul>
      </Section>
      <Section title={`Routes (${p.routes.length})`} sub="Test a single page or endpoint from here.">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted"><th className="py-2 pr-3">Path</th><th className="pr-3">Kind</th><th className="pr-3">Methods</th><th className="pr-3">Sign-in check</th><th className="pr-3">File</th><th></th></tr></thead>
          <tbody>{p.routes.map((r) => <tr key={r.kind + r.path} className="border-t border-border"><td className="py-2 pr-3 font-mono text-xs">{r.path}</td><td className="pr-3">{r.kind}</td><td className="pr-3 text-xs">{r.methods?.join(", ") ?? "GET"}</td><td className="pr-3 text-xs">{r.auth === "protected" ? "Yes" : "Not found"}</td><td className="pr-3 font-mono text-[11px] text-muted">{r.file}</td><td>{ctx.can.write && !ctx.active && !r.dynamic ? <ActionForm action={runQa} submitLabel="Test" submitClassName="text-xs font-semibold text-accent"><Hidden ctx={ctx} /><input type="hidden" name="mode" value="custom" /><input type="hidden" name={r.kind === "api" ? "endpoints" : "pages"} value={r.path} />{(r.kind === "api" ? ["api", "security", "performance"] : ["functional", "accessibility", "ux", "security", "performance", "responsive"]).map((c) => <input key={c} type="hidden" name="category" value={c} />)}</ActionForm> : null}</td></tr>)}</tbody></table></div>
      </Section>
      {p.forms.length ? <Section title={`Forms (${p.forms.length})`}><ul className="grid gap-1 text-sm">{p.forms.map((f) => <li key={f.file} className="font-mono text-xs">{f.file} — {f.fields} field(s){f.hasSubmit ? "" : " · no submit handler found"}</li>)}</ul></Section> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                              */
/* ------------------------------------------------------------------ */

function EvidenceList({ ev }: { ev: Evidence[] }) {
  if (!ev?.length) return <p className="text-xs text-muted">No evidence recorded.</p>;
  return (
    <ul className="grid gap-2">
      {ev.map((e, i) => (
        <li key={i} className="rounded-xl bg-surface-2 p-2.5 text-xs">
          {e.kind === "code" && <p className="font-mono">{e.file}{e.line ? `:${e.line}` : ""}{e.snippet ? <><br /><span className="text-muted">{e.snippet}</span></> : null}</p>}
          {e.kind === "http" && <p className="font-mono">{e.method} {e.url} → {e.status ?? "no response"}{e.ms !== undefined ? ` · ${e.ms} ms` : ""}{e.headers ? <><br /><span className="text-muted">{Object.entries(e.headers).map(([k, v]) => `${k}: ${v}`).join(" | ") || "no security headers"}</span></> : null}{e.body ? <><br /><span className="text-muted">{e.body}</span></> : null}</p>}
          {e.kind === "measure" && <p>{e.name}: <b>{e.value ?? "—"} {e.unit}</b>{e.note ? <span className="text-muted"> · {e.note}</span> : null}</p>}
          {e.kind === "log" && <pre className="whitespace-pre-wrap font-mono">{e.text}</pre>}
          {e.kind === "html" && <p><span className="font-mono">{e.page}</span>: <span className="text-muted">{e.snippet}</span></p>}
          {e.kind === "screenshot" && e.dataUrl && /^data:image\/(jpeg|png);base64,/.test(e.dataUrl) ? <figure className="m-0"><img src={e.dataUrl} alt={`Screenshot of ${e.page} at ${e.viewport}px`} className="max-h-72 rounded-lg border border-border" /><figcaption className="text-muted">{e.page} @ {e.viewport}px</figcaption></figure> : null}
        </li>
      ))}
    </ul>
  );
}

export function TestsView({ ctx }: { ctx: Ctx }) {
  const cat = CATEGORIES.includes(ctx.sp.category as Category) ? (ctx.sp.category as Category) : null;
  const statusF = ctx.sp.status ?? "";
  const rs = ctx.results.filter((r) => (!cat || r.category === cat) && (!statusF || r.status === statusF)).sort((a, b) => (a.status === "failed" ? -1 : 0) - (b.status === "failed" ? -1 : 0) || SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));
  const href = (c: string | null, s = statusF) => `${base(ctx)}?view=tests${c ? `&category=${c}` : ""}${s ? `&status=${s}` : ""}${ctx.sp.run ? `&run=${ctx.sp.run}` : ""}`;
  const run = ctx.runs.find((r) => r.id === ctx.selectedRunId);
  if (!run) return <EmptyState title="No results yet">Run QA to see results here.<div className="mt-4 flex justify-center"><RunControls ctx={ctx} compact /></div></EmptyState>;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-muted">Run:</span><span className="font-semibold">{MODE_LABEL[run.mode]} · {new Date(run.created_at).toUTCString().slice(5, 22)} UTC</span>{ctx.sp.run ? <Link href={`${base(ctx)}?view=tests`} className="text-accent">Latest run</Link> : null}</div>
      <nav aria-label="Categories" className="flex flex-wrap gap-1.5">
        <Link href={href(null)} aria-current={!cat ? "page" : undefined} className={`pill ${!cat ? "bg-brand text-brand-contrast" : "border border-border"}`}>All ({ctx.results.length})</Link>
        {CATEGORIES.map((c) => { const n = ctx.results.filter((r) => r.category === c); const f = n.filter((r) => r.status === "failed").length; return <Link key={c} href={href(c)} aria-current={cat === c ? "page" : undefined} className={`pill ${cat === c ? "bg-brand text-brand-contrast" : "border border-border"}`}>{CATEGORY_INFO[c].label} {n.length ? `(${n.length}${f ? `, ${f} failed` : ""})` : "· not run"}</Link>; })}
      </nav>
      <div className="flex flex-wrap gap-1.5 text-xs">{["", "failed", "passed", "blocked", "not_run", "skipped"].map((s) => <Link key={s || "any"} href={href(cat, s)} className={`rounded-full px-2.5 py-1 font-semibold ${statusF === s ? "bg-surface-2" : "text-muted"}`}>{s ? s.replace("_", " ") : "Any status"}</Link>)}</div>
      {cat ? (
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div><h2 className="text-lg">{CATEGORY_INFO[cat].label} testing</h2><p className="text-sm text-muted">{CATEGORY_INFO[cat].about}</p></div>
          {ctx.can.write && !ctx.active ? <ActionForm action={runQa} submitLabel={`Run ${CATEGORY_INFO[cat].label.toLowerCase()} checks`} submitClassName="btn btn-primary min-h-10"><Hidden ctx={ctx} /><input type="hidden" name="mode" value="custom" /><input type="hidden" name="category" value={cat} /></ActionForm> : null}
        </div>
      ) : null}
      {rs.length ? (
        <ul className="panel divide-y divide-border">
          {rs.map((r) => (
            <li key={r.key}>
              <details className="group p-4">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                  <ResultChip s={r.status} /><span className="font-semibold">{r.name}</span><MethodTag m={r.method} />
                  <span className="ml-auto flex items-center gap-2 text-xs text-muted">{CATEGORY_INFO[r.category].label}{r.status === "failed" ? <SeverityChip s={r.severity} /> : null}</span>
                </summary>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                  <div className="grid gap-1.5">
                    <p><span className="text-muted">ID:</span> <code className="text-xs">{r.key}</code></p>
                    <p><span className="text-muted">Objective:</span> {r.objective}</p>
                    {r.steps?.length ? <div><span className="text-muted">Steps:</span><ol className="ml-5 list-decimal">{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div> : null}
                    <p><span className="text-muted">Expected:</span> {r.expected}</p>
                    <p><span className="text-muted">Actual:</span> <b>{r.actual}</b></p>
                    {r.target ? <p><span className="text-muted">Target:</span> <code className="text-xs">{r.target}</code></p> : null}
                    <p className="text-xs text-muted">{METHOD_LABEL[r.method]} · environment: project sandbox</p>
                    {r.issue_id ? <Link href={`${base(ctx)}?view=issues&issue=${r.issue_id}`} className="font-semibold text-accent">Open the issue →</Link> : null}
                  </div>
                  <div><p className="mb-1.5 text-xs font-semibold text-muted">Evidence</p><EvidenceList ev={r.evidence} /></div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : <EmptyState title={cat ? `No ${CATEGORY_INFO[cat].label.toLowerCase()} results in this run` : "No results match"}>{cat ? "This category wasn't part of the run. Run it on its own with the button above." : "Try another filter."}</EmptyState>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Issues                                                               */
/* ------------------------------------------------------------------ */

export function IssuesView({ ctx }: { ctx: Ctx }) {
  const { status = "open", severity = "", category = "", q = "", sort = "priority", group = "" } = ctx.sp;
  let list = ctx.issues.filter((i) => (status === "open" ? OPEN.includes(i.status) : status === "all" ? true : i.status === status) && (!severity || i.severity === severity) && (!category || i.category === category) && (!q || `${i.title} ${i.description} ${i.target ?? ""} QA-${i.ref}`.toLowerCase().includes(q.toLowerCase())));
  list = [...list].sort((a, b) => sort === "newest" ? b.created_at.localeCompare(a.created_at) : sort === "updated" ? b.updated_at.localeCompare(a.updated_at) : a.priority.localeCompare(b.priority) || SEVERITIES.indexOf(a.severity as never) - SEVERITIES.indexOf(b.severity as never));
  const groups = group === "category" ? [...new Set(list.map((i) => i.category))].map((c) => [CATEGORY_INFO[c]?.label ?? c, list.filter((i) => i.category === c)] as const) : group === "priority" ? ["P0", "P1", "P2", "P3", "P4"].map((p) => [p, list.filter((i) => i.priority === p)] as const).filter(([, l]) => l.length) : [["", list] as const];
  return (
    <div className="grid gap-5">
      <form className="panel grid gap-3 p-4 md:grid-cols-6" role="search">
        <input type="hidden" name="view" value="issues" />
        <label className="grid gap-1 text-xs font-semibold md:col-span-2">Search<input name="q" defaultValue={q} className="input" placeholder="Title, page, QA-12…" /></label>
        <label className="grid gap-1 text-xs font-semibold">Status<select name="status" defaultValue={status} className="input"><option value="open">Open</option><option value="all">All</option>{["new", "confirmed", "in_progress", "awaiting_review", "fixed", "awaiting_retest", "verified", "reopened", "rejected", "false_positive", "accepted_risk"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-semibold">Severity<select name="severity" defaultValue={severity} className="input"><option value="">Any</option>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-semibold">Category<select name="category" defaultValue={category} className="input"><option value="">Any</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_INFO[c].label}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2"><label className="grid gap-1 text-xs font-semibold">Sort<select name="sort" defaultValue={sort} className="input"><option value="priority">Priority</option><option value="newest">Newest</option><option value="updated">Updated</option></select></label><label className="grid gap-1 text-xs font-semibold">Group<select name="group" defaultValue={group} className="input"><option value="">None</option><option value="category">Category</option><option value="priority">Priority</option></select></label></div>
        <div className="flex flex-wrap items-center gap-3 md:col-span-6"><button className="btn btn-secondary min-h-9">Apply</button><a className="text-sm font-semibold text-accent" href={`/projects/${ctx.project.id}/qa/report?kind=issues&format=csv`}>Export issues (CSV)</a></div>
      </form>
      {list.length ? (
        <ActionForm action={askAgentsToFix} submitLabel="Ask the agents to fix the selected issues" submitClassName={`btn btn-gradient min-h-10 ${ctx.can.write ? "" : "hidden"}`} className="grid gap-4">
          <Hidden ctx={ctx} />
          {groups.map(([label, items]) => (
            <section key={label || "all"} aria-label={label || "Issues"}>
              {label ? <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">{label} ({items.length})</h2> : null}
              <ul className="panel divide-y divide-border">
                {items.map((i) => (
                  <li key={i.id} className="flex items-start gap-3 p-4">
                    {ctx.can.write && OPEN.includes(i.status) ? <input type="checkbox" name="issueId" value={i.id} aria-label={`Select QA-${i.ref}`} className="mt-1.5" /> : <span className="w-[13px]" />}
                    <div className="min-w-0 flex-1">
                      <Link href={`${base(ctx)}?view=issues&issue=${i.id}`} className="font-semibold hover:underline">{i.title}</Link>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted"><span className="font-mono">QA-{i.ref}</span><SeverityChip s={i.severity} /><span className="pill bg-surface-2">{i.priority}</span><span>{i.status.replace(/_/g, " ")}</span><span>· {CATEGORY_INFO[i.category]?.label}</span><span>· {i.confidence.replace("_", " ")}</span>{i.target ? <span className="font-mono">· {i.target}</span> : null}<span>· seen {timeAgo(i.last_seen)}</span></p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {ctx.can.write ? <label className="grid gap-1 text-sm font-semibold">Note for the agents (optional)<input name="note" className="input" maxLength={1000} placeholder="e.g. keep the current colours" /></label> : null}
          <p className="text-xs text-muted">The planner proposes a plan first; nothing changes until you approve it on the Build tab. Afterwards, retest the issues here.</p>
        </ActionForm>
      ) : <EmptyState title={status === "open" ? "No open issues" : "No issues match"}>{ctx.issues.length ? "Try another filter." : "Issues appear here when a QA run finds problems."}</EmptyState>}
    </div>
  );
}

export function IssueDetail({ ctx, id }: { ctx: Ctx; id: string }) {
  const i = ctx.issues.find((x) => x.id === id);
  if (!i) return <EmptyState title="Issue not found"><Link href={`${base(ctx)}?view=issues`} className="text-accent">Back to issues</Link></EmptyState>;
  const isOpen = OPEN.includes(i.status);
  const soon = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-6">
        <section className="panel p-5">
          <Link href={`${base(ctx)}?view=issues`} className="text-sm font-semibold text-muted">← Issues</Link>
          <h2 className="mt-2 text-2xl">{i.title}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm"><span className="font-mono text-muted">QA-{i.ref}</span><SeverityChip s={i.severity} /><span className="pill bg-surface-2">{i.priority}</span><span className="pill bg-surface-2">{i.status.replace(/_/g, " ")}</span><span className="pill bg-surface-2">{i.confidence.replace("_", " ")}</span><span className="text-muted">{CATEGORY_INFO[i.category]?.label}{i.wcag ? ` · WCAG ${i.wcag}` : ""}</span></p>
          <dl className="mt-5 grid gap-4 text-sm">
            <div><dt className="font-semibold">What&apos;s wrong</dt><dd className="mt-1">{i.description}</dd></div>
            <div><dt className="font-semibold">Why it matters</dt><dd className="mt-1">{i.impact}</dd></div>
            {i.target ? <div><dt className="font-semibold">Where</dt><dd className="mt-1 font-mono text-xs">{i.target}</dd></div> : null}
            <div><dt className="font-semibold">How to fix it</dt><dd className="mt-1">{i.recommendation}</dd></div>
            <div><dt className="font-semibold">How to verify</dt><dd className="mt-1">{i.verify}</dd></div>
          </dl>
        </section>
        <Section title="Evidence"><EvidenceList ev={i.evidence} /></Section>
        <Section title="History">
          <ol className="grid gap-2 text-sm">
            <li>Found {new Date(i.created_at).toUTCString().slice(5, 22)} UTC{i.first_run ? <> in <Link className="text-accent" href={`${base(ctx)}?view=tests&run=${i.first_run}`}>run {i.first_run.slice(0, 8)}</Link></> : null}</li>
            {i.history.map((h, k) => <li key={k}>{new Date(h.at).toUTCString().slice(5, 22)} — {h.from?.replace(/_/g, " ")} → <b>{h.to.replace(/_/g, " ")}</b>{h.note ? ` · ${h.note}` : ""}</li>)}
            <li className="text-muted">Last seen {timeAgo(i.last_seen)}{i.last_run ? <> in <Link className="text-accent" href={`${base(ctx)}?view=tests&run=${i.last_run}`}>run {i.last_run.slice(0, 8)}</Link></> : null}</li>
          </ol>
          {i.status === "accepted_risk" ? <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">Accepted risk: {i.accepted_reason} · review by {i.accepted_expires}</p> : null}
        </Section>
      </div>
      <aside className="grid content-start gap-4">
        {ctx.can.write ? (
          <>
            {isOpen ? <ActionForm action={askAgentsToFix} submitLabel="Ask the agents to fix this" submitClassName="btn btn-gradient w-full min-h-10" className="panel p-4"><Hidden ctx={ctx} /><input type="hidden" name="issueId" value={i.id} /><p className="text-sm text-muted">Sends a scoped request to the planner. You review and approve the plan (the preview of the change) on the Build tab before anything is applied.</p></ActionForm> : null}
            <ActionForm action={retestIssue} submitLabel="Retest now" submitClassName="btn btn-secondary w-full min-h-10" className="panel p-4"><Hidden ctx={ctx} /><input type="hidden" name="issueId" value={i.id} /><p className="text-sm text-muted">Re-runs the {CATEGORY_INFO[i.category]?.label.toLowerCase()} checks plus regression. A pass marks the issue verified automatically.</p></ActionForm>
            <ActionForm action={setIssueStatus} submitLabel="Update status" submitClassName="btn btn-secondary min-h-9" className="panel grid gap-2 p-4">
              <Hidden ctx={ctx} /><input type="hidden" name="issueId" value={i.id} />
              <label className="grid gap-1 text-sm font-semibold">Status<select name="status" defaultValue={["verified", "reopened", "accepted_risk"].includes(i.status) ? "confirmed" : i.status} className="input">{["new", "confirmed", "in_progress", "awaiting_review", "fixed", "awaiting_retest", "rejected", "false_positive"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></label>
              <label className="grid gap-1 text-sm font-semibold">Note <span className="font-normal text-muted">(required for rejected / false positive)</span><input name="note" className="input" maxLength={500} /></label>
            </ActionForm>
          </>
        ) : null}
        {ctx.can.manage && isOpen ? (
          <ActionForm action={acceptRisk} submitLabel="Accept the risk" submitClassName="btn btn-secondary min-h-9" className="panel grid gap-2 p-4" confirm="Accept this risk? It's recorded in the audit log with your name.">
            <Hidden ctx={ctx} /><input type="hidden" name="issueId" value={i.id} />
            <p className="text-sm text-muted">For a known issue you&apos;ve decided to live with for now. {i.severity === "critical" ? "Critical risks must be reviewed within 90 days." : ""}</p>
            <label className="grid gap-1 text-sm font-semibold">Reason<textarea name="reason" required minLength={10} rows={3} className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold">Review by<input type="date" name="expires" required defaultValue={soon} className="input" /></label>
          </ActionForm>
        ) : null}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Journeys, personas, devices                                          */
/* ------------------------------------------------------------------ */

export function JourneysView({ ctx }: { ctx: Ctx }) {
  const outcomes = ((ctx.detail?.outcomes as { journeys?: JourneyOutcome[] } | null)?.journeys ?? []) as JourneyOutcome[];
  if (!outcomes.length) return <EmptyState title="No journey results yet">Journeys are checked in Full QA and Pre-deployment QA (or choose “User journeys” in a custom run).<div className="mt-4 flex justify-center"><RunControls ctx={ctx} compact /></div></EmptyState>;
  const label: Record<string, [string, string]> = { found: ["✓", "Works and reachable"], missing: ["✕", "No page for this step"], unreachable: ["!", "Exists but nothing links to it"], needs_sign_in: ["🔒", "Needs a signed-in test session"], error: ["✕", "Returns an error"] };
  return (
    <div className="grid gap-5">
      {outcomes.map((o) => (
        <Section key={o.key} title={o.name} sub={`Goal: ${o.goal}`} action={<ResultChip s={o.status} />}>
          <ol className="flex flex-wrap items-stretch gap-2">
            {o.steps.map((s, k) => (
              <li key={k} className="flex items-center gap-2">
                <div className={`min-w-36 rounded-2xl border p-3 text-sm ${s.status === "found" ? "border-success/40" : s.status === "needs_sign_in" ? "border-border" : "border-danger/50"}`}>
                  <p className="font-semibold"><span aria-hidden>{label[s.status]![0]} </span>{s.label}</p>
                  <p className="font-mono text-xs text-muted">{s.page ?? "—"}</p>
                  <p className="text-xs">{label[s.status]![1]}</p>
                </div>
                {k < o.steps.length - 1 ? <span aria-hidden className="text-muted">→</span> : null}
              </li>
            ))}
          </ol>
          {o.friction.length ? <ul className="mt-3 grid gap-1 text-sm">{o.friction.map((f) => <li key={f}>Friction: {f}</li>)}</ul> : null}
        </Section>
      ))}
      <p className="text-xs text-muted">Steps behind sign-in need a signed-in test session; until one is configured they&apos;re shown as blocked, not passed.</p>
    </div>
  );
}

export function PersonasView({ ctx }: { ctx: Ctx }) {
  const rs = ctx.results.filter((r) => r.category === "personas");
  return (
    <div className="grid gap-6">
      <Notice>AI-SIMULATED USER TESTING — NOT REAL HUMAN RESEARCH. A model plays each persona, moving only along links that exist on your crawled pages; a walk that jumps to a page that isn&apos;t linked is discarded. Use it to find likely friction, then confirm with real people.</Notice>
      <Section title="Results from the last run">
        {rs.length ? <ul className="grid gap-3">{rs.map((r) => <li key={r.key} className="rounded-2xl border border-border p-4"><p className="flex flex-wrap items-center gap-2"><ResultChip s={r.status} /><b>{r.name}</b><MethodTag m={r.method} /></p><p className="mt-1 text-sm">Goal: {r.objective}</p><p className="mt-1 text-sm">{r.actual}</p>{r.steps.length ? <ol className="mt-2 grid gap-0.5 text-xs text-muted">{r.steps.map((s, k) => <li key={k}>{s}</li>)}</ol> : null}</li>)}</ul> : <p className="text-sm text-muted">No persona results yet. They run in Full QA (or choose “AI personas” in a custom run) when AI is configured on this installation.</p>}
      </Section>
      <Section title="Your personas" sub="Saved personas run alongside the three built-in ones (first-time visitor, mobile-first and impatient, low digital confidence).">
        <ul className="grid gap-2">{ctx.personas.map((p) => <li key={p.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-border p-3 text-sm"><div className="flex-1"><b>{p.name}</b> — {p.description}<br /><span className="text-muted">Goal: {p.goal}</span></div>{ctx.can.write ? <ActionForm action={deletePersona} submitLabel="Remove" submitClassName="text-xs font-semibold text-danger"><Hidden ctx={ctx} /><input type="hidden" name="personaId" value={p.id} /></ActionForm> : null}</li>)}{!ctx.personas.length && <li className="text-sm text-muted">No custom personas yet.</li>}</ul>
        {ctx.can.write ? (
          <ActionForm action={addPersona} submitLabel="Save persona" submitClassName="btn btn-secondary min-h-10" className="mt-4 grid gap-3 md:grid-cols-3">
            <Hidden ctx={ctx} />
            <label className="grid gap-1 text-sm font-semibold">Name<input name="name" required minLength={2} maxLength={60} className="input" placeholder="Busy parent" /></label>
            <label className="grid gap-1 text-sm font-semibold">Who they are<input name="description" required minLength={10} maxLength={600} className="input" placeholder="Orders on a phone while commuting; skims" /></label>
            <label className="grid gap-1 text-sm font-semibold">Goal<input name="goal" required minLength={5} maxLength={300} className="input" placeholder="Book a table for Friday" /></label>
          </ActionForm>
        ) : null}
      </Section>
    </div>
  );
}

export function ResponsiveView({ ctx }: { ctx: Ctx }) {
  const b = (ctx.detail?.outcomes as { browser?: { available: boolean; engine: string | null; reason: string | null; shots: { path: string; viewport: number; screenshot: string }[] } } | null)?.browser;
  const rs = ctx.results.filter((r) => ["responsive", "crossbrowser", "browser"].includes(r.category));
  return (
    <div className="grid gap-6">
      <Section title="Browsers and devices" sub="Which engines and screen widths were actually used in the last run.">
        <p className="text-sm">{b?.available ? <>Tested with <b>{b.engine}</b> at {ctx.settings.viewports.join(", ")} px. Firefox and Safari (WebKit) were <b>not</b> tested.</> : <>No browser ran in the last run: {b?.reason ?? "no browser results"}.</>}</p>
      </Section>
      {b?.shots?.length ? (
        <Section title="Same page, different screens" sub={b.shots[0]!.path}>
          <div className="flex flex-wrap items-start gap-4">{b.shots.filter((s) => /^data:image\/(jpeg|png);base64,/.test(s.screenshot)).map((s) => <figure key={s.viewport} className="m-0"><img src={s.screenshot} alt={`${s.path} at ${s.viewport}px wide`} className="max-h-[420px] rounded-xl border border-border" style={{ width: Math.min(360, s.viewport / 3.2) }} /><figcaption className="mt-1 text-center text-xs text-muted">{s.viewport}px</figcaption></figure>)}</div>
        </Section>
      ) : null}
      <Section title="Responsive and browser results">
        {rs.length ? <ul className="grid gap-2">{rs.map((r) => <li key={r.key} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3 text-sm"><ResultChip s={r.status} /><span className="font-semibold">{r.name}</span><span className="text-muted">— {r.actual}</span></li>)}</ul> : <p className="text-sm text-muted">No responsive results in the last run.</p>}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* History, readiness, reports, settings, log                           */
/* ------------------------------------------------------------------ */

export async function HistoryView({ ctx }: { ctx: Ctx }) {
  const done = ctx.runs.filter((r) => r.status !== "queued");
  const a = ctx.runs.find((r) => r.id === ctx.sp.a), b = ctx.runs.find((r) => r.id === ctx.sp.b);
  let cmp: ReturnType<typeof compare> | null = null;
  if (a && b) {
    const db = await createClient();
    const [{ data: ra }, { data: rb }] = await Promise.all([db.from("qa_results").select("key, name, category, method, status, severity, actual").eq("run_id", a.id), db.from("qa_results").select("key, name, category, method, status, severity, actual").eq("run_id", b.id)]);
    cmp = compare((ra ?? []) as unknown as Result[], (rb ?? []) as unknown as Result[], a.scores?.overall.value ?? null, b.scores?.overall.value ?? null);
  }
  return (
    <div className="grid gap-6">
      <Section title="Test history" sub="Every run, with its version, configuration and outcome.">
        {done.length ? (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted"><th className="py-2 pr-3">When</th><th className="pr-3">Run</th><th className="pr-3">Trigger</th><th className="pr-3">Status</th><th className="pr-3">Score</th><th className="pr-3">Passed / failed</th><th className="pr-3">Release</th><th className="pr-3">Version</th><th></th></tr></thead>
            <tbody>{done.map((r) => <tr key={r.id} className="border-t border-border"><td className="py-2 pr-3 text-xs">{new Date(r.created_at).toUTCString().slice(5, 22)}</td><td className="pr-3">{MODE_LABEL[r.mode] ?? r.mode}</td><td className="pr-3 text-xs">{r.trigger.replace("_", " ")}</td><td className="pr-3">{r.status}</td><td className="pr-3 font-semibold">{r.scores?.overall.value ?? "—"}</td><td className="pr-3">{r.scores?.counts ? `${r.scores.counts.passed ?? 0} / ${r.scores.counts.failed ?? 0}` : "—"}</td><td className="pr-3">{r.readiness ? <ReleaseBadge s={r.readiness.status} /> : "—"}</td><td className="pr-3 font-mono text-xs">{r.commit?.slice(0, 8) ?? "—"}</td><td className="whitespace-nowrap text-xs"><Link className="font-semibold text-accent" href={`${base(ctx)}?view=tests&run=${r.id}`}>Results</Link> · <Link className="text-accent" href={`${base(ctx)}?view=log&run=${r.id}`}>Log</Link></td></tr>)}</tbody></table></div>
        ) : <p className="text-sm text-muted">No runs yet.</p>}
      </Section>
      <Section title="Compare two runs">
        <form className="flex flex-wrap items-end gap-3"><input type="hidden" name="view" value="history" />
          <label className="grid gap-1 text-sm font-semibold">Earlier<select name="a" defaultValue={a?.id ?? done[1]?.id} className="input">{done.map((r) => <option key={r.id} value={r.id}>{new Date(r.created_at).toUTCString().slice(5, 22)} · {MODE_LABEL[r.mode]}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold">Later<select name="b" defaultValue={b?.id ?? done[0]?.id} className="input">{done.map((r) => <option key={r.id} value={r.id}>{new Date(r.created_at).toUTCString().slice(5, 22)} · {MODE_LABEL[r.mode]}</option>)}</select></label>
          <button className="btn btn-secondary min-h-10">Compare</button>
        </form>
        {cmp ? (
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {[["New failures", cmp.newFailures, "text-danger"], ["Fixed", cmp.fixed, "text-success"], ["Still failing", cmp.stillFailing, ""], ["New checks", cmp.newTests, ""]].map(([label, list, cls]) => <div key={label as string}><p className={`text-sm font-semibold ${cls}`}>{label as string} ({(list as Result[]).length})</p><ul className="mt-1 grid gap-0.5 text-xs">{(list as Result[]).slice(0, 15).map((x) => <li key={x.key}>{x.name}</li>)}</ul></div>)}
            <p className="text-sm md:col-span-4">Score: {a?.scores?.overall.value ?? "—"} → {b?.scores?.overall.value ?? "—"} ({cmp.scoreDelta === null ? "not comparable" : `${cmp.scoreDelta > 0 ? "+" : ""}${cmp.scoreDelta}`}) · {cmp.removed.length} check(s) not run in the later run</p>
          </div>
        ) : null}
      </Section>
    </div>
  );
}

export function ReadinessView({ ctx }: { ctx: Ctx }) {
  const r = ctx.latest;
  const st = ((ctx.active ? { status: "in_progress" } : r?.readiness) as { status: ReleaseStatus } | null)?.status ?? "not_tested";
  const g = ctx.settings.gate;
  const accepted = ctx.issues.filter((i) => i.status === "accepted_risk");
  const executedCats = new Set(ctx.results.filter((x) => x.status === "passed" || x.status === "failed").map((x) => x.category));
  return (
    <div className="grid gap-6">
      <section className="panel p-6" aria-labelledby="rd">
        <h2 id="rd" className="text-sm font-bold uppercase tracking-wider text-muted">Release status</h2>
        <p className="mt-3"><ReleaseBadge s={st} large /></p>
        <p className="mt-3 text-sm text-muted">Readiness comes from blocking issues, required checks, the minimum score and approvals — not from the score alone. Possible statuses: {Object.values(RELEASE_LABEL).join(" · ")}.</p>
        {r?.readiness?.blocking?.length ? <><h3 className="mt-5 font-semibold text-danger">Blocking release</h3><ul className="mt-1 grid gap-1 text-sm">{r.readiness.blocking.map((b) => <li key={b}>✕ {b}</li>)}</ul></> : null}
        {r?.readiness?.reasons?.length ? <><h3 className="mt-5 font-semibold">Why</h3><ul className="mt-1 grid gap-1 text-sm">{r.readiness.reasons.map((b) => <li key={b}>• {b}</li>)}</ul></> : null}
        {r?.approved_at ? <p className="mt-4 rounded-xl bg-success/10 p-3 text-sm">Approved for release {timeAgo(r.approved_at)}{r.approval_note ? ` — “${r.approval_note}”` : ""}.</p> : null}
        {ctx.can.manage && r && r.status === "completed" && (st === "ready" || st === "conditional") ? (
          <ActionForm action={approveRelease} submitLabel="Approve for release" submitClassName="btn btn-gradient min-h-10" className="mt-5 grid max-w-xl gap-2" confirm="Approve this version for release? This is recorded in the audit log.">
            <Hidden ctx={ctx} /><input type="hidden" name="runId" value={r.id} />
            <label className="grid gap-1 text-sm font-semibold">Note {st === "conditional" ? <span className="font-normal text-muted">(explain why the open high-severity issues are acceptable)</span> : null}<input name="note" className="input" maxLength={1000} required={st === "conditional"} /></label>
          </ActionForm>
        ) : null}
      </section>
      <Section title="This project's release gate" action={ctx.can.manage ? <Link href={`${base(ctx)}?view=settings`} className="text-sm font-semibold text-accent">Change →</Link> : null}>
        <ul className="grid gap-1.5 text-sm">
          <li>Blocking severities: <b>{g.blockingSeverities.join(", ")}</b></li>
          <li>Minimum overall score: <b>{g.minOverall}</b> (last run: {r?.scores?.overall.value ?? "—"})</li>
          <li>Required categories: {g.requiredCategories.map((c) => <span key={c} className={`mr-1.5 ${executedCats.has(c) ? "text-success" : "text-danger"}`}>{executedCats.has(c) ? "✓" : "✕"} {CATEGORY_INFO[c].label}</span>)}</li>
          <li>Manual review required: <b>{g.requireManualReview ? "yes" : "no"}</b> · Enforced on deploy: <b>{g.enforceOnDeploy ? "yes — deployments are blocked unless ready or approved" : "no — shown as advice"}</b></li>
        </ul>
      </Section>
      <Section title={`Accepted risks (${accepted.length})`}>
        {accepted.length ? <ul className="grid gap-2 text-sm">{accepted.map((i) => <li key={i.id} className="rounded-xl border border-border p-3"><Link className="font-semibold hover:underline" href={`${base(ctx)}?view=issues&issue=${i.id}`}>QA-{i.ref} {i.title}</Link> <SeverityChip s={i.severity} /><br /><span className="text-muted">{i.accepted_reason} · accepted {timeAgo(i.accepted_at)} · review by {i.accepted_expires}{i.accepted_expires && i.accepted_expires < new Date().toISOString().slice(0, 10) ? " (expired — counts as open)" : ""}</span></li>)}</ul> : <p className="text-sm text-muted">None.</p>}
      </Section>
    </div>
  );
}

export function ReportsView({ ctx }: { ctx: Ctx }) {
  const r = ctx.latest;
  if (!r) return <EmptyState title="No reports yet">Reports are generated from real runs. Run QA first.</EmptyState>;
  const kinds: [string, string, string][] = [["executive", "Executive QA report", "Quality, readiness, major risks and what to fix first."], ["functional", "Functional testing", "Coverage, results and failures by feature, API and journey."], ["security", "Security & penetration", "Vulnerabilities, evidence, impact, remediation and retest status."], ["ux", "UX report", "First impressions, journeys, forms, content, trust and friction."], ["performance", "Performance & load", "Response times, page weight, vitals and load results."], ["accessibility", "Accessibility", "WCAG findings and the items that need manual review."], ["responsive", "Responsive & devices", "Viewport results and which browsers were tested."], ["regression", "Regression", "What changed against the previous run."], ["full", "Full QA report", "Everything above in one document."]];
  const href = (k: string, f: string) => `/projects/${ctx.project.id}/qa/report?run=${r.id}&kind=${k}&format=${f}`;
  return (
    <Section title="Reports" sub={`From the run of ${new Date(r.created_at).toUTCString().slice(5, 22)} UTC. To save a PDF, open the HTML report and print it (Save as PDF).`}>
      <ul className="grid gap-3 md:grid-cols-3">
        {kinds.map(([k, t, d]) => <li key={k} className="rounded-2xl border border-border p-4"><p className="font-semibold">{t}</p><p className="mt-1 text-sm text-muted">{d}</p><p className="mt-3 flex flex-wrap gap-3 text-sm font-semibold"><a className="text-accent" href={href(k, "html")} target="_blank" rel="noopener">HTML / PDF</a><a className="text-accent" href={href(k, "csv")}>CSV</a><a className="text-accent" href={href(k, "json")}>JSON</a></p></li>)}
      </ul>
    </Section>
  );
}

export function SettingsView({ ctx }: { ctx: Ctx }) {
  const s = ctx.settings;
  const dis = !ctx.can.manage;
  const preset = WEIGHT_PRESETS[((ctx.detail?.profile as { appType?: string } | null)?.appType ?? "unknown") as keyof typeof WEIGHT_PRESETS] ?? {};
  return (
    <div className="grid gap-6">
      {dis ? <Notice>Only owners and admins can change QA settings. You can see them here.</Notice> : null}
      <ActionForm action={saveQaSettings} submitLabel="Save settings" submitClassName={`btn btn-primary min-h-10 ${dis ? "hidden" : ""}`} className="grid gap-6">
        <Hidden ctx={ctx} />
        <Section title="Release gate" sub="Decides the release status. Critical issues block release independently of the score.">
          <fieldset disabled={dis} className="grid gap-4">
            <div><p className="text-sm font-semibold">Severities that block release</p><div className="mt-1 flex flex-wrap gap-3">{SEVERITIES.map((x) => <label key={x} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="blocking" value={x} defaultChecked={s.gate.blockingSeverities.includes(x)} />{x}</label>)}</div></div>
            <label className="grid max-w-xs gap-1 text-sm font-semibold">Minimum overall score<input type="number" name="minOverall" min={0} max={100} defaultValue={s.gate.minOverall} className="input" /></label>
            <div><p className="text-sm font-semibold">Categories that must have run</p><div className="mt-1 grid gap-1.5 sm:grid-cols-3 lg:grid-cols-5">{CATEGORIES.map((c) => <label key={c} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="required" value={c} defaultChecked={s.gate.requiredCategories.includes(c)} />{CATEGORY_INFO[c].label}</label>)}</div></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="manualReview" defaultChecked={s.gate.requireManualReview} /> Require a manual review (an owner or admin approves the release)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enforceOnDeploy" defaultChecked={s.gate.enforceOnDeploy} /> Block deployments unless the latest QA run is ready, conditional or approved</label>
          </fieldset>
        </Section>
        <Section title="Scope" sub="What the engine visits. It only ever tests this project's own sandbox.">
          <fieldset disabled={dis} className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">Excluded pages <span className="font-normal text-muted">one per line, e.g. /admin</span><textarea name="excludedRoutes" rows={3} defaultValue={s.excludedRoutes.join("\n")} className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold">Excluded endpoints<textarea name="excludedEndpoints" rows={3} defaultValue={s.excludedEndpoints.join("\n")} className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold">Screen widths for browser tests (px)<input name="viewports" defaultValue={s.viewports.join(", ")} className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold">Maximum pages to crawl<input type="number" name="maxPages" min={1} max={150} defaultValue={s.maxPages} className="input" /></label>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="activeSecurity" defaultChecked={s.activeSecurity} /> Safe active security probes: send malformed bodies to endpoints that change data (never DELETE, never valid writes)</label>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="autoAfterBuild" defaultChecked={s.autoAfterBuild} /> Run a regression check automatically after each successful agent build</label>
          </fieldset>
        </Section>
        <Section title="Load testing" sub="Controlled traffic against your own sandbox only. Capped at 50 concurrent clients and 120 seconds.">
          <fieldset disabled={dis} className="grid gap-4 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="loadEnabled" defaultChecked={s.load.enabled} /> Include a load test in Full QA</label>
            <label className="grid gap-1 text-sm font-semibold">Concurrent clients<input type="number" name="loadConcurrency" min={1} max={50} defaultValue={s.load.concurrency} className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold">Duration (seconds)<input type="number" name="loadSeconds" min={5} max={120} defaultValue={s.load.seconds} className="input" /></label>
          </fieldset>
        </Section>
        <Section title="Score weights" sub="How much each area counts in the overall score. Blank uses the default for this kind of app.">
          <fieldset disabled={dis} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{AREAS.map((a) => <label key={a.key} className="grid gap-1 text-sm font-semibold">{a.label}<input type="number" min={0} max={100} name={`w_${a.key}`} placeholder={String(preset[a.key] ?? a.weight)} defaultValue={(s.weights as Record<string, number>)[a.key] ?? ""} className="input" /></label>)}</fieldset>
        </Section>
      </ActionForm>
      <Section title="Penetration testing authorisation" sub="Deeper probes (reflected input, open redirects) run only after an owner or admin confirms they own this app. They target this project's sandbox only — never other systems, never production, never denial of service.">
        {s.pentestAuthorized ? <p className="text-sm">Authorised {timeAgo(s.pentestAuthorized.at)} · scope: “{s.pentestAuthorized.scope}”.</p> : <p className="text-sm text-muted">Not authorised.</p>}
        {ctx.can.manage ? (
          s.pentestAuthorized ? (
            <ActionForm action={authorizePentest} submitLabel="Withdraw authorisation" submitClassName="btn btn-secondary min-h-10 mt-3"><Hidden ctx={ctx} /><input type="hidden" name="on" value="0" /></ActionForm>
          ) : (
            <ActionForm action={authorizePentest} submitLabel="Authorise" submitClassName="btn btn-primary min-h-10" className="mt-3 grid max-w-xl gap-2">
              <Hidden ctx={ctx} /><input type="hidden" name="on" value="1" />
              <label className="grid gap-1 text-sm font-semibold">Scope<input name="scope" required minLength={10} className="input" defaultValue="This project's sandbox only; all pages and endpoints except exclusions" /></label>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm" className="mt-1" required /> I own this application (or have written permission to test it) and authorise these probes against its sandbox.</label>
            </ActionForm>
          )
        ) : null}
      </Section>
    </div>
  );
}

export function LogView({ ctx }: { ctx: Ctx }) {
  const run = ctx.runs.find((r) => r.id === ctx.selectedRunId);
  return (
    <Section title="Run log" sub={run ? `${MODE_LABEL[run.mode]} · ${run.status}${run.error ? ` · ${run.error}` : ""}` : undefined} action={<Link href={`${base(ctx)}?view=history`} className="text-sm font-semibold text-accent">History</Link>}>
      <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-ink p-4 font-mono text-xs leading-5 text-ink-text">{ctx.detail?.log ?? (run?.status === "queued" ? "Waiting for the worker…" : "No log yet.")}</pre>
    </Section>
  );
}
