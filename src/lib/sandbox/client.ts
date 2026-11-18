/**
 * Client for the sandbox broker (services/sandbox-broker), which runs on a
 * separate Docker host. Used by the web app and the agent worker. The broker
 * token is sent on every request; nothing here ever runs code locally.
 */
export type BrokerConfig = { url: string; token: string; fetch?: typeof fetch };

export class BrokerError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function brokerConfig(env: Record<string, string | undefined> = process.env): BrokerConfig | null {
  const url = env.SANDBOX_BROKER_URL;
  const token = env.SANDBOX_BROKER_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export type ExecResult = { exitCode: number; stdout: string; stderr: string; timedOut: boolean };
export type ListEntry = { name: string; type: "file" | "dir"; size: number };

export function createBrokerClient(cfg: BrokerConfig) {
  const f = cfg.fetch ?? fetch;
  async function call<T>(method: string, path: string, body?: unknown, timeoutMs = 30_000): Promise<T> {
    let res: Response;
    try {
      res = await f(`${cfg.url}${path}`, {
        method,
        headers: { Authorization: `Bearer ${cfg.token}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new BrokerError("The sandbox service isn't reachable.", 503);
    }
    const text = await res.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
    if (!res.ok) {
      const msg = (data as { error?: string } | null)?.error ?? `sandbox service returned ${res.status}`;
      throw new BrokerError(msg, res.status);
    }
    return data as T;
  }
  const enc = encodeURIComponent;
  return {
    health: () => call<{ ok: boolean; docker: boolean }>("GET", "/health", undefined, 5000),
    create: (projectId: string) => call<{ id: string; status: string }>("POST", "/sandboxes", { projectId }, 120_000),
    stop: (id: string) => call<{ ok: true }>("DELETE", `/sandboxes/${enc(id)}`),
    writeFile: (id: string, path: string, content: string | Buffer) =>
      call<{ ok: true }>("POST", `/sandboxes/${enc(id)}/files`, { path, content: Buffer.from(content).toString("base64"), encoding: "base64" }),
    readFile: async (id: string, path: string) => {
      const r = await call<{ content: string }>("GET", `/sandboxes/${enc(id)}/files?path=${enc(path)}`);
      return Buffer.from(r.content, "base64").toString("utf8");
    },
    readFileBytes: async (id: string, path: string) => {
      const r = await call<{ content: string }>("GET", `/sandboxes/${enc(id)}/files?path=${enc(path)}`);
      return Buffer.from(r.content, "base64");
    },
    list: (id: string, path = ".") => call<{ entries: ListEntry[] }>("GET", `/sandboxes/${enc(id)}/list?path=${enc(path)}`),
    deleteFile: (id: string, path: string, approved: boolean) =>
      call<{ ok: true }>("DELETE", `/sandboxes/${enc(id)}/files?path=${enc(path)}${approved ? "&approved=1" : ""}`),
    exec: (id: string, argv: string[], approved = false) =>
      call<ExecResult>("POST", `/sandboxes/${enc(id)}/exec`, { argv, approved }, 11 * 60_000),
    putEnv: (id: string, vars: Record<string, string>) => call<{ ok: true }>("PUT", `/sandboxes/${enc(id)}/env`, { vars }),
    serve: (id: string) => call<{ ok: true }>("POST", `/sandboxes/${enc(id)}/serve`),
    port: (id: string) => call<{ port: number }>("GET", `/sandboxes/${enc(id)}/port`),
  };
}
export type BrokerClient = ReturnType<typeof createBrokerClient>;

/** The broker names sandboxes after the project id. */
export function sandboxIdFor(projectId: string): string {
  return `kw-${projectId}`;
}
