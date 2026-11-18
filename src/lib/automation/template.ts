/**
 * Template references inside workflow steps:
 *   {{trigger.body.x}}  {{steps.<id>.output.<path>}}  {{secrets.NAME}}
 */
export type Ref = { raw: string; kind: "trigger" | "steps" | "secrets"; step?: string; path: string[] };

const REF_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function extractRefs(text: string): { refs: Ref[]; errors: string[] } {
  const refs: Ref[] = [], errors: string[] = [];
  for (const m of text.matchAll(REF_RE)) {
    const parts = m[1]!.split(".");
    if (parts.some((p) => !/^[A-Za-z0-9_-]{1,64}$/.test(p))) { errors.push(`bad reference {{${m[1]}}}`); continue; }
    if (parts[0] === "trigger" && parts.length >= 2) refs.push({ raw: m[0], kind: "trigger", path: parts.slice(1) });
    else if (parts[0] === "steps" && parts.length >= 3 && parts[2] === "output") refs.push({ raw: m[0], kind: "steps", step: parts[1], path: parts.slice(3) });
    else if (parts[0] === "secrets" && parts.length === 2 && /^[A-Z][A-Z0-9_]{1,63}$/.test(parts[1]!)) refs.push({ raw: m[0], kind: "secrets", path: [parts[1]!] });
    else errors.push(`unknown reference {{${m[1]}}}`);
  }
  return { refs, errors };
}

export type TemplateContext = { trigger: unknown; steps: Record<string, unknown>; secrets: Record<string, string> };

function dig(v: unknown, path: string[]): unknown {
  let cur = v;
  for (const p of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function resolveRef(ref: Ref, ctx: TemplateContext): unknown {
  if (ref.kind === "trigger") return dig(ctx.trigger, ref.path);
  if (ref.kind === "steps") return dig(ctx.steps[ref.step!], ref.path);
  return ctx.secrets[ref.path[0]!];
}

/** Renders a string; a value that is exactly one reference keeps its type. */
export function render(text: string, ctx: TemplateContext): unknown {
  const whole = /^\{\{\s*([^{}]+?)\s*\}\}$/.exec(text);
  if (whole) {
    const { refs } = extractRefs(text);
    return refs[0] ? resolveRef(refs[0], ctx) ?? "" : text;
  }
  return text.replace(REF_RE, (raw) => {
    const { refs } = extractRefs(raw);
    const v = refs[0] ? resolveRef(refs[0], ctx) : undefined;
    return v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  });
}

export function renderDeep(value: unknown, ctx: TemplateContext): unknown {
  if (typeof value === "string") return render(value, ctx);
  if (Array.isArray(value)) return value.map((v) => renderDeep(v, ctx));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, renderDeep(v, ctx)]));
  return value;
}
