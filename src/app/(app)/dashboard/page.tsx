import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState, StatusPill, formatMicros, timeAgo } from "@/components/page-header";
import { GettingStarted, type Step } from "@/components/getting-started";
import { Momentum } from "@/components/momentum";
import { progress } from "@/lib/engagement";
import { ideasForDay } from "@/lib/site/starters";
import { QuickStart } from "@/components/quick-start";
import { quickStart } from "../new-project/actions";
import { loadJourneyState } from "@/lib/journey-state";
import { suggestions } from "@/lib/journey";
import { dismissOnboarding } from "../settings/actions";
import { Icon } from "@/components/icons";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { supabase, org, can, user } = await requireOrg();
  const [members, projects, incidents, approvals, live, billing] = await Promise.all([
    supabase.from("org_members").select("user_id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "active"),
    supabase.from("projects").select("id, name, status, description, updated_at", { count: "exact" }).eq("org_id", org.id).neq("status", "archived").order("updated_at", { ascending: false }).limit(6),
    supabase.from("incidents").select("id, project_id, title, status, count, last_seen", { count: "exact" }).eq("org_id", org.id).in("status", ["open", "fix_proposed"]).order("last_seen", { ascending: false }).limit(8),
    supabase.from("approvals").select("id, project_id, kind, summary, requested_at", { count: "exact" }).eq("org_id", org.id).eq("status", "pending").order("requested_at", { ascending: false }).limit(8),
    supabase.from("deployments").select("id, project_id, url, provider, live_at", { count: "exact" }).eq("org_id", org.id).eq("environment", "production").eq("status", "live").limit(10),
    can("usage.read") ? supabase.rpc("billing_summary", { p_org: org.id }) : Promise.resolve({ data: null }),
  ]);
  const summary = billing.data as null | { balance_micros: number; month_usage_micros: number; plan_name: string };
  const count = (table: string) => supabase.from(table).select("id", { count: "exact", head: true }).eq("org_id", org.id).then((r) => r.count ?? 0);
  const [plansApproved, sandboxes, secrets, deploys, invites] = await Promise.all([
    supabase.from("plans").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "approved").then((r) => r.count ?? 0),
    count("sandboxes"), count("project_secrets"), count("deployments"), count("invitations"),
  ]);
  const now = new Date();
  const { data: me } = await supabase.from("profiles").select("onboarded_at").eq("id", user.id).maybeSingle();
  const lastProject = (projects.data?.[0] as { id: string; name: string; status: string; description: string | null; updated_at: string } | undefined) ?? null;
  const lastNext = lastProject ? suggestions(await loadJourneyState(supabase, lastProject, can("project.write")), 1)[0] ?? null : null;
  const steps: Step[] = [
    { key: "project", label: "Create your first project", hint: "Describe the app you want", href: "/new-project", done: (projects.data?.length ?? 0) > 0 },
    { key: "plan", label: "Approve a plan", hint: "Chat with the planner, then approve", href: "/builder?to=build&at=plan", done: plansApproved > 0 },
    { key: "sandbox", label: "Start a live preview", hint: "Run the app in its sandbox", href: "/builder?to=build&at=preview", done: sandboxes > 0 },
    { key: "secret", label: "Add a secret", hint: "Keys your app needs, encrypted", href: "/integrations?to=secrets&at=set-secret", done: secrets > 0 },
    { key: "deploy", label: "Deploy your app", hint: "Preview first, then production", href: "/deployments?to=deployments&at=deploy", done: deploys > 0 },
    { key: "team", label: "Invite a teammate", hint: "Build together with roles", href: "/team#invite", done: (members.count ?? 0) > 1 || invites > 0 },
  ];

  return (
    <>
      <PageHeader title={org.name} description={workspaceSummary({ projects: projects.count ?? projects.data?.length ?? 0, approvals: approvals.count ?? 0, incidents: incidents.count ?? 0, live: live.count ?? 0 })} actions={can("project.write") ? <Link href="/new-project" className="btn btn-secondary">New project with details</Link> : null} />
      {me && !me.onboarded_at ? (
        <section aria-labelledby="setup-title" className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-5">
          <span className="kw-empty-icon !h-11 !w-11 !rounded-xl" aria-hidden><Icon name="sparkles" /></span>
          <div className="min-w-0 flex-1">
            <h2 id="setup-title" className="text-lg">Finish setting up — about a minute</h2>
            <p className="text-sm text-muted">Tell us what you&apos;re building and how much guidance you want, and we&apos;ll point you to the right tools.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/welcome" className="btn btn-gradient">Continue</Link>
            <form action={dismissOnboarding}><button type="submit" className="btn btn-secondary">Not now</button></form>
          </div>
        </section>
      ) : null}
      {can("project.write") ? <QuickStart action={quickStart} /> : null}
      <Momentum last={lastProject} next={lastNext} progress={progress(steps)} ideas={ideasForDay(now)} />
      <GettingStarted steps={steps} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Active members" value={String(members.count ?? 0)} href="/team" />
        <Stat label="Active projects" value={String(projects.count ?? projects.data?.length ?? 0)} href="/projects" />
        {summary ? <Stat label={`Credit balance · ${summary.plan_name}`} value={formatMicros(summary.balance_micros)} href="/billing" /> : <Stat label="Pending approvals" value={String(approvals.count ?? 0)} />}
      </div>

      <section className="mt-10" aria-labelledby="recent">
        <h2 id="recent" className="mb-3 text-xl">Recent projects</h2>
        {projects.data?.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.data.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="panel block p-5 hover:border-accent">
                  <div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{p.name}</span><StatusPill status={p.status} /></div>
                  <p className="mt-2 text-xs text-muted">Updated {timeAgo(p.updated_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="folder" title="No projects yet" action={can("project.write") ? { label: "Create your first project", href: "#quick-idea" } : undefined} secondary={{ label: "Explore templates", href: "/templates#starters" }}>Your projects will appear here. Start with an idea, and come back to it whenever you&apos;re ready.</EmptyState>
        )}
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <section className="panel p-5" aria-labelledby="incidents">
          <h2 id="incidents" className="text-lg">Open incidents</h2>
          {incidents.data?.length ? (
            <ul className="mt-3 grid gap-2 text-sm">
              {incidents.data.map((i) => (
                <li key={i.id}><Link className="hover:underline" href={`/projects/${i.project_id}/incidents`}>{i.title}</Link> <span className="text-muted">×{i.count}</span></li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-muted">Nothing is failing. Failed checks, deployments and automations open incidents here.</p>}
        </section>
        <section className="panel p-5" aria-labelledby="approvals">
          <h2 id="approvals" className="text-lg">Waiting for approval</h2>
          {approvals.data?.length ? (
            <ul className="mt-3 grid gap-2 text-sm">
              {approvals.data.map((a) => (
                <li key={a.id}><Link className="hover:underline" href={`/projects/${a.project_id}`}>{a.summary}</Link></li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-muted">No agent is waiting on you.</p>}
        </section>
        <section className="panel p-5" aria-labelledby="live">
          <h2 id="live" className="text-lg">Live in production</h2>
          {live.data?.length ? (
            <ul className="mt-3 grid gap-2 text-sm">
              {live.data.map((d) => (
                <li key={d.id}><a className="break-all font-mono text-xs hover:underline" href={d.url ?? "#"} rel="noreferrer" target="_blank">{d.url}</a> <span className="text-muted">· {d.provider}</span></li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-muted">Nothing is deployed to production yet.</p>}
        </section>
      </div>
      {summary ? <p className="mt-6 text-sm text-muted">This month&apos;s usage: {formatMicros(summary.month_usage_micros)}</p> : null}
    </>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (<><p className="text-sm text-muted">{label}</p><p className="mt-1 font-display text-3xl font-bold">{value}</p></>);
  return href ? <Link href={href} className="panel block p-5 hover:border-accent">{body}</Link> : <div className="panel p-5">{body}</div>;
}

/** One honest line about the workspace right now, from the same live data as the page. */
function workspaceSummary(c: { projects: number; approvals: number; incidents: number; live: number }): string {
  if (!c.projects) return "Nothing here yet. Start with an idea below; it takes one sentence.";
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  const needs = [c.approvals ? n(c.approvals, "approval is waiting", "approvals are waiting") : "", c.incidents ? n(c.incidents, "incident is open", "incidents are open") : ""].filter(Boolean);
  const base = `${n(c.projects, "active project", "active projects")}${c.live ? `, ${c.live} live in production` : ""}.`;
  return needs.length ? `${base} ${needs.join(" and ")} — see below.` : `${base} Nothing is waiting on you.`;
}
