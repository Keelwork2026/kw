import type { Condition, Definition, Step } from "./definition";
import { topoOrder } from "./definition";

/** Plain-words descriptions of workflows for the hub, the diagram and the run history. */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const pad = (n: string) => n.padStart(2, "0");

export function describeSchedule(expr: string | null | undefined): string {
  if (!expr) return "On a schedule";
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) return `Schedule ${expr} (UTC)`;
  const [m, h, dom, mon, dow] = f as [string, string, string, string, string];
  const at = /^\d+$/.test(m) && /^\d+$/.test(h) ? `${pad(h)}:${pad(m)} UTC` : null;
  if (/^\*\/(\d+)$/.test(m) && h === "*" && dom === "*" && mon === "*" && dow === "*") return `Every ${m.slice(2)} minutes`;
  if (/^\d+$/.test(m) && h === "*" && dom === "*" && mon === "*" && dow === "*") return `Every hour at :${pad(m)}`;
  if (at && dom === "*" && mon === "*") {
    if (dow === "*") return `Every day at ${at}`;
    if (dow === "1-5" || dow.toUpperCase() === "MON-FRI") return `Weekdays at ${at}`;
    if (/^[0-6]$/.test(dow)) return `Every ${DAYS[Number(dow)]} at ${at}`;
  }
  if (at && /^\d+$/.test(dom) && mon === "*" && dow === "*") return `On day ${dom} of each month at ${at}`;
  return `Schedule ${expr} (UTC)`;
}

export function describeTrigger(kind: string, schedule?: string | null): string {
  return kind === "schedule" ? describeSchedule(schedule) : kind === "webhook" ? "When a signed webhook arrives" : "When you press Run";
}

const OP: Record<Condition["op"], string> = { eq: "is", neq: "isn't", gt: "is more than", lt: "is less than", contains: "contains", exists: "is filled in", not_exists: "is empty" };
export function describeCondition(c: Condition): string {
  const left = c.left.replace(/^trigger\.body\./, "").replace(/^steps\.([a-z0-9_]+)\.output\./, "$1 → ").replace(/_/g, " ");
  return `only if ${left} ${OP[c.op]}${c.right !== undefined ? ` ${JSON.stringify(c.right)}` : ""}`;
}

export function describeStep(s: Step): { title: string; detail: string } {
  switch (s.type) {
    case "http": { let host = s.url; try { host = new URL(s.url).host; } catch { /* template url */ } return { title: `${s.method} request`, detail: host }; }
    case "email": return { title: "Send email", detail: s.subject };
    case "slack": return { title: "Post to Slack", detail: s.text.length > 60 ? `${s.text.slice(0, 57)}…` : s.text };
    case "transform": return { title: "Reshape data", detail: Object.keys(s.output).join(", ") };
    case "delay": { const sec = s.seconds; return { title: "Wait", detail: sec % 86400 === 0 ? `${sec / 86400} day${sec === 86400 ? "" : "s"}` : sec % 3600 === 0 ? `${sec / 3600} hour${sec === 3600 ? "" : "s"}` : sec % 60 === 0 ? `${sec / 60} min` : `${sec} s` }; }
  }
}

/** Connectors a workflow needs, by catalogue id. */
export function connectorsUsed(def: Definition | null | undefined): string[] {
  const types = new Set((def?.steps ?? []).map((s) => s.type));
  return [...(types.has("email") ? ["resend"] : []), ...(types.has("slack") ? ["slack"] : [])];
}

export type DiagramNode = { id: string; kind: Step["type"] | "trigger"; title: string; detail: string; after: string[]; condition?: string; retries?: string };

/** Nodes for the visual workflow: the trigger, then steps in the order they run. */
export function diagram(trigger: string, schedule: string | null | undefined, def: Definition | null | undefined): DiagramNode[] {
  const nodes: DiagramNode[] = [{ id: "trigger", kind: "trigger", title: trigger === "schedule" ? "Schedule" : trigger === "webhook" ? "Webhook" : "Manual", detail: describeTrigger(trigger, schedule), after: [] }];
  if (!def?.steps?.length) return nodes;
  let ordered: Step[];
  try { ordered = topoOrder(def); } catch { ordered = def.steps; }
  for (const s of ordered) {
    const d = describeStep(s);
    nodes.push({ id: s.id, kind: s.type, title: d.title, detail: d.detail, after: s.dependsOn ?? [], ...(s.condition ? { condition: describeCondition(s.condition) } : {}), ...(s.retries ? { retries: `retries ${s.retries.max}×` } : {}) });
  }
  return nodes;
}

export type RunLite = { workflow_id: string; status: string; created_at: string };
export type Health = "healthy" | "failing" | "idle";

/** A workflow needs attention when its latest finished run failed. */
export function workflowHealth(runs: RunLite[], workflowId: string): { health: Health; last?: RunLite; failed7d: number } {
  const mine = runs.filter((r) => r.workflow_id === workflowId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const finished = mine.find((r) => ["succeeded", "failed"].includes(r.status));
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  return { health: !finished ? "idle" : finished.status === "failed" ? "failing" : "healthy", last: mine[0], failed7d: mine.filter((r) => r.status === "failed" && r.created_at >= weekAgo).length };
}
