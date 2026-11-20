import { loadProject } from "@/lib/project";
import { ActionForm } from "@/components/action-form";
import { EmptyState } from "@/components/page-header";
import { enableAnalytics } from "./actions";

export const metadata = { title: "Analytics" };
type Summary = { pageviews: number; visitors: number; days: { day: string; pageviews: number; visitors: number }[] };

export default async function AnalyticsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ days?: string }> }) {
  const { id } = await params;
  const days = Math.min(90, Math.max(1, Number((await searchParams).days ?? 30) || 30));
  const { supabase, project, can } = await loadProject(id);
  const { data: site } = await supabase.from("analytics_sites").select("site_key, allowed_origins").eq("project_id", project.id).maybeSingle();
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const collector = site ? `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/api/collect/${site.site_key}` : null;

  if (!site) {
    return (
      <div className="card max-w-2xl">
        <h2 className="text-xl">Privacy-safe analytics</h2>
        <p className="mt-2 text-muted">No cookies, no IP addresses, no personal data. Respects Do Not Track and Global Privacy Control. You see totals only.</p>
        {can("project.manage") ? (
          <ActionForm action={enableAnalytics} submitLabel="Turn on analytics" className="mt-4">
            <input type="hidden" name="projectId" value={project.id} />
            <label className="label" htmlFor="origins">Your app&apos;s address(es)</label>
            <input id="origins" name="origins" required placeholder="https://shop.example.com" className="input" />
          </ActionForm>
        ) : <p className="mt-3 text-sm text-muted">An owner or admin can turn it on.</p>}
      </div>
    );
  }
  const [{ data: summary }, paths, refs, devices] = await Promise.all([
    supabase.rpc("analytics_summary", { p_project: project.id, p_from: from, p_to: to }),
    supabase.rpc("analytics_breakdown", { p_project: project.id, p_dimension: "path", p_from: from, p_to: to, p_limit: 10 }),
    supabase.rpc("analytics_breakdown", { p_project: project.id, p_dimension: "referrer", p_from: from, p_to: to, p_limit: 10 }),
    supabase.rpc("analytics_breakdown", { p_project: project.id, p_dimension: "device", p_from: from, p_to: to, p_limit: 4 }),
  ]);
  const s = summary as Summary;
  const max = Math.max(1, ...s.days.map((d) => d.pageviews));
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {[7, 30, 90].map((d) => <a key={d} href={`?days=${d}`} aria-current={d === days ? "page" : undefined} className={`pill min-h-9 px-3 ${d === days ? "bg-brand text-brand-contrast" : "border border-border"}`}>Last {d} days</a>)}
        <span className="ml-auto text-xs text-muted">Collector: <code className="break-all">{collector}</code></span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="panel p-5"><p className="text-sm text-muted">Visitors</p><p className="font-display text-3xl font-bold">{s.visitors}</p></div><div className="panel p-5"><p className="text-sm text-muted">Page views</p><p className="font-display text-3xl font-bold">{s.pageviews}</p></div></div>
      {s.days.length ? (
        <figure className="panel p-5">
          <figcaption className="text-sm font-semibold">Page views per day</figcaption>
          <div className="mt-4 flex h-40 items-end gap-1" role="img" aria-label={`Page views per day, ${from} to ${to}`}>
            {s.days.map((d) => <div key={d.day} title={`${d.day}: ${d.pageviews} views, ${d.visitors} visitors`} className="flex-1 rounded-t bg-accent kw-bar" style={{ height: `${(d.pageviews / max) * 100}%` }} />)}
          </div>
        </figure>
      ) : <EmptyState icon="chart" title="No visits yet">Add NEXT_PUBLIC_KW_ANALYTICS_URL={collector} to the app&apos;s variables and redeploy.</EmptyState>}
      <div className="grid gap-4 lg:grid-cols-3">
        {[["Top pages", paths.data], ["Referrers", refs.data], ["Devices", devices.data]].map(([title, rows]) => (
          <section key={title as string} className="panel p-5"><h2 className="text-base">{title as string}</h2>
            <ul className="mt-2 grid gap-1 text-sm">{((rows as { key: string; pageviews: number }[] | null) ?? []).map((r) => <li key={r.key} className="flex justify-between gap-2"><span className="truncate font-mono text-xs">{r.key}</span><span>{r.pageviews}</span></li>)}</ul>
          </section>
        ))}
      </div>
    </div>
  );
}
