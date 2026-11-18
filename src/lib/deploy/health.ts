/**
 * A deployment is never called live until its health check passes.
 * Checks /api/health first (expects 200), falling back to / (2xx/3xx) when
 * the app has no health route; retries with a pause between attempts.
 */
export type HealthResult = { ok: true; path: string; status: number; attempts: number } | { ok: false; reason: string; attempts: number };

export async function verifyHealth(baseUrl: string, opts: { fetch?: typeof fetch; retries?: number; delayMs?: number; timeoutMs?: number } = {}): Promise<HealthResult> {
  const f = opts.fetch ?? fetch;
  const retries = opts.retries ?? 6, delay = opts.delayMs ?? 5000;
  let base: URL;
  try { base = new URL(baseUrl); } catch { return { ok: false, reason: "invalid URL", attempts: 0 }; }
  if (base.protocol !== "https:") return { ok: false, reason: "health checks need https", attempts: 0 };
  let last = "no answer";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const r = await f(new URL("/api/health", base).toString(), { redirect: "manual", signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000), headers: { "User-Agent": "Keelwork-Deploy-Verifier/1.0" } });
      if (r.status === 200) return { ok: true, path: "/api/health", status: 200, attempts: attempt };
      if (r.status === 404) {
        const root = await f(new URL("/", base).toString(), { redirect: "manual", signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000) });
        if (root.status >= 200 && root.status < 400) return { ok: true, path: "/", status: root.status, attempts: attempt };
        last = `/ answered ${root.status}`;
      } else {
        last = `/api/health answered ${r.status}`;
      }
    } catch (e) {
      last = (e as Error).name === "TimeoutError" ? "timed out" : "couldn't connect";
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, delay));
  }
  return { ok: false, reason: last, attempts: retries };
}
