import { extractRefs } from "./template";

/**
 * Workflow definitions. ONE validator is used by the editor, the save
 * action and the runner, so nothing invalid is ever stored or executed.
 */
export type Condition = { left: string; op: "eq" | "neq" | "gt" | "lt" | "contains" | "exists" | "not_exists"; right?: string | number | boolean };
type Base = { id: string; dependsOn?: string[]; condition?: Condition; retries?: { max: number; backoffSeconds: number } };
export type HttpStep = Base & { type: "http"; method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; url: string; headers?: Record<string, string>; body?: string };
export type EmailStep = Base & { type: "email"; from: string; to: string; subject: string; text: string };
export type SlackStep = Base & { type: "slack"; text: string };
export type TransformStep = Base & { type: "transform"; output: Record<string, string> };
export type DelayStep = Base & { type: "delay"; seconds: number };
export type Step = HttpStep | EmailStep | SlackStep | TransformStep | DelayStep;
export type Definition = { steps: Step[] };

export const LIMITS = { steps: 25, text: 20_000, slack: 4000, delay: 86_400, retries: 5, backoff: 3600 } as const;
const ID_RE = /^[a-z][a-z0-9_]{0,39}$/;
const OPS = ["eq", "neq", "gt", "lt", "contains", "exists", "not_exists"];

export type ValidationResult = { ok: true; definition: Definition } | { ok: false; errors: string[] };

