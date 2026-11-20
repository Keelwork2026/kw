import Link from "next/link";
import { Check, Confetti } from "@/components/motion";
import { loadProject } from "@/lib/project";
import { ActionForm } from "@/components/action-form";
import { Notice, StatusPill, EmptyState, timeAgo } from "@/components/page-header";
import { AutoRefresh } from "@/components/builder/auto-refresh";
import { DEPLOY_TARGETS } from "@/lib/stack/backends";
import { deploy, rollback } from "./actions";
import { Simple } from "@/components/simple/simple";
import { simplifyMessage } from "@/lib/simple/content";

export const metadata = { title: "Deploy" };
type Log = { at: string; message: string }[];

export default async function DeploymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, project, can } = await loadProject(id);
  const [{ data: deployments }, { data: secrets }, { count: critical }] = await Promise.all([
    supabase.from("deployments").select("id, environment, kind, provider, status, url, version_id, commit_sha, error, log, created_at, live_at, requested_by_agent").eq("project_id", project.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("project_secrets").select("name").eq("project_id", project.id),
    supabase.from("security_findings").select("id", { count: "exact", head: true }).eq("project_id", project.id).eq("severity", "critical").eq("status", "open"),
  ]);
  const names = new Set((secrets ?? []).map((s) => s.name as string));
  const target = DEPLOY_TARGETS.find((d) => d.id === project.deploy_target)!;
  const missing = project.deploy_target === "vercel" ? ["VERCEL_TOKEN"].filter((n) => !names.has(n)) : ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"].filter((n) => !names.has(n));
  const active = (deployments ?? []).some((d) => ["queued", "collecting", "uploading", "building", "verifying"].includes(d.status));
  const manage = can("project.manage");
  // Going live in production is a major milestone: celebrate once, right after it happens.
  const justLive = (deployments ?? []).find((d) => d.environment === "production" && d.status === "live" && d.live_at && Date.now() - new Date(d.live_at).getTime() < 10 * 60_000);

  return (
    <div className="grid gap-6">
      <AutoRefresh active={active} />
      {justLive ? <><Confetti id={`live-${justLive.id}`} /><p role="status" className="flex items-center gap-2 rounded-2xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] p-4 font-semibold text-success"><Check size={20} /><Simple simple="Hooray — your app is online">Your app is live</Simple>{justLive.url ? <> at <a className="underline" href={justLive.url} target="_blank" rel="noopener noreferrer">{justLive.url.replace(/^https?:\/\//, "")}</a></> : null}. <Simple simple="We checked that it opens properly.">The health check passed.</Simple></p></> : null}
      <p className="text-sm text-muted"><Simple simple={<>Your app goes online with <strong>{target.name}</strong>, in your own account. First we check that it opens properly. If it doesn&apos;t, visitors keep seeing the last version that worked — so nothing breaks for them.</>}>Deploys to <strong>{target.name}</strong> in your own account. A deployment is only called live after its health check passes; if the live check fails, traffic switches back automatically.</Simple></p>
      {missing.length ? <Notice><Simple simple={<>Before your app can go online, Keelwork needs a key to your {target.name} account. Copy it from {target.name}&apos;s website and add it on the <Link className="font-semibold underline" href={`/projects/${project.id}/secrets`}>Private keys tab</Link> as {missing.join(" and ")}. It&apos;s only used to put your app online.</>}>To deploy, add {missing.join(" and ")} on the <Link className="font-semibold underline" href={`/projects/${project.id}/secrets`}>Secrets tab</Link>. Deploy credentials are used only by the deploy service, never passed to your app.</Simple></Notice> : null}
      {critical ? <p role="alert" className="notice"><Simple simple={<>Your app can&apos;t go online yet: we found {critical} serious safety problem{critical === 1 ? "" : "s"}. This protects your users. <Link className="font-semibold underline" href={`/projects/${project.id}/security`}>See how to fix {critical === 1 ? "it" : "them"}</Link>.</>}>{critical} open critical security finding{critical === 1 ? "" : "s"} block deployments. <Link className="font-semibold underline" href={`/projects/${project.id}/security`}>Review them</Link>.</Simple></p> : null}
      {manage && !missing.length ? (
        <div id="deploy" className="grid gap-3">
          <p className="kw-simple text-sm"><strong>Two choices:</strong> a <em>private preview</em> only you can see, or <em>online for everyone</em>. Start with the preview.</p>
          <div className="flex flex-wrap gap-3">
          <ActionForm action={deploy} submitLabel="Deploy preview" submitClassName="btn btn-secondary"><input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="environment" value="preview" /></ActionForm>
          <ActionForm action={deploy} submitLabel="Deploy production" submitClassName="btn btn-gradient" className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="environment" value="production" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" value="yes" required /> <Simple simple="Yes, I want everyone to see it">I want to deploy to production</Simple></label>
          </ActionForm>
          </div>
        </div>
      ) : null}
      <section className="panel" aria-labelledby="hist">
        <h2 id="hist" className="px-5 pt-4 text-lg"><Simple simple="Past versions">History</Simple></h2>
        {deployments?.length ? (
          <ul className="divide-y divide-border">
            {deployments.map((d) => (
              <li key={d.id} data-guide={`deploy-${d.environment}-${d.status}`} className="px-5 py-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={d.status} /><strong><Simple simple={d.environment === "production" ? "online for everyone" : d.environment === "preview" ? "private preview" : undefined}>{d.environment}</Simple></strong><span className="text-muted">{d.kind === "rollback" ? "rollback · " : ""}{d.provider} · {timeAgo(d.created_at)}{d.commit_sha ? ` · ${d.commit_sha.slice(0, 7)}` : ""}{d.requested_by_agent ? " · by an agent" : ""}</span>
                  {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-xs text-accent">{d.url}</a> : null}
                  {manage && d.version_id && ["superseded", "rolled_back"].includes(d.status) ? (
                    <ActionForm action={rollback} submitLabel="Roll back to this" submitClassName="btn btn-secondary min-h-8 px-3 text-xs" className="ml-auto" confirm="Send all traffic back to this version?">
                      <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="environment" value={d.environment} /><input type="hidden" name="target" value={d.id} />
                    </ActionForm>
                  ) : null}
                </div>
                {d.error ? <p className="mt-1 text-danger"><Simple simple={simplifyMessage(d.error)}>{d.error}</Simple></p> : null}
                {(d.log as Log)?.length ? (
                  <details className="mt-2"><summary className="cursor-pointer font-semibold"><Simple simple="Show the technical details">Steps</Simple></summary>
                    <ol className="mt-1 grid gap-0.5 font-mono text-xs">{(d.log as Log).map((l, i) => <li key={i}><span className="text-muted">{l.at.slice(11, 19)}</span> {l.message}</li>)}</ol>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <div className="p-5"><EmptyState icon="rocket" title="Nothing deployed yet" action={{ label: "Deploy a preview", href: "#deploy" }} secondary={{ label: "Check readiness in QA", href: `/projects/${project.id}/qa?view=readiness` }}><Simple simple="Your app isn't online yet. When it is, each version shows up here with its web address. If a new version has a problem, one click takes you back to the old one.">Each deployment appears here with its URL, status and a one-click rollback. Start with a preview; promote it when you&apos;re happy.</Simple></EmptyState></div>}
      </section>
    </div>
  );
}
