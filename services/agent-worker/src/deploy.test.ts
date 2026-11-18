import { test } from "node:test";
import assert from "node:assert/strict";
import { runCloudflareDeploy, appVarsFrom, DeployFailed, type DeploySandbox } from "./deploy-cloudflare";
import { runVercelDeploy } from "./deploy";
import { createCloudflare, scriptName, assetHash, type Cloudflare } from "../../../src/lib/deploy/cloudflare";
import { createVercel } from "../../../src/lib/deploy/vercel";
import { verifyHealth, type HealthResult } from "../../../src/lib/deploy/health";

const PID = "3f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

function fakeSandbox(files: Record<string, string>, over: Partial<DeploySandbox> = {}) {
  const fs = new Map(Object.entries(files));
  const envAtBuild: (string | undefined)[] = [];
  const execs: string[] = [];
  const sb: DeploySandbox = {
    listFiles: async () => [...fs.keys()].filter((p) => !p.startsWith(".kw-bundle/") && !p.startsWith(".open-next/")),
    listTree: async (dir) => [...fs.keys()].filter((p) => p.startsWith(`${dir}/`)),
    readFile: async (p) => { if (!fs.has(p)) throw new Error("missing"); return Buffer.from(fs.get(p)!); },
    writeFile: async (p, c) => { fs.set(p, c.toString()); },
    exec: async (argv) => {
      execs.push(argv.join(" "));
      if (argv.includes("opennextjs-cloudflare")) { envAtBuild.push(fs.get(".env.local")); fs.set(".open-next/assets/_next/app.js", "console.log(1)"); }
      if (argv.includes("wrangler")) fs.set(".kw-bundle/worker.js", "export default {}");
      return { exitCode: 0, stdout: "", stderr: "" };
    },
    ...over,
  };
  return { sb, fs, envAtBuild, execs };
}

function fakeCf(opts: { exists?: boolean; live?: string | null } = {}) {
  const calls: string[] = [];
  let live = opts.live ?? null;
  const cf = {
    subdomain: async () => "acme",
    scriptExists: async () => opts.exists ?? true,
    createScript: async (s: string) => { calls.push(`createScript ${s}`); },
    enableWorkersDev: async () => { calls.push("enableWorkersDev"); },
    uploadAssets: async (_s: string, files: { path: string }[]) => { calls.push(`uploadAssets ${files.map((f) => f.path).join(",")}`); return "assets-jwt"; },
    createVersion: async (_s: string, v: { bindings: { name: string; type: string }[]; main: string }) => { calls.push(`createVersion main=${v.main} bindings=${v.bindings.map((b) => `${b.type}:${b.name}`).join(",")}`); return { id: "ver-new-1234", previewUrl: null }; },
    deployVersion: async (_s: string, id: string) => { calls.push(`deploy ${id}`); live = id; },
    liveVersion: async () => live,
    previewUrlFor: (s: string, v: string, sub: string) => `https://${v.slice(0, 8)}-${s}.${sub}.workers.dev`,
    liveUrlFor: (s: string, sub: string) => `https://${s}.${sub}.workers.dev`,
  } as unknown as Cloudflare;
  return { cf, calls };
}

const healthy = async (): Promise<HealthResult> => ({ ok: true, path: "/api/health", status: 200, attempts: 1 });
const base = { projectId: PID, projectName: "Clay & Co", environment: "production" as const, commitSha: "a".repeat(40), appVars: { STRIPE_SECRET_KEY: "sk_test_x", NEXT_PUBLIC_SITE: "https://x" }, knownValues: ["super-secret-vault-value"] };

test("cloudflare: blanks the env file during the build and restores it", async () => {
  const s = fakeSandbox({ "app/page.tsx": "x", ".env.local": 'STRIPE_SECRET_KEY="sk_test_x"' });
  const { cf, calls } = fakeCf({ live: "ver-old" });
  const statuses: string[] = [];
  const r = await runCloudflareDeploy({ sandbox: s.sb, cf, health: healthy, setStatus: async (x) => { statuses.push(x); }, log: async () => {} }, base);
  assert.deepEqual(s.envAtBuild, [""], "no secrets on disk during the build");
  assert.equal(s.fs.get(".env.local"), 'STRIPE_SECRET_KEY="sk_test_x"', "the env file is restored");
  assert.deepEqual(statuses, ["uploading", "building", "verifying"]);
  assert.equal(r.url, `https://${scriptName("Clay & Co", PID, "production")}.acme.workers.dev`);
  assert.ok(calls.some((c) => c.includes("createVersion main=worker.js bindings=assets:ASSETS,secret_text:STRIPE_SECRET_KEY,plain_text:NEXT_PUBLIC_SITE")));
  assert.ok(s.execs.includes("npx wrangler deploy --dry-run --outdir .kw-bundle"));
});

