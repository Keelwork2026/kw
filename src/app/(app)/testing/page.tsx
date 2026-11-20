import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { SectionPicker } from "@/components/section-picker";
import { ReleaseBadge } from "@/components/qa/ui";
import type { ReleaseStatus } from "@/lib/qa/types";

export const metadata = { title: "Testing & QA" };

/** The QA portfolio: every project's latest quality score, open issues and release readiness. */
export default async function Page({ searchParams }: { searchParams: Promise<{ to?: string; at?: string; q?: string }> }) {
  const sp = await searchParams;
  if (sp.to) return <SectionPicker slug="testing" searchParams={sp} />;
  const { supabase, org } = await requireOrg();
  const { data: projects } = await supabase.from("projects").select("id, name").eq("org_id", org.id).neq("status", "archived").order("updated_at", { ascending: false });
  const ids = (projects ?? []).map((p) => p.id as string);
  const [{ data: runs }, { data: issues }] = ids.length ? await Promise.all([
    supabase.from("qa_runs").select("project_id, status, mode, scores, readiness, created_at, finished_at").in("project_id", ids).order("created_at", { ascending: false }).limit(500),
    supabase.from("qa_issues").select("project_id, severity, status").in("project_id", ids).in("status", ["new", "confirmed", "in_progress", "awaiting_review", "fixed", "awaiting_retest", "reopened"]).limit(5000),
  ]) : [{ data: [] }, { data: [] }];
  const latest = new Map<string, { status: string; scores: { overall?: { value: number | null; basis: string }; coverage?: number } | null; readiness: { status: ReleaseStatus } | null; created_at: string; active: boolean }>();
  for (const r of runs ?? []) {
    const cur = latest.get(r.project_id as string);
    const active = r.status === "queued" || r.status === "running";
    if (!cur) latest.set(r.project_id as string, { status: r.status as string, scores: r.scores as never, readiness: r.readiness as never, created_at: r.created_at as string, active });
    else if (cur.active && r.status === "completed" && !cur.scores) latest.set(r.project_id as string, { ...cur, scores: r.scores as never, readiness: r.readiness as never });
  }
  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl">Testing &amp; QA</h1>
        <p className="mt-2 max-w-3xl text-muted">Every project&apos;s quality at a glance. QA runs test the running app in its sandbox — pages, links, endpoints, security, accessibility, performance and journeys — and explain exactly why a version is or isn&apos;t ready to release.</p>
      </header>
      {projects?.length ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const l = latest.get(p.id as string);
            const open = (issues ?? []).filter((i) => i.project_id === p.id);
            const crit = open.filter((i) => i.severity === "critical").length;
            const status: ReleaseStatus = l?.active ? "in_progress" : l?.readiness?.status ?? "not_tested";
            return (
              <li key={p.id}>
                <Link href={`/projects/${p.id}/qa`} className="panel grid gap-3 p-5 hover:border-accent">
                  <div className="flex items-start justify-between gap-3"><span className="text-lg font-semibold">{p.name}</span><span className="text-2xl font-bold">{l?.scores?.overall?.value ?? "—"}</span></div>
                  <ReleaseBadge s={status} />
                  <p className="text-sm text-muted">{l ? `${open.length} open issue(s)${crit ? `, ${crit} critical` : ""} · ${l.scores?.coverage ?? 0}% of areas measured` : "Not tested yet — open to run Quick QA."}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : <div className="panel p-8 text-center"><p className="text-lg font-semibold">No projects yet</p><p className="mt-1 text-muted"><Link className="font-semibold text-accent" href="/new-project">Create a project</Link>, build it, then test it here.</p></div>}
    </>
  );
}
