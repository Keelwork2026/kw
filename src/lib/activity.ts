/**
 * The notification centre's feed, built from real records only: things
 * waiting on you (approvals, plans to review, open incidents) and what
 * happened recently (builds, QA runs, deployments). No reminders, streaks or
 * "come back" nudges — if nothing happened, the feed says so.
 */
export type ActivityItem = {
  id: string;
  kind: "approval" | "plan" | "incident" | "build" | "qa" | "deploy";
  tone: "attention" | "success" | "failure" | "info";
  title: string;
  detail: string;
  href: string;
  at: string;
  needsYou: boolean;
};

export type ActivityRaw = {
  projects: { id: string; name: string }[];
  approvals: { id: string; project_id: string; summary: string; requested_at: string }[];
  plans: { id: string; project_id: string; created_at: string }[];
  incidents: { id: string; project_id: string; title: string; status: string; last_seen: string }[];
  runs: { id: string; project_id: string; status: string; finished_at: string | null; error: string | null }[];
  qa: { id: string; project_id: string; mode: string; finished_at: string | null; readiness: { status?: string } | null }[];
  deploys: { id: string; project_id: string; environment: string; status: string; url: string | null; created_at: string; live_at: string | null; error: string | null }[];
};

const RELEASE: Record<string, string> = { ready: "ready for deployment", approved: "approved for release", conditional: "conditional pass", needs_review: "needs review", critical: "critical issues", failed: "failed", not_tested: "not tested" };
const MODE: Record<string, string> = { quick: "Quick QA", full: "Full QA", predeploy: "Pre-deployment QA", regression: "Regression QA", custom: "Custom QA" };

export function buildActivity(raw: ActivityRaw, limit = 30): ActivityItem[] {
  const name = new Map(raw.projects.map((p) => [p.id, p.name]));
  const proj = (id: string) => name.get(id) ?? "A project";
  const base = (id: string) => `/projects/${id}`;
  const out: ActivityItem[] = [];

  for (const a of raw.approvals) out.push({ id: `a-${a.id}`, kind: "approval", tone: "attention", needsYou: true, title: `${proj(a.project_id)}: an agent is waiting for you`, detail: a.summary, href: `${base(a.project_id)}#approvals`, at: a.requested_at });
  for (const p of raw.plans) out.push({ id: `p-${p.id}`, kind: "plan", tone: "attention", needsYou: true, title: `${proj(p.project_id)}: a plan is ready for review`, detail: "Nothing is built until you approve it.", href: `${base(p.project_id)}#plan`, at: p.created_at });
  for (const i of raw.incidents) out.push({ id: `i-${i.id}`, kind: "incident", tone: "failure", needsYou: true, title: `${proj(i.project_id)}: ${i.title}`, detail: i.status === "fix_proposed" ? "A fix has been proposed." : "Open incident.", href: `${base(i.project_id)}/incidents`, at: i.last_seen });
  for (const r of raw.runs) {
    if (!r.finished_at || !["succeeded", "failed"].includes(r.status)) continue;
    const ok = r.status === "succeeded";
    out.push({ id: `r-${r.id}`, kind: "build", tone: ok ? "success" : "failure", needsYou: false, title: `${proj(r.project_id)}: ${ok ? "build finished" : "build stopped"}`, detail: ok ? "Open the live preview to see the changes." : (r.error ?? "See the board for the failing task.").slice(0, 160), href: `${base(r.project_id)}#${ok ? "preview" : "board"}`, at: r.finished_at });
  }
  for (const q of raw.qa) {
    if (!q.finished_at) continue;
    const st = q.readiness?.status ?? "";
    out.push({ id: `q-${q.id}`, kind: "qa", tone: st === "ready" || st === "approved" ? "success" : st === "failed" || st === "critical" ? "failure" : "info", needsYou: false, title: `${proj(q.project_id)}: ${MODE[q.mode] ?? "QA"} finished`, detail: st ? `Release readiness: ${RELEASE[st] ?? st.replace(/_/g, " ")}.` : "See the results.", href: `${base(q.project_id)}/qa`, at: q.finished_at });
  }
  for (const d of raw.deploys) {
    const live = d.status === "live" || d.status === "done";
    const failed = d.status === "failed";
    if (!live && !failed) continue;
    out.push({ id: `d-${d.id}`, kind: "deploy", tone: live ? "success" : "failure", needsYou: false, title: `${proj(d.project_id)}: ${live ? `live in ${d.environment}` : `${d.environment} deployment failed`}`, detail: live ? (d.url ?? "Deployed.") : (d.error ?? "See the deployment log.").slice(0, 160), href: `${base(d.project_id)}/deployments`, at: (live ? d.live_at : null) ?? d.created_at });
  }
  // Things waiting on you first, then everything newest first.
  return out.sort((x, y) => Number(y.needsYou) - Number(x.needsYou) || y.at.localeCompare(x.at)).slice(0, limit);
}

/** Items newer than the time you last opened the panel (per browser). */
export function unreadCount(items: ActivityItem[], lastSeen: string | null): number {
  return items.filter((i) => !lastSeen || i.at > lastSeen).length;
}