test("cloudflare: the env file is restored even when the build fails", async () => {
  const s = fakeSandbox({ "app/page.tsx": "x", ".env.local": "A=1" }, {});
  s.sb.exec = async () => ({ exitCode: 1, stdout: "", stderr: "Type error" });
  await assert.rejects(runCloudflareDeploy({ sandbox: s.sb, cf: fakeCf().cf, health: healthy, setStatus: async () => {}, log: async () => {} }, base), /build failed/);
  assert.equal(s.fs.get(".env.local"), "A=1");
});

test("cloudflare: the preview check gates traffic", async () => {
  const s = fakeSandbox({ "app/page.tsx": "x" });
  const { cf, calls } = fakeCf({ live: "ver-old" });
  const checked: string[] = [];
  const health = async (url: string): Promise<HealthResult> => { checked.push(url); return url.includes("ver-new-") ? { ok: false, reason: "/api/health answered 500", attempts: 3 } : { ok: true, path: "/", status: 200, attempts: 1 }; };
  await assert.rejects(runCloudflareDeploy({ sandbox: s.sb, cf, health, setStatus: async () => {}, log: async () => {} }, base), /preview check/);
  assert.ok(!calls.some((c) => c.startsWith("deploy ")), "no traffic moves when the preview fails");
  assert.match(checked[0]!, /^https:\/\/ver-new-/);
});

test("cloudflare: a failed live check switches traffic back", async () => {
  const s = fakeSandbox({ "app/page.tsx": "x" });
  const { cf, calls } = fakeCf({ live: "ver-old" });
  const health = async (url: string): Promise<HealthResult> => (url.includes("ver-new-") ? { ok: true, path: "/api/health", status: 200, attempts: 1 } : { ok: false, reason: "timed out", attempts: 6 });
  await assert.rejects(runCloudflareDeploy({ sandbox: s.sb, cf, health, setStatus: async () => {}, log: async () => {} }, base), /switched back/);
  assert.deepEqual(calls.filter((c) => c.startsWith("deploy ")), ["deploy ver-new-1234", "deploy ver-old"]);
});

test("cloudflare: credentials in the source or the bundle stop the deploy", async () => {
  const leaky = fakeSandbox({ "lib/k.ts": `const k = "super-secret-vault-value";` });
  await assert.rejects(runCloudflareDeploy({ sandbox: leaky.sb, cf: fakeCf().cf, health: healthy, setStatus: async () => {}, log: async () => {} }, base), /credentials found in the source/);
  const s = fakeSandbox({ "app/page.tsx": "x" });
  const exec = s.sb.exec;
  s.sb.exec = async (argv) => { const r = await exec(argv); if (argv.includes("wrangler")) s.fs.set(".kw-bundle/worker.js", `const inlined = "super-secret-vault-value";`); return r; };
  const { cf, calls } = fakeCf();
  await assert.rejects(runCloudflareDeploy({ sandbox: s.sb, cf, health: healthy, setStatus: async () => {}, log: async () => {} }, base), /bundle contains credentials/);
  assert.ok(!calls.some((c) => c.startsWith("uploadAssets") || c.startsWith("createVersion")), "nothing was uploaded");
});

test("cloudflare: a new Worker is created with a placeholder, then goes through version previews", async () => {
  const s = fakeSandbox({ "app/page.tsx": "x" });
  const { cf, calls } = fakeCf({ exists: false });
  await runCloudflareDeploy({ sandbox: s.sb, cf, health: healthy, setStatus: async () => {}, log: async () => {} }, { ...base, environment: "preview" });
  assert.match(calls[0]!, /^createScript kw-clay-co-3f1c2b8e-preview$/);
});

test("appVarsFrom keeps deploy credentials out of the app", () => {
  assert.deepEqual(appVarsFrom({ CLOUDFLARE_API_TOKEN: "t", CLOUDFLARE_ACCOUNT_ID: "a", VERCEL_TOKEN: "v", RESEND_API_KEY: "r" }), { RESEND_API_KEY: "r" });
});

function fakeFetch(handler: (method: string, url: string, body: unknown) => { status?: number; json: unknown }) {
  const seen: { method: string; url: string; auth: string | null; body: unknown }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    const body = init.body instanceof FormData ? init.body : init.body ? JSON.parse(String(init.body)) : undefined;
    seen.push({ method: init.method ?? "GET", url, auth: new Headers(init.headers).get("authorization"), body });
    const r = handler(init.method ?? "GET", url, body);
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200 });
  }) as typeof fetch;
  return { f, seen };
}

