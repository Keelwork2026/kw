/**
 * Where a project is, and the most useful next steps — computed only from
 * the project's real state. This is how Keelwork shows progress and
 * introduces features at the moment they become useful (progressive
 * discovery), without streaks, countdowns, random rewards or "don't lose
 * your work" pressure. If nothing useful is left to do, it says so.
 */

export type JourneyState = {
  projectId: string;
  described: boolean;
  plan: "none" | "draft" | "approved";
  run: "none" | "active" | "waiting_approval" | "succeeded" | "failed" | "cancelled";
  runFinishedAt: string | null;
  sandbox: "none" | "starting" | "running" | "stopped" | "failed";
  pendingApprovals: number;
  openIncidents: number;
  qa: {
    lastRunAt: string | null;
    release: string | null; // readiness status of the latest completed run
    openBlocking: number; // open critical + high issues
    openOther: number;
  };
  deploy: { preview: boolean; production: boolean; productionUrl: string | null };
  canWrite: boolean;
};

export type StageKey = "describe" | "plan" | "build" | "preview" | "test" | "deploy";
export type Stage = { key: StageKey; label: string; status: "done" | "current" | "upcoming"; href: string };
export type Suggestion = { key: string; title: string; why: string; href: string; kind: "attention" | "next" | "discover" };

const LABELS: Record<StageKey, string> = { describe: "Describe", plan: "Plan", build: "Build", preview: "Preview", test: "Test", deploy: "Deploy" };

export function stages(s: JourneyState): Stage[] {
  const base = `/projects/${s.projectId}`;
  const done: Record<StageKey, boolean> = {
    describe: s.described,
    plan: s.plan === "approved",
    build: s.run === "succeeded",
    preview: s.sandbox === "running",
    test: s.qa.lastRunAt !== null,
    deploy: s.deploy.production,
  };
  const href: Record<StageKey, string> = {
    describe: `${base}#chat`, plan: `${base}#plan`, build: `${base}#board`, preview: `${base}#preview`, test: `${base}/qa`, deploy: `${base}/deployments`,
  };
  const order: StageKey[] = ["describe", "plan", "build", "preview", "test", "deploy"];
  const current = order.find((k) => !done[k]);
  return order.map((key) => ({ key, label: LABELS[key], href: href[key], status: done[key] ? "done" : key === current ? "current" : "upcoming" }));
}

/** Up to `limit` suggestions: things that need attention first, then the next step, then one feature worth discovering now. */
export function suggestions(s: JourneyState, limit = 3): Suggestion[] {
  const base = `/projects/${s.projectId}`;
  const out: Suggestion[] = [];
  const add = (x: Suggestion) => { if (!out.some((o) => o.key === x.key)) out.push(x); };
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

  // 1. Things waiting on you
  if (s.pendingApprovals > 0) add({ key: "approvals", kind: "attention", title: `Review ${n(s.pendingApprovals, "request", "requests")} from the agents`, why: "An agent is paused until you approve or decline.", href: `${base}#approvals` });
  if (s.run === "failed") add({ key: "run-failed", kind: "attention", title: "See why the last build stopped", why: "The board shows the failing task and its error.", href: `${base}#board` });
  if (s.openIncidents > 0) add({ key: "incidents", kind: "attention", title: `Look at ${n(s.openIncidents, "open incident", "open incidents")}`, why: "Something in the app or its checks is failing.", href: `${base}/incidents` });
  if (s.qa.openBlocking > 0) add({ key: "qa-blocking", kind: "attention", title: `Fix ${n(s.qa.openBlocking, "high-priority QA issue", "high-priority QA issues")}`, why: "Select them in QA and ask the agents to propose a fix.", href: `${base}/qa?view=issues` });

  // 2. The next step along the journey
  if (!s.described) add({ key: "describe", kind: "next", title: "Describe what you want to build", why: "One or two sentences is enough; the planner asks about the rest.", href: `${base}#chat` });
  else if (s.plan === "none") add({ key: "plan", kind: "next", title: "Plan it with the AI", why: "The Software Architect turns your idea into a plan you approve.", href: `${base}#chat` });
  else if (s.plan === "draft") add({ key: "approve", kind: "next", title: "Review and approve the plan", why: "Nothing is built until you approve it.", href: `${base}#plan` });
  else if (s.run === "active" || s.run === "waiting_approval") add({ key: "watch", kind: "next", title: "Watch the build", why: "Each agent's task and output appear on the board as it works.", href: `${base}#board` });
  else if (s.run === "none" || s.run === "cancelled") add({ key: "build", kind: "next", title: "Start the build", why: "The plan is approved; the agents build it in your sandbox.", href: `${base}#board` });
  else if (s.sandbox !== "running") add({ key: "preview", kind: "next", title: "Open the live preview", why: "See the app running and click through it.", href: `${base}#preview` });
  else if (!s.qa.lastRunAt) add({ key: "qa", kind: "discover", title: "Test it with Quick QA", why: "Checks pages, links, security headers, accessibility and layout in a few minutes.", href: `${base}/qa` });
  else if (s.runFinishedAt && s.qa.lastRunAt < s.runFinishedAt) add({ key: "qa-again", kind: "next", title: "Re-test the latest build", why: "The app changed after the last QA run.", href: `${base}/qa` });
  else if (!s.deploy.production && (s.qa.release === "ready" || s.qa.release === "approved" || s.qa.release === "conditional")) add({ key: "deploy", kind: "next", title: s.deploy.preview ? "Promote to production" : "Deploy a preview, then production", why: s.qa.release === "conditional" ? "QA passed with open high-severity issues; review them before going live." : "QA found nothing blocking.", href: `${base}/deployments` });
  else if (!s.deploy.production && s.qa.openBlocking === 0) add({ key: "qa-review", kind: "next", title: "See what QA found", why: "Release readiness explains what's left before deploying.", href: `${base}/qa?view=readiness` });

  // 3. One feature that becomes useful at this point
  if (s.deploy.production) {
    add({ key: "analytics", kind: "discover", title: "See who's visiting", why: "Cookieless visitor stats for the live app; no consent banner needed.", href: `${base}/analytics` });
    add({ key: "automations", kind: "discover", title: "Automate a routine task", why: "Webhooks, schedules and workflows that run on their own.", href: `${base}/automations` });
  } else if (s.sandbox === "running") {
    add({ key: "design", kind: "discover", title: "Restyle by clicking", why: "Turn on Design mode in the preview and click any element to change it.", href: `${base}#preview` });
  } else if (s.plan === "approved") {
    add({ key: "database", kind: "discover", title: "Look at the data model", why: "Tables, policies and migrations the agents created.", href: `${base}/database` });
  }
  if (s.qa.openOther > 0 && !out.some((o) => o.key === "qa-blocking")) add({ key: "qa-other", kind: "next", title: `Polish ${n(s.qa.openOther, "smaller QA finding", "smaller QA findings")}`, why: "Medium and low issues: quick wins for quality.", href: `${base}/qa?view=issues` });

  const visible = s.canWrite ? out : out.filter((o) => o.kind !== "next" || ["watch", "qa-review"].includes(o.key));
  return visible.slice(0, limit);
}
