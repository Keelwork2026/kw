import Link from "next/link";
import { requireStaff } from "@/lib/admin/server";
import { canOpen } from "@/lib/admin/staff";
import { PageHeader, formatMicros } from "@/components/page-header";

export const metadata = { title: "Back office" };

type Overview = {
  users: number; users_7d: number; users_30d: number; orgs: number; orgs_active_7d: number; orgs_suspended: number; projects: number; paying_orgs: number;
  builds_7d: Record<string, number>; deploys_live: number; ai_cost_micros_30d: number; purchases_micros_30d: number;
  reports_open: number; appeals_open: number; refusals_7d: number; marketplace_pending: number;
  queue: { builds_queued: number; builds_running: number; oldest_queued_seconds: number; automation_queued: number; deploys_active: number; qa_queued: number; checks_queued: number; sandboxes_running: number; failed_24h: number };
  signups_by_day: { day: string; users: number }[];
};

const n = (v: number) => Number(v ?? 0).toLocaleString("en-US");
function ago(sec: number) { return sec < 60 ? `${sec}s` : sec < 3600 ? `${Math.round(sec / 60)} min` : `${Math.round(sec / 3600)} h`; }

/** Aggregates only: counts and sums across the platform, never a customer's content. */
export default async function AdminOverview() {
  const { supabase, role } = await requireStaff("");
  const { data, error } = await supabase.rpc("admin_overview");
  if (error || !data) return <><PageHeader title="Overview" /><p role="alert" className="text-danger">Couldn&apos;t load the overview: {error?.message}</p></>;
  const o = data as Overview;
  const builds = Object.values(o.builds_7d).reduce((a, b) => a + b, 0);
  const succeeded = o.builds_7d.succeeded ?? 0;
  const finished = succeeded + (o.builds_7d.failed ?? 0);
  const max = Math.max(1, ...o.signups_by_day.map((d) => d.users));
  const stale = o.queue.builds_queued > 0 && o.queue.oldest_queued_seconds > 300;

  const tiles: { label: string; value: string; sub?: string; href?: string; tone?: "warn" | "bad" }[] = [
    { label: "People", value: n(o.users), sub: `+${n(o.users_7d)} this week · +${n(o.users_30d)} in 30 days`, href: canOpen(role, "people") ? "/admin/people" : undefined },
    { label: "Workspaces", value: n(o.orgs), sub: `${n(o.orgs_active_7d)} active this week · ${n(o.paying_orgs)} paying`, href: canOpen(role, "orgs") ? "/admin/orgs" : undefined },
    { label: "Projects", value: n(o.projects), sub: `${n(o.deploys_live)} live deployments` },
    { label: "Builds this week", value: n(builds), sub: finished ? `${Math.round((succeeded / finished) * 100)}% of finished builds succeeded` : "None finished yet" },
    { label: "AI cost, 30 days", value: formatMicros(o.ai_cost_micros_30d), sub: "What providers charged for customer usage" },
    { label: "Credit purchases, 30 days", value: formatMicros(o.purchases_micros_30d), sub: "From the credit ledger" },
    { label: "Open abuse reports", value: n(o.reports_open), href: canOpen(role, "safety") ? "/admin/safety" : undefined, tone: o.reports_open ? "warn" : undefined },
    { label: "Policy appeals waiting", value: n(o.appeals_open), sub: `${n(o.refusals_7d)} refusals this week`, href: canOpen(role, "policy") ? "/admin/policy" : undefined, tone: o.appeals_open ? "warn" : undefined },
    { label: "Marketplace waiting", value: n(o.marketplace_pending), href: canOpen(role, "marketplace") ? "/admin/marketplace" : undefined, tone: o.marketplace_pending ? "warn" : undefined },
    { label: "Suspended workspaces", value: n(o.orgs_suspended), href: canOpen(role, "orgs") ? "/admin/orgs?state=suspended" : undefined },
  ];

  return (
    <>
      <PageHeader title="Overview" description="Counts and sums across Keelwork. Nothing here shows a customer's content." />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Platform numbers">
        {tiles.map((t) => {
          const body = <><span className="block text-sm text-muted">{t.label}</span><span className={`mt-1 block font-display text-3xl font-bold ${t.tone === "warn" ? "text-[#8a6100]" : t.tone === "bad" ? "text-danger" : ""}`}>{t.value}</span>{t.sub ? <span className="mt-1 block text-xs text-muted">{t.sub}</span> : null}</>;
          return <li key={t.label}>{t.href ? <Link href={t.href} className="panel block h-full p-4">{body}</Link> : <div className="panel h-full p-4">{body}</div>}</li>;
        })}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel p-5" aria-labelledby="signups">
          <h2 id="signups" className="text-lg">Sign-ups, last 14 days</h2>
          <div className="mt-4 flex h-40 items-end gap-1.5" role="img" aria-label={`Sign-ups per day: ${o.signups_by_day.map((d) => `${d.day} ${d.users}`).join(", ")}`}>
            {o.signups_by_day.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-muted">{d.users || ""}</span>
                <div className="kw-bar w-full rounded-t-md" style={{ height: `${Math.max(2, (d.users / max) * 120)}px`, background: "var(--grad-art)" }} title={`${d.day}: ${d.users}`} />
                <span className="text-[10px] text-muted">{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5" aria-labelledby="ops">
          <h2 id="ops" className="text-lg">Operations right now</h2>
          {stale ? <p role="alert" className="mt-2 rounded-xl bg-[#fde8e4] p-3 text-sm font-semibold text-[#a3281a]">The oldest queued build has waited {ago(o.queue.oldest_queued_seconds)}. Check that the agent worker is running.</p> : null}
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {([
              ["Builds queued", o.queue.builds_queued], ["Builds running", o.queue.builds_running],
              ["Automation runs waiting", o.queue.automation_queued], ["Deployments in progress", o.queue.deploys_active],
              ["QA runs queued", o.queue.qa_queued], ["Checks queued", o.queue.checks_queued],
              ["Sandboxes running", o.queue.sandboxes_running], ["Failures, last 24 h", o.queue.failed_24h],
            ] as const).map(([l, v]) => <div key={l}><dt className="text-muted">{l}</dt><dd className="font-display text-xl font-bold">{n(v)}</dd></div>)}
          </dl>
          {o.queue.builds_queued ? <p className="mt-3 text-xs text-muted">Oldest queued build: {ago(o.queue.oldest_queued_seconds)}.</p> : null}
        </section>
      </div>
    </>
  );
}