test("cloudflare adapter: script names, asset upload session and version deploys", async () => {
  assert.equal(scriptName("Clay & Co!", PID, "production"), "kw-clay-co-3f1c2b8e");
  assert.equal(scriptName("Clay & Co!", PID, "preview"), "kw-clay-co-3f1c2b8e-preview");
  const { f, seen } = fakeFetch((method, url) => {
    if (url.endsWith("/assets-upload-session")) return { json: { success: true, result: { jwt: "session-jwt", buckets: [[assetHash(Buffer.from("x"), "_next/app.js")]] } } };
    if (url.includes("/workers/assets/upload")) return { json: { success: true, result: { jwt: "completion-jwt" } } };
    if (url.endsWith("/deployments") && method === "GET") return { json: { success: true, result: { deployments: [{ versions: [{ version_id: "v-old", percentage: 100 }] }] } } };
    return { json: { success: true, result: { id: "v-new" } } };
  });
  const cf = createCloudflare({ accountId: "0".repeat(32), apiToken: "cf-token", fetch: f });
  assert.throws(() => createCloudflare({ accountId: "bad", apiToken: "x" }), /32 hex/);
  const jwt = await cf.uploadAssets("s", [{ path: "_next/app.js", content: Buffer.from("x") }]);
  assert.equal(jwt, "completion-jwt");
  assert.equal(seen[1]!.auth, "Bearer session-jwt", "asset uploads use the session JWT, not the account token");
  assert.equal((await cf.createVersion("s", { main: "worker.js", modules: [], assetsJwt: jwt, bindings: [], commitSha: null, compatibilityDate: "2026-11-01", compatibilityFlags: [] })).id, "v-new");
  await cf.deployVersion("s", "v-new", "msg");
  assert.deepEqual(seen.at(-1)!.body, { strategy: "percentage", versions: [{ version_id: "v-new", percentage: 100 }], annotations: { "workers/message": "msg" } });
  assert.equal(await cf.liveVersion("s"), "v-old");
  assert.ok(seen.every((s) => s.url.startsWith("https://api.cloudflare.com/client/v4/accounts/00000000000000000000000000000000/")));
});

test("health verification: /api/health, fallback to /, retries and https only", async () => {
  const mk = (codes: Record<string, number[]>) => { const counts: Record<string, number> = {}; return (async (url: string) => { const p = new URL(url).pathname; const i = counts[p] = (counts[p] ?? 0) + 1; const list = codes[p] ?? [500]; return new Response("", { status: list[Math.min(i - 1, list.length - 1)] }); }) as typeof fetch; };
  assert.deepEqual(await verifyHealth("https://a.dev", { fetch: mk({ "/api/health": [200] }), delayMs: 0 }), { ok: true, path: "/api/health", status: 200, attempts: 1 });
  assert.deepEqual(await verifyHealth("https://a.dev", { fetch: mk({ "/api/health": [404], "/": [200] }), delayMs: 0 }), { ok: true, path: "/", status: 200, attempts: 1 });
  assert.equal((await verifyHealth("https://a.dev", { fetch: mk({ "/api/health": [503, 503, 200] }), delayMs: 0 })).ok, true);
  assert.deepEqual(await verifyHealth("https://a.dev", { fetch: mk({ "/api/health": [500] }), delayMs: 0, retries: 2 }), { ok: false, reason: "/api/health answered 500", attempts: 2 });
  assert.equal((await verifyHealth("http://a.dev", { delayMs: 0 })).ok, false);
});

test("vercel: env files are never shipped, env vars are encrypted, failing production switches back", async () => {
  const s = fakeSandbox({ "app/page.tsx": "x", ".env.local": "A=1", ".env.production": "B=2", ".env.example": "A=" });
  let promoted: string[] = [];
  const { f, seen } = fakeFetch((method, url) => {
    if (url.includes("/v9/projects/")) return { json: { id: "prj_1" } };
    if (url.includes("/v13/deployments") && method === "POST") return { json: { id: "dpl_new", url: "new.vercel.app" } };
    if (url.includes("/v13/deployments/")) return { json: { readyState: "READY", url: "new.vercel.app" } };
    if (url.includes("/promote/")) { promoted.push(url.split("/promote/")[1]!.split("?")[0]!); return { json: {} }; }
    return { json: {} };
  });
  const vercel = createVercel({ token: "vt", fetch: f });
  const health = async (url: string): Promise<HealthResult> => (url.includes("new.vercel.app") ? { ok: true, path: "/api/health", status: 200, attempts: 1 } : { ok: false, reason: "answered 500", attempts: 6 });
  await assert.rejects(runVercelDeploy({ sandbox: s.sb, vercel, health, setStatus: async () => {}, log: async () => {}, pollMs: 0 }, { ...base, previousDeploymentId: "dpl_old" }), /switched back/);
  const upload = seen.find((x) => x.url.includes("/v13/deployments") && x.method === "POST")!.body as { files: { file: string }[] };
  assert.deepEqual(upload.files.map((x) => x.file).sort(), [".env.example", "app/page.tsx"]);
  const env = seen.find((x) => x.url.includes("/env"))!.body as { key: string; type: string }[];
  assert.deepEqual(env.map((e) => `${e.key}:${e.type}`), ["STRIPE_SECRET_KEY:encrypted", "NEXT_PUBLIC_SITE:plain"]);
  assert.deepEqual(promoted, ["dpl_new", "dpl_old"]);
  promoted = [];
  const ok = await runVercelDeploy({ sandbox: s.sb, vercel, health: healthy, setStatus: async () => {}, log: async () => {}, pollMs: 0 }, { ...base, previousDeploymentId: null });
  assert.equal(ok.versionId, "dpl_new");
  assert.ok(!(DeployFailed.prototype instanceof TypeError));
});
