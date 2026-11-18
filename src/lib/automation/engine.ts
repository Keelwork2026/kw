import { topoOrder, type Definition, type Step, type Condition } from "./definition";
import { renderDeep, render, type TemplateContext } from "./template";
import { redactSecrets } from "@/lib/secrets/redact";

export class TemporaryError extends Error {}

export type StepRecord = { stepId: string; attempt: number; status: "succeeded" | "failed" | "skipped"; output?: unknown; error?: string };
export type PriorAttempt = StepRecord & { finishedAt: number };

export type Executors = {
  http: (req: { method: string; url: string; headers: Record<string, string>; body?: string }) => Promise<unknown>;
  email: (msg: { from: string; to: string; subject: string; text: string }) => Promise<unknown>;
  slack: (msg: { text: string }) => Promise<unknown>;
};

export type EngineInput = {
  definition: Definition;
  trigger: unknown;
  secrets: Record<string, string>;
  /** Attempts already stored for this run (resume after the last finished step). */
  prior: PriorAttempt[];
  executors: Executors;
  now: number;
  /** Stops a single invocation from running forever. */
  maxStepsPerInvocation?: number;
};

export type EngineOutcome = {
  records: StepRecord[];
  status: "succeeded" | "failed" | "waiting";
  nextAttemptAt?: number;
  error?: string;
};

function evaluate(c: Condition, ctx: TemplateContext): boolean {
  const v = render(c.left.includes("{{") ? c.left : `{{${c.left}}}`, ctx);
  const exists = v !== undefined && v !== null && v !== "";
  switch (c.op) {
    case "exists": return exists;
    case "not_exists": return !exists;
    case "eq": return v === c.right || String(v) === String(c.right);
    case "neq": return !(v === c.right || String(v) === String(c.right));
    case "gt": return Number(v) > Number(c.right);
    case "lt": return Number(v) < Number(c.right);
    case "contains": return typeof v === "string" ? v.includes(String(c.right)) : Array.isArray(v) ? v.map(String).includes(String(c.right)) : false;
  }
}

/**
 * Runs as much of a workflow as it can right now. Steps run in dependency
 * order; finished steps are skipped on resume; conditions skip a step;
 * delays and retries return "waiting" with the time to come back; every
 * attempt is recorded with known secret values scrubbed.
 */
export async function runWorkflow(input: EngineInput): Promise<EngineOutcome> {
  const scrub = (v: unknown) => JSON.parse(redactSecrets(JSON.stringify(v ?? null), Object.values(input.secrets)));
  const records: StepRecord[] = [];
  const outputs: Record<string, unknown> = {};
  const finished = new Map<string, PriorAttempt>();
  const attempts = new Map<string, PriorAttempt[]>();
  for (const p of input.prior) {
    attempts.set(p.stepId, [...(attempts.get(p.stepId) ?? []), p]);
    if (p.status !== "failed") { finished.set(p.stepId, p); outputs[p.stepId] = p.output; }
  }
  const ctx = (): TemplateContext => ({ trigger: input.trigger, steps: outputs, secrets: input.secrets });
  let budget = input.maxStepsPerInvocation ?? 100;
  let waitUntil: number | undefined;

  for (const step of topoOrder(input.definition)) {
    if (finished.has(step.id)) continue;
    const deps = step.dependsOn ?? [];
    // A dependency that is still a pending delay holds this step back.
    const pendingDelay = deps.map((d) => finished.get(d)).find((f) => f && (f.output as { until?: number } | undefined)?.until && (f.output as { until: number }).until > input.now);
    if (pendingDelay) { waitUntil = Math.min(waitUntil ?? Infinity, (pendingDelay.output as { until: number }).until); continue; }
    if (deps.some((d) => !finished.has(d))) continue;
    if (budget-- <= 0) return { records, status: "waiting", nextAttemptAt: input.now };

    const prev = attempts.get(step.id) ?? [];
    const attempt = prev.length + 1;
    if (step.condition && !evaluate(step.condition, ctx())) {
      const rec: StepRecord = { stepId: step.id, attempt, status: "skipped", output: null };
      records.push(rec); finished.set(step.id, { ...rec, finishedAt: input.now }); outputs[step.id] = null;
      continue;
    }
    if (step.type === "delay") {
      const rec: StepRecord = { stepId: step.id, attempt, status: "succeeded", output: { until: input.now + step.seconds * 1000 } };
      records.push(rec); finished.set(step.id, { ...rec, finishedAt: input.now }); outputs[step.id] = rec.output;
      waitUntil = Math.min(waitUntil ?? Infinity, input.now + step.seconds * 1000);
      continue;
    }
    // Retry backoff: a failed attempt waits backoff * 2^(n-1) seconds (capped) before the next.
    const last = prev.at(-1);
    if (last && step.retries) {
      const delay = Math.min(step.retries.backoffSeconds * 2 ** (prev.length - 1), 3600) * 1000;
      if (last.finishedAt + delay > input.now) { waitUntil = Math.min(waitUntil ?? Infinity, last.finishedAt + delay); continue; }
    }
    try {
      const output = await execute(step, ctx(), input.executors);
      const rec: StepRecord = { stepId: step.id, attempt, status: "succeeded", output: scrub(output) };
      records.push(rec); finished.set(step.id, { ...rec, finishedAt: input.now }); outputs[step.id] = output;
    } catch (e) {
      const message = redactSecrets((e as Error).message, Object.values(input.secrets)).slice(0, 1000);
      records.push({ stepId: step.id, attempt, status: "failed", error: message });
      const retryable = e instanceof TemporaryError;
      const max = step.retries?.max ?? 0;
      if (retryable && attempt <= max) {
        const delay = Math.min((step.retries?.backoffSeconds ?? 30) * 2 ** (attempt - 1), 3600) * 1000;
        waitUntil = Math.min(waitUntil ?? Infinity, input.now + delay);
        continue;
      }
      return { records, status: "failed", error: `${step.id}: ${message}` };
    }
  }
  const delayed = (id: string) => {
    const o = finished.get(id)?.output as { until?: number } | null | undefined;
    return typeof o?.until === "number" && o.until > input.now;
  };
  const all = input.definition.steps.every((s) => finished.has(s.id) && !delayed(s.id));
  if (all) return { records, status: "succeeded" };
  return { records, status: "waiting", nextAttemptAt: waitUntil ?? input.now + 30_000 };
}

async function execute(step: Step, ctx: TemplateContext, ex: Executors): Promise<unknown> {
  switch (step.type) {
    case "http": {
      const headers = renderDeep(step.headers ?? {}, ctx) as Record<string, unknown>;
      return ex.http({
        method: step.method, url: String(render(step.url, ctx)),
        headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, String(v)])),
        body: step.body !== undefined ? String(render(step.body, ctx)) : undefined,
      });
    }
    case "email":
      return ex.email({ from: String(render(step.from, ctx)), to: String(render(step.to, ctx)), subject: String(render(step.subject, ctx)), text: String(render(step.text, ctx)) });
    case "slack":
      return ex.slack({ text: String(render(step.text, ctx)).slice(0, 4000) });
    case "transform":
      return renderDeep(step.output, ctx);
    case "delay":
      return null;
  }
}
