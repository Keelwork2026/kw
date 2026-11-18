/**
 * Cloudflare Workers adapter (Workers Versions & Deployments + static
 * assets). Uses the PROJECT OWNER's token, from the deploy service only.
 */
import { createHash } from "node:crypto";

export type CfConfig = { accountId: string; apiToken: string; fetch?: typeof fetch; api?: string };
export class CloudflareError extends Error { constructor(message: string, readonly status?: number) { super(message); } }

/** keelwork-<name>-<id prefix>, max 63 chars; previews go to a separate -preview Worker. */
export function scriptName(projectName: string, projectId: string, environment: "preview" | "production"): string {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "app";
  const base = `kw-${slug}-${projectId.replace(/-/g, "").slice(0, 8)}`;
  return environment === "preview" ? `${base}-preview` : base;
}

export function assetHash(content: Buffer, path: string): string {
  // Cloudflare's asset manifest uses a 32-hex hash per file; content + extension keeps it stable.
  const ext = path.includes(".") ? path.slice(path.lastIndexOf(".") + 1) : "";
  return createHash("sha256").update(Buffer.concat([content, Buffer.from(ext)])).digest("hex").slice(0, 32);
}

export function createCloudflare(cfg: CfConfig) {
  if (!/^[0-9a-f]{32}$/.test(cfg.accountId)) throw new CloudflareError("CLOUDFLARE_ACCOUNT_ID must be 32 hex characters");
  const f = cfg.fetch ?? fetch;
  const api = cfg.api ?? "https://api.cloudflare.com/client/v4";
  const acct = `${api}/accounts/${cfg.accountId}`;
  async function call<T>(method: string, url: string, body?: BodyInit | object, auth = cfg.apiToken): Promise<T> {
    const isForm = body instanceof FormData;
    const res = await f(url, {
      method,
      headers: { Authorization: `Bearer ${auth}`, ...(body && !isForm ? { "Content-Type": "application/json" } : {}) },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const json = (await res.json().catch(() => null)) as { success?: boolean; result?: T; errors?: { message: string }[] } | null;
    if (!res.ok || json?.success === false) throw new CloudflareError(json?.errors?.[0]?.message ?? `Cloudflare answered ${res.status}`, res.status);
    return json?.result as T;
  }
  return {
    async subdomain(): Promise<string> {
      return (await call<{ subdomain: string }>("GET", `${acct}/workers/subdomain`)).subdomain;
    },
    async scriptExists(script: string): Promise<boolean> {
      try { await call("GET", `${acct}/workers/scripts/${script}/settings`); return true; }
      catch (e) { if (e instanceof CloudflareError && e.status === 404) return false; throw e; }
    },
    /** Assets upload session, then upload each bucket; returns the completion JWT. */
    async uploadAssets(script: string, files: { path: string; content: Buffer }[]): Promise<string | null> {
      if (!files.length) return null;
      const manifest: Record<string, { hash: string; size: number }> = {};
      const byHash = new Map<string, Buffer>();
      for (const file of files) { const hash = assetHash(file.content, file.path); manifest[`/${file.path.replace(/^\/+/, "")}`] = { hash, size: file.content.length }; byHash.set(hash, file.content); }
      const session = await call<{ jwt: string; buckets?: string[][] }>("POST", `${acct}/workers/scripts/${script}/assets-upload-session`, { manifest });
      let completion = session.jwt;
      for (const bucket of session.buckets ?? []) {
        const form = new FormData();
        for (const hash of bucket) {
          const content = byHash.get(hash);
          if (!content) throw new CloudflareError("Cloudflare asked for an asset that isn't in the manifest");
          form.append(hash, new Blob([content.toString("base64")]), hash);
        }
        const r = await call<{ jwt?: string }>("POST", `${acct}/workers/assets/upload?base64=true`, form, session.jwt);
        if (r?.jwt) completion = r.jwt;
      }
      return completion;
    },
    /** Uploads a new version (not yet serving traffic). */
    async createVersion(script: string, input: { main: string; modules: { name: string; content: Buffer; type: string }[]; assetsJwt: string | null; bindings: unknown[]; commitSha: string | null; compatibilityDate: string; compatibilityFlags: string[] }): Promise<{ id: string; previewUrl: string | null }> {
      const metadata = {
        main_module: input.main,
        compatibility_date: input.compatibilityDate,
        compatibility_flags: input.compatibilityFlags,
        bindings: input.bindings,
        ...(input.assetsJwt ? { assets: { jwt: input.assetsJwt } } : {}),
        annotations: { "workers/message": input.commitSha ? `Keelwork deploy of ${input.commitSha.slice(0, 12)}` : "Keelwork deploy", "workers/tag": input.commitSha?.slice(0, 12) ?? "keelwork" },
      };
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      for (const m of input.modules) form.append(m.name, new Blob([m.content], { type: m.type }), m.name);
      const r = await call<{ id: string; metadata?: { has_preview?: boolean } }>("POST", `${acct}/workers/scripts/${script}/versions`, form);
      return { id: r.id, previewUrl: null };
    },
    /** First upload of a new Worker creates the script. */
    async createScript(script: string, input: Parameters<ReturnType<typeof createCloudflare>["createVersion"]>[1]): Promise<void> {
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify({ main_module: input.main, compatibility_date: input.compatibilityDate, compatibility_flags: input.compatibilityFlags, bindings: input.bindings, ...(input.assetsJwt ? { assets: { jwt: input.assetsJwt } } : {}) })], { type: "application/json" }));
      for (const m of input.modules) form.append(m.name, new Blob([m.content], { type: m.type }), m.name);
      await call("PUT", `${acct}/workers/scripts/${script}`, form);
    },
    async enableWorkersDev(script: string): Promise<void> {
      await call("POST", `${acct}/workers/scripts/${script}/subdomain`, { enabled: true, previews_enabled: true });
    },
    /** Sends 100% of traffic to a version. */
    async deployVersion(script: string, versionId: string, message: string): Promise<void> {
      await call("POST", `${acct}/workers/scripts/${script}/deployments`, { strategy: "percentage", versions: [{ version_id: versionId, percentage: 100 }], annotations: { "workers/message": message.slice(0, 100) } });
    },
    /** The version currently serving 100% of traffic, if any. */
    async liveVersion(script: string): Promise<string | null> {
      try {
        const r = await call<{ deployments?: { versions: { version_id: string; percentage: number }[] }[] }>("GET", `${acct}/workers/scripts/${script}/deployments`);
        return r.deployments?.[0]?.versions.find((v) => v.percentage === 100)?.version_id ?? null;
      } catch (e) { if (e instanceof CloudflareError && e.status === 404) return null; throw e; }
    },
    previewUrlFor(script: string, versionId: string, subdomain: string): string {
      return `https://${versionId.slice(0, 8)}-${script}.${subdomain}.workers.dev`;
    },
    liveUrlFor(script: string, subdomain: string): string {
      return `https://${script}.${subdomain}.workers.dev`;
    },
  };
}
export type Cloudflare = ReturnType<typeof createCloudflare>;
