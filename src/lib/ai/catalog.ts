/**
 * The provider-neutral AI catalogue, read from AI_MODEL_CATALOG (JSON).
 * Validated without dependencies so it can run anywhere (web, worker).
 */
export const ROUTES = ["plan", "reason", "chat", "code", "review"] as const;
export type Route = (typeof ROUTES)[number];

export type ModelSpec = {
  id: string;
  provider: "openai-compatible";
  model: string;
  baseUrl: string;
  apiKeyEnv: string;
  /** Price in micros (USD millionths) per million input tokens. */
  inputPerMTokMicros: number;
  /** Price in micros per million output tokens. */
  outputPerMTokMicros: number;
  maxOutputTokens: number;
};

export type Catalog = { models: ModelSpec[]; routes: Partial<Record<Route, string[]>> };

export class CatalogError extends Error {}

const ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const ENV_RE = /^[A-Z][A-Z0-9_]{1,63}$/;

function isNonNegInt(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}

export function parseCatalog(raw: string | unknown): Catalog {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try { data = JSON.parse(raw); } catch { throw new CatalogError("AI_MODEL_CATALOG is not valid JSON"); }
  }
  if (!data || typeof data !== "object") throw new CatalogError("catalogue must be an object");
  const { models, routes } = data as { models?: unknown; routes?: unknown };
  if (!Array.isArray(models) || models.length === 0) throw new CatalogError("catalogue needs at least one model");

  const out: ModelSpec[] = [];
  for (const m of models as Record<string, unknown>[]) {
    const id = m?.id;
    if (typeof id !== "string" || !ID_RE.test(id)) throw new CatalogError("model id is invalid");
    if (out.some((x) => x.id === id)) throw new CatalogError(`model ${id} is listed twice`);
    if (m.provider !== "openai-compatible") throw new CatalogError(`model ${id}: unsupported provider`);
    if (typeof m.model !== "string" || !m.model) throw new CatalogError(`model ${id}: model name missing`);
    if (typeof m.baseUrl !== "string") throw new CatalogError(`model ${id}: baseUrl missing`);
    let url: URL;
    try { url = new URL(m.baseUrl); } catch { throw new CatalogError(`model ${id}: baseUrl is not a URL`); }
    if (url.protocol !== "https:") throw new CatalogError(`model ${id}: baseUrl must use https`);
    if (typeof m.apiKeyEnv !== "string" || !ENV_RE.test(m.apiKeyEnv)) throw new CatalogError(`model ${id}: apiKeyEnv is invalid`);
    // Billing uses exactly these numbers, so a model without a price is refused.
    if (!isNonNegInt(m.inputPerMTokMicros) || !isNonNegInt(m.outputPerMTokMicros)) {
      throw new CatalogError(`model ${id} has no price; refusing to use it`);
    }
    if (!isNonNegInt(m.maxOutputTokens) || m.maxOutputTokens < 1 || m.maxOutputTokens > 200_000) {
      throw new CatalogError(`model ${id}: maxOutputTokens is invalid`);
    }
    out.push({
      id, provider: "openai-compatible", model: m.model, baseUrl: url.toString().replace(/\/$/, ""),
      apiKeyEnv: m.apiKeyEnv, inputPerMTokMicros: m.inputPerMTokMicros, outputPerMTokMicros: m.outputPerMTokMicros,
      maxOutputTokens: m.maxOutputTokens,
    });
  }

  const r: Partial<Record<Route, string[]>> = {};
  if (!routes || typeof routes !== "object") throw new CatalogError("catalogue needs routes");
  for (const [name, list] of Object.entries(routes as Record<string, unknown>)) {
    if (!(ROUTES as readonly string[]).includes(name)) throw new CatalogError(`unknown route ${name}`);
    if (!Array.isArray(list) || list.length === 0) throw new CatalogError(`route ${name} needs models`);
    for (const id of list) {
      if (typeof id !== "string" || !out.some((x) => x.id === id)) throw new CatalogError(`route ${name} names unknown model ${String(id)}`);
    }
    r[name as Route] = list as string[];
  }
  for (const required of ["plan", "chat", "code", "review"] as const) {
    if (!r[required]) throw new CatalogError(`route ${required} is missing`);
  }
  return { models: out, routes: r };
}

/** Returns the ordered models for a route. "reason" falls back to "plan" for older catalogues. */
export function routeFor(catalog: Catalog, route: Route): ModelSpec[] {
  const ids = catalog.routes[route] ?? (route === "reason" ? catalog.routes.plan : undefined) ?? [];
  return ids.map((id) => catalog.models.find((m) => m.id === id)!).filter(Boolean);
}

/** Loads the catalogue from the environment, or null when AI isn't configured. */
export function loadCatalog(env: Record<string, string | undefined> = process.env): Catalog | null {
  const raw = env.AI_MODEL_CATALOG;
  if (!raw || !raw.trim()) return null;
  return parseCatalog(raw);
}

/** Cost of one call in micros, rounded up. */
export function costMicros(spec: Pick<ModelSpec, "inputPerMTokMicros" | "outputPerMTokMicros">, inputTokens: number, outputTokens: number): number {
  return Math.ceil((inputTokens * spec.inputPerMTokMicros + outputTokens * spec.outputPerMTokMicros) / 1_000_000);
}

/**
 * Upper-bound estimate used by assert_can_spend: input characters / 3
 * tokens plus the maximum output, priced at the dearest model in the route.
 */
export function estimateMicros(models: ModelSpec[], inputChars: number, maxOutputTokens?: number): number {
  let worst = 0;
  for (const m of models) {
    const out = Math.min(maxOutputTokens ?? m.maxOutputTokens, m.maxOutputTokens);
    worst = Math.max(worst, costMicros(m, Math.ceil(inputChars / 3), out));
  }
  return worst;
}