export function validateDefinition(input: unknown): ValidationResult {
  const errors: string[] = [];
  const err = (m: string) => { if (errors.length < 50) errors.push(m); };
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, errors: ["the definition must be an object with steps"] };
  const raw = (input as { steps?: unknown }).steps;
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, errors: ["add at least one step"] };
  if (raw.length > LIMITS.steps) return { ok: false, errors: [`at most ${LIMITS.steps} steps`] };

  const ids = new Set<string>();
  const steps: Step[] = [];
  const str = (v: unknown, where: string, max: number = LIMITS.text, required = true): string | undefined => {
    if (v === undefined && !required) return undefined;
    if (typeof v !== "string" || (required && v.length === 0)) { err(`${where} must be text`); return undefined; }
    if (v.length > max) err(`${where} is longer than ${max} characters`);
    return v;
  };

  raw.forEach((s: Record<string, unknown>, i) => {
    const where = `step ${i + 1}`;
    if (!s || typeof s !== "object") return err(`${where} must be an object`);
    const id = s.id;
    if (typeof id !== "string" || !ID_RE.test(id)) return err(`${where}: id must match ^[a-z][a-z0-9_]{0,39}$`);
    if (ids.has(id)) return err(`${where}: id ${id} is used twice`);
    ids.add(id);
    const base: Base = { id };
    if (s.dependsOn !== undefined) {
      if (!Array.isArray(s.dependsOn) || !s.dependsOn.every((d) => typeof d === "string")) err(`${id}: dependsOn must be a list of step ids`);
      else base.dependsOn = [...new Set(s.dependsOn as string[])];
    }
    if (s.condition !== undefined) {
      const c = s.condition as Record<string, unknown>;
      if (!c || typeof c.left !== "string" || !OPS.includes(String(c.op))) err(`${id}: condition needs left and an op (${OPS.join(", ")})`);
      else if (!["exists", "not_exists"].includes(String(c.op)) && !["string", "number", "boolean"].includes(typeof c.right)) err(`${id}: condition needs a right-hand value`);
      else base.condition = { left: c.left, op: c.op as Condition["op"], ...(c.right !== undefined ? { right: c.right as string | number | boolean } : {}) };
    }
    if (s.retries !== undefined) {
      const r = s.retries as Record<string, unknown>;
      const max = Number(r?.max), backoff = Number(r?.backoffSeconds ?? 30);
      if (!Number.isInteger(max) || max < 0 || max > LIMITS.retries) err(`${id}: retries.max must be 0-${LIMITS.retries}`);
      else if (!Number.isInteger(backoff) || backoff < 1 || backoff > LIMITS.backoff) err(`${id}: retries.backoffSeconds must be 1-${LIMITS.backoff}`);
      else base.retries = { max, backoffSeconds: backoff };
    }
    switch (s.type) {
      case "http": {
        const method = String(s.method ?? "GET").toUpperCase();
        if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) err(`${id}: method must be GET, POST, PUT, PATCH or DELETE`);
        const url = str(s.url, `${id}.url`, 2048);
        if (url && !/^https:\/\//.test(url) && !/^\{\{/.test(url)) err(`${id}: url must start with https://`);
        let headers: Record<string, string> | undefined;
        if (s.headers !== undefined) {
          if (!s.headers || typeof s.headers !== "object" || Array.isArray(s.headers)) err(`${id}: headers must be an object`);
          else {
            headers = {};
            for (const [k, v] of Object.entries(s.headers as Record<string, unknown>)) {
              if (!/^[A-Za-z0-9-]{1,64}$/.test(k)) err(`${id}: header name ${k} is invalid`);
              const hv = str(v, `${id}.headers.${k}`, 4000);
              if (hv !== undefined) headers[k] = hv;
            }
          }
        }
        const body = str(s.body, `${id}.body`, LIMITS.text, false);
        steps.push({ ...base, type: "http", method: method as HttpStep["method"], url: url ?? "", ...(headers ? { headers } : {}), ...(body !== undefined ? { body } : {}) });
        break;
      }
      case "email":
        steps.push({ ...base, type: "email", from: str(s.from, `${id}.from`, 320) ?? "", to: str(s.to, `${id}.to`, 2000) ?? "", subject: str(s.subject, `${id}.subject`, 300) ?? "", text: str(s.text, `${id}.text`) ?? "" });
        break;
      case "slack":
        steps.push({ ...base, type: "slack", text: str(s.text, `${id}.text`, LIMITS.slack) ?? "" });
        break;
      case "transform": {
        const o = s.output;
        if (!o || typeof o !== "object" || Array.isArray(o)) { err(`${id}: output must be an object of name → value`); break; }
        const output: Record<string, string> = {};
        for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
          if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(k)) err(`${id}: output key ${k} is invalid`);
          const ov = str(v, `${id}.output.${k}`);
          if (ov !== undefined) output[k] = ov;
        }
        steps.push({ ...base, type: "transform", output });
        break;
      }
      case "delay": {
        const sec = Number(s.seconds);
        if (!Number.isInteger(sec) || sec < 1 || sec > LIMITS.delay) err(`${id}: seconds must be 1-${LIMITS.delay}`);
        steps.push({ ...base, type: "delay", seconds: sec });
        break;
      }
      default:
        err(`${id}: type must be http, email, slack, transform or delay`);
    }
  });
  if (errors.length) return { ok: false, errors };

  // Dependencies exist and form no cycle.
  const byId = new Map(steps.map((s) => [s.id, s]));
  for (const s of steps) for (const d of s.dependsOn ?? []) if (!byId.has(d)) err(`${s.id} depends on unknown step ${d}`);
  if (errors.length) return { ok: false, errors };
  const ancestors = new Map<string, Set<string>>();
  const visiting = new Set<string>();
  const anc = (id: string): Set<string> => {
    if (ancestors.has(id)) return ancestors.get(id)!;
    if (visiting.has(id)) throw new Error(`steps form a cycle through ${id}`);
    visiting.add(id);
    const set = new Set<string>();
    for (const d of byId.get(id)!.dependsOn ?? []) { set.add(d); for (const a of anc(d)) set.add(a); }
    visiting.delete(id);
    ancestors.set(id, set);
    return set;
  };
  try { steps.forEach((s) => anc(s.id)); } catch (e) { return { ok: false, errors: [(e as Error).message] }; }

  // References: steps only from dependencies; secrets only in HTTP headers and body.
  const check = (s: Step, text: string, field: string, secretsAllowed: boolean) => {
    const { refs, errors: refErrors } = extractRefs(text);
    refErrors.forEach((e) => err(`${s.id}.${field}: ${e}`));
    for (const r of refs) {
      if (r.kind === "steps" && !anc(s.id).has(r.step!)) err(`${s.id}.${field}: {{steps.${r.step}…}} must be a step it depends on`);
      if (r.kind === "secrets" && !secretsAllowed) err(`${s.id}.${field}: secrets can only be used in HTTP headers and bodies`);
    }
  };
  for (const s of steps) {
    if (s.condition) check(s, s.condition.left.includes("{{") ? s.condition.left : `{{${s.condition.left}}}`, "condition", false);
    switch (s.type) {
      case "http":
        check(s, s.url, "url", false);
        for (const [k, v] of Object.entries(s.headers ?? {})) check(s, v, `headers.${k}`, true);
        if (s.body !== undefined) check(s, s.body, "body", true);
        break;
      case "email": check(s, s.from, "from", false); check(s, s.to, "to", false); check(s, s.subject, "subject", false); check(s, s.text, "text", false); break;
      case "slack": check(s, s.text, "text", false); break;
      case "transform": for (const [k, v] of Object.entries(s.output)) check(s, v, `output.${k}`, false); break;
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, definition: { steps } };
}

/** Steps in dependency order. */
export function topoOrder(def: Definition): Step[] {
  const done = new Set<string>(), out: Step[] = [];
  const byId = new Map(def.steps.map((s) => [s.id, s]));
  const visit = (s: Step) => { if (done.has(s.id)) return; for (const d of s.dependsOn ?? []) visit(byId.get(d)!); done.add(s.id); out.push(s); };
  def.steps.forEach(visit);
  return out;
}

export function secretNamesUsed(def: Definition): string[] {
  const names = new Set<string>();
  for (const s of def.steps) {
    if (s.type !== "http") continue;
    for (const t of [...Object.values(s.headers ?? {}), s.body ?? ""]) for (const r of extractRefs(t).refs) if (r.kind === "secrets") names.add(r.path[0]!);
  }
  return [...names];
}
