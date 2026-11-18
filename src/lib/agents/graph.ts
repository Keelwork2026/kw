import type { Plan } from "@/lib/ai/plan";

export type AgentId = "architect" | "database" | "backend" | "frontend" | "integrations" | "qa" | "security" | "docs";

export const AGENTS: { id: AgentId; name: string; role: string; route: "reason" | "code" }[] = [
  { id: "architect", name: "Software Architect", role: "Sets up the project structure and conventions every other agent follows.", route: "reason" },
  { id: "database", name: "Database Engineer", role: "Writes migrations with row-level security for every table.", route: "code" },
  { id: "backend", name: "Backend Developer", role: "Builds server actions, API routes, sign-in rules and business logic.", route: "code" },
  { id: "frontend", name: "Frontend Developer", role: "Builds pages and components that are responsive and accessible.", route: "code" },
  { id: "integrations", name: "API Integration", role: "Connects third-party services and builds automations.", route: "code" },
  { id: "qa", name: "Quality Assurance", role: "Writes and runs tests; a task is only done when its tests ran.", route: "code" },
  { id: "security", name: "Cybersecurity", role: "Independently reviews access rules, secrets and risky changes.", route: "reason" },
  { id: "docs", name: "Technical Documentation", role: "Keeps the README and setup notes in step with the code.", route: "code" },
];

export type TaskSpec = { key: string; agent: AgentId; title: string; deps: string[] };

export function slugify(text: string): string {
  const s = text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return s || "item";
}

/**
 * Builds the task graph for an approved plan. Each task depends on the ones
 * listed before it in the build order; fe/int/auto tasks run in parallel
 * after the API, and QA waits for all of them.
 */
export function buildTaskGraph(plan: Plan): TaskSpec[] {
  const tasks: TaskSpec[] = [];
  const used = new Set<string>();
  const key = (base: string) => {
    let k = base, n = 2;
    while (used.has(k)) k = `${base}-${n++}`;
    used.add(k);
    return k;
  };
  const add = (base: string, agent: AgentId, title: string, deps: string[]) => {
    const k = key(base);
    tasks.push({ key: k, agent, title, deps });
    return k;
  };

  const scaffold = add("arch.scaffold", "architect", "Set up the project structure and conventions", []);
  const schema = add("db.schema", "database", `Create ${plan.data.length || "the"} table${plan.data.length === 1 ? "" : "s"} with row-level security`, [scaffold]);
  const policies = add("sec.policies", "security", "Review the row-level security policies", [schema]);
  let last = policies;
  if (plan.roles.length > 0) last = add("be.auth", "backend", `Sign-in and roles: ${plan.roles.join(", ")}`.slice(0, 200), [policies]);
  const api = add("be.api", "backend", "Server actions and API routes", [last]);

  const fanOut: string[] = [];
  for (const page of plan.pages.slice(0, 30)) fanOut.push(add(`fe.${slugify(page)}`, "frontend", `Build the ${page} page`.slice(0, 200), [api]));
  for (const integ of plan.integrations) fanOut.push(add(`int.${slugify(integ)}`, "integrations", `Connect ${integ}`.slice(0, 200), [api]));
  plan.automations.forEach((auto, i) => fanOut.push(add(`auto.${i + 1}`, "integrations", `Automation: ${auto}`.slice(0, 200), [api])));

  const qa = add("qa.tests", "qa", "Write and run the tests", fanOut.length ? fanOut : [api]);
  const review = add("sec.review", "security", "Final security review", [qa]);
  add("docs.readme", "docs", "Update the README and setup notes", [review]);
  assertAcyclic(tasks);
  return tasks;
}

/** Throws on unknown dependencies or cycles. */
export function assertAcyclic(tasks: { key: string; deps: string[] }[]): void {
  const keys = new Set(tasks.map((t) => t.key));
  if (keys.size !== tasks.length) throw new Error("duplicate task keys");
  for (const t of tasks) for (const d of t.deps) if (!keys.has(d)) throw new Error(`task ${t.key} depends on unknown task ${d}`);
  const state = new Map<string, 0 | 1 | 2>();
  const byKey = new Map(tasks.map((t) => [t.key, t]));
  const visit = (k: string) => {
    const s = state.get(k) ?? 0;
    if (s === 1) throw new Error(`cycle through ${k}`);
    if (s === 2) return;
    state.set(k, 1);
    for (const d of byKey.get(k)!.deps) visit(d);
    state.set(k, 2);
  };
  for (const t of tasks) visit(t.key);
}

/** Blocked tasks whose dependencies are all done. */
export function newlyReady(tasks: { key: string; status: string; deps: string[] }[]): string[] {
  const status = new Map(tasks.map((t) => [t.key, t.status]));
  return tasks.filter((t) => t.status === "blocked" && t.deps.every((d) => status.get(d) === "done")).map((t) => t.key);
}
