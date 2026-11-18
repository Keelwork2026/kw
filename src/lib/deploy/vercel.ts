/**
 * Vercel adapter (optional deploy target), using the project owner's
 * VERCEL_TOKEN from the deploy service only.
 */
export type VercelConfig = { token: string; teamId?: string; fetch?: typeof fetch; api?: string };
export class VercelError extends Error { constructor(message: string, readonly status?: number) { super(message); } }

export function createVercel(cfg: VercelConfig) {
  const f = cfg.fetch ?? fetch;
  const api = cfg.api ?? "https://api.vercel.com";
  const q = cfg.teamId ? `?teamId=${encodeURIComponent(cfg.teamId)}` : "";
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${api}${path}${q ? sep + q.slice(1) : ""}`;
    const res = await f(url, { method, headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60_000) });
    const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
    if (!res.ok) throw new VercelError(json?.error?.message ?? `Vercel answered ${res.status}`, res.status);
    return json as T;
  }
  return {
    async ensureProject(name: string): Promise<{ id: string }> {
      try { return await call<{ id: string }>("GET", `/v9/projects/${encodeURIComponent(name)}`); }
      catch (e) { if (e instanceof VercelError && e.status === 404) return call<{ id: string }>("POST", "/v10/projects", { name, framework: "nextjs" }); throw e; }
    },
    /** Encrypted environment variables are set before the build. */
    async upsertEnv(projectId: string, target: "preview" | "production", vars: Record<string, string>): Promise<void> {
      const body = Object.entries(vars).map(([key, value]) => ({ key, value, type: key.startsWith("NEXT_PUBLIC_") ? "plain" : "encrypted", target: [target] }));
      if (body.length) await call("POST", `/v10/projects/${projectId}/env?upsert=true`, body);
    },
    async createDeployment(input: { name: string; projectId: string; target: "preview" | "production"; files: { file: string; data: string }[]; commitSha: string | null }): Promise<{ id: string; url: string }> {
      const r = await call<{ id: string; url: string }>("POST", "/v13/deployments", {
        name: input.name, project: input.projectId, target: input.target === "production" ? "production" : undefined,
        files: input.files.map((x) => ({ file: x.file, data: x.data, encoding: "base64" })),
        projectSettings: { framework: "nextjs" }, meta: input.commitSha ? { keelworkCommit: input.commitSha } : {},
      });
      return { id: r.id, url: `https://${r.url}` };
    },
    async getDeployment(id: string): Promise<{ readyState: string; url: string; errorMessage?: string }> {
      const r = await call<{ readyState: string; url: string; errorMessage?: string }>("GET", `/v13/deployments/${id}`);
      return { ...r, url: `https://${r.url}` };
    },
    /** Points production at a deployment (also used to switch back). */
    async promote(projectId: string, deploymentId: string): Promise<void> {
      await call("POST", `/v10/projects/${projectId}/promote/${deploymentId}`);
    },
  };
}
export type Vercel = ReturnType<typeof createVercel>;
