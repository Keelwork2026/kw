import { INTEGRATIONS, type Integration } from "./catalog";

export type HubProject = { id: string; name: string; backend: string | null; deploy_target: string | null };
export type HubSecret = { project_id: string; name: string; updated_at: string };
export type HubWorkflow = { project_id: string; definition: unknown };

export type ConnectorState = "connected" | "setup" | "available";
export type ConnectorView = {
  integration: Integration;
  state: ConnectorState;
  /** Projects holding every secret it needs. */
  connected: { id: string; name: string; since: string }[];
  /** Projects holding some of its secrets, with what's missing. */
  partial: { id: string; name: string; missing: string[] }[];
  /** Why it's suggested, from what the workspace actually uses. Empty when it isn't. */
  reasons: string[];
};

function stepTypes(def: unknown): string[] {
  const steps = (def as { steps?: { type?: unknown }[] } | null)?.steps;
  return Array.isArray(steps) ? steps.map((s) => String(s?.type ?? "")) : [];
}

/**
 * Works out, for the whole workspace, which connectors are connected (and
 * where), which need setup, and which are worth suggesting because of the
 * stacks and automations already in use. Never invents usage.
 */
export function connectorViews(projects: HubProject[], secrets: HubSecret[], workflows: HubWorkflow[]): ConnectorView[] {
  const byProject = new Map<string, Map<string, string>>();
  for (const s of secrets) {
    const m = byProject.get(s.project_id) ?? new Map<string, string>();
    const prev = m.get(s.name);
    if (!prev || s.updated_at > prev) m.set(s.name, s.updated_at);
    byProject.set(s.project_id, m);
  }
  const emailSteps = new Set(workflows.filter((w) => stepTypes(w.definition).includes("email")).map((w) => w.project_id));
  const slackSteps = new Set(workflows.filter((w) => stepTypes(w.definition).includes("slack")).map((w) => w.project_id));

  return INTEGRATIONS.map((integration) => {
    const names = integration.secrets.map((s) => s.name);
    const connected: ConnectorView["connected"] = [];
    const partial: ConnectorView["partial"] = [];
    for (const p of projects) {
      const held = byProject.get(p.id);
      if (!held) continue;
      const have = names.filter((n) => held.has(n));
      if (have.length === names.length) connected.push({ id: p.id, name: p.name, since: have.map((n) => held.get(n)!).sort().at(-1)! });
      else if (have.length) partial.push({ id: p.id, name: p.name, missing: names.filter((n) => !held.has(n)) });
    }
    const without = (ids: Set<string> | ((p: HubProject) => boolean)) => projects.filter((p) => (typeof ids === "function" ? ids(p) : ids.has(p.id)) && !connected.some((c) => c.id === p.id));
    const reasons: string[] = [];
    const list = (ps: HubProject[]) => ps.slice(0, 2).map((p) => p.name).join(", ") + (ps.length > 2 ? ` and ${ps.length - 2} more` : "");
    if (integration.id === "resend") { const ps = without(emailSteps); if (ps.length) reasons.push(`Email steps in automations need it (${list(ps)})`); }
    if (integration.id === "slack") { const ps = without(slackSteps); if (ps.length) reasons.push(`Slack steps in automations need it (${list(ps)})`); }
    if (integration.id === "cloudflare") { const ps = without((p) => p.deploy_target === "cloudflare"); if (ps.length) reasons.push(`Deploys to Cloudflare need it (${list(ps)})`); }
    if (integration.id === "vercel") { const ps = without((p) => p.deploy_target === "vercel"); if (ps.length) reasons.push(`Deploys to Vercel need it (${list(ps)})`); }
    if (integration.id === "database") { const ps = without((p) => !p.backend || p.backend === "supabase" || p.backend === "postgres"); if (ps.length) reasons.push(`Applying migrations needs it (${list(ps)})`); }
    if (integration.id === "appwrite") { const ps = without((p) => p.backend === "appwrite"); if (ps.length) reasons.push(`The Appwrite backend needs it (${list(ps)})`); }
    if (integration.id === "cloudbase") { const ps = without((p) => p.backend === "cloudbase"); if (ps.length) reasons.push(`The CloudBase backend needs it (${list(ps)})`); }
    const state: ConnectorState = connected.length ? "connected" : partial.length ? "setup" : "available";
    return { integration, state, connected, partial, reasons };
  });
}

/** Connections made most recently, newest first. */
export function recentConnections(views: ConnectorView[], n = 5): { integration: Integration; project: string; projectId: string; since: string }[] {
  return views.flatMap((v) => v.connected.map((c) => ({ integration: v.integration, project: c.name, projectId: c.id, since: c.since })))
    .sort((a, b) => b.since.localeCompare(a.since)).slice(0, n);
}
