/**
 * Cloudflare Workers deploy pipeline (default target).
 *
 *  Collect  — the source is scanned for credentials, as for exports.
 *  Build    — inside the sandbox the env file is blanked, opennextjs-cloudflare
 *             build runs, then wrangler deploy --dry-run --outdir bundles it; the
 *             env file is restored afterwards. No secrets are on disk during the build.
 *  Upload   — the bundle is scanned again (credentials and exact vault values);
 *             assets upload first, then a new version with metadata.
 *  Verify   — the version is checked on its preview address, then gets 100% of
 *             traffic, then the live address is checked; if that fails, traffic
 *             goes back to the previous version.
 */
import { collectForExport, shouldInclude } from "../../../src/lib/export/collect";
import { scanFiles } from "../../../src/lib/checks/secret-scan";
import { scriptName, type Cloudflare } from "../../../src/lib/deploy/cloudflare";
import type { HealthResult } from "../../../src/lib/deploy/health";

export type DeploySandbox = {
  listFiles: () => Promise<string[]>;
  listTree: (dir: string) => Promise<string[]>;
  readFile: (path: string) => Promise<Buffer>;
  writeFile: (path: string, content: string | Buffer) => Promise<void>;
  exec: (argv: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
};
export type StepStatus = "collecting" | "uploading" | "building" | "verifying";
export type PipelineDeps = {
  sandbox: DeploySandbox;
  health: (url: string) => Promise<HealthResult>;
  setStatus: (s: StepStatus) => Promise<void>;
  log: (message: string) => Promise<void>;
};
export type CloudflareDeployInput = {
  projectId: string; projectName: string; environment: "preview" | "production"; commitSha: string | null;
  /** The app's own variables for this environment (deploy credentials already removed). */
  appVars: Record<string, string>;
  /** Every vault value of the project, scrubbed and scanned for. */
  knownValues: string[];
  /** For a rollback: the version to restore. */
  rollbackVersion?: string | null;
};
export class DeployFailed extends Error {}

const DEPLOY_ONLY = /^(CLOUDFLARE_|VERCEL_TOKEN$)/;
export function appVarsFrom(secrets: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(secrets).filter(([k]) => !DEPLOY_ONLY.test(k)));
}

const PLACEHOLDER_WORKER = `export default { fetch() { return new Response("This app is being deployed by Keelwork.", { status: 503, headers: { "retry-after": "30" } }); } };\n`;

export async function runCloudflareDeploy(deps: PipelineDeps & { cf: Cloudflare }, input: CloudflareDeployInput): Promise<{ url: string; versionId: string }> {
  const { sandbox, cf, health, setStatus, log } = deps;
  const script = scriptName(input.projectName, input.projectId, input.environment);
  const subdomain = await cf.subdomain();
  const liveUrl = cf.liveUrlFor(script, subdomain);

  if (input.rollbackVersion) {
    await setStatus("uploading"); await setStatus("building"); await setStatus("verifying");
    const previous = await cf.liveVersion(script);
    await cf.deployVersion(script, input.rollbackVersion, "Keelwork rollback");
    const live = await health(liveUrl);
    if (!live.ok) {
      if (previous) await cf.deployVersion(script, previous, "Keelwork: rollback failed its health check; restored");
      throw new DeployFailed(`the restored version failed its health check (${live.reason}); traffic was switched back`);
    }
    await log(`Rolled back to ${input.rollbackVersion}; ${liveUrl} is healthy.`);
    return { url: liveUrl, versionId: input.rollbackVersion };
  }

  // Collect
  const paths = (await sandbox.listFiles()).filter(shouldInclude);
  const source = await Promise.all(paths.map(async (p) => ({ path: p, content: await sandbox.readFile(p) })));
  const collected = collectForExport(source, input.knownValues);
  if (!collected.ok) {
    throw new DeployFailed(collected.reason === "credentials" ? `credentials found in the source: ${collected.findings.slice(0, 5).map((f) => `${f.title} in ${f.file}:${f.line}`).join("; ")}` : collected.message);
  }
  await log(`Collected ${collected.files.length} files; no credentials found.`);

  // Build — with the env file blanked, so no secrets are on disk.
  await setStatus("uploading");
  const envBackup = await sandbox.readFile(".env.local").catch(() => null);
  try {
    if (envBackup !== null) await sandbox.writeFile(".env.local", "");
    const build = await sandbox.exec(["npx", "opennextjs-cloudflare", "build"]);
    if (build.exitCode !== 0) throw new DeployFailed(`the build failed:\n${(build.stdout + build.stderr).slice(-4000)}`);
    const bundle = await sandbox.exec(["npx", "wrangler", "deploy", "--dry-run", "--outdir", ".kw-bundle"]);
    if (bundle.exitCode !== 0) throw new DeployFailed(`bundling failed:\n${(bundle.stdout + bundle.stderr).slice(-4000)}`);
  } finally {
    if (envBackup !== null) await sandbox.writeFile(".env.local", envBackup);
  }
  await log("Built with OpenNext and bundled with Wrangler.");

  // Upload — scan the bundle again before anything leaves the sandbox.
  const bundleFiles = (await sandbox.listTree(".kw-bundle")).filter((p) => !p.endsWith(".map"));
  const assetFiles = (await sandbox.listTree(".open-next/assets")).filter((p) => !/(^|\/)\.env/.test(p));
  const modules = await Promise.all(bundleFiles.map(async (p) => ({ path: p, content: await sandbox.readFile(p) })));
  const assets = await Promise.all(assetFiles.map(async (p) => ({ path: p.replace(/^\.open-next\/assets\//, ""), content: await sandbox.readFile(p) })));
  const textual = [...modules, ...assets].filter((f) => !f.content.subarray(0, 8000).includes(0)).map((f) => ({ path: f.path, content: f.content.toString("utf8") }));
  const leaks = scanFiles(textual, input.knownValues);
  if (leaks.length) throw new DeployFailed(`the built bundle contains credentials (${leaks.slice(0, 3).map((l) => l.title).join(", ")}); nothing was uploaded`);
  const main = modules.find((m) => /(^|\/)(worker|index)\.(m?js)$/.test(m.path));
  if (!main) throw new DeployFailed("the bundle has no worker entry module");

  if (!(await cf.scriptExists(script))) {
    // A placeholder creates the Worker so the real code can go through version previews.
    await cf.createScript(script, { main: "worker.js", modules: [{ name: "worker.js", content: Buffer.from(PLACEHOLDER_WORKER), type: "application/javascript+module" }], assetsJwt: null, bindings: [], commitSha: null, compatibilityDate: "2026-11-01", compatibilityFlags: [] });
  }
  await cf.enableWorkersDev(script);
  const assetsJwt = await cf.uploadAssets(script, assets);
  await setStatus("building");
  const bindings = [
    ...(assetsJwt ? [{ type: "assets", name: "ASSETS" }] : []),
    ...Object.entries(input.appVars).map(([name, text]) => ({ type: name.startsWith("NEXT_PUBLIC_") ? "plain_text" : "secret_text", name, text })),
  ];
  const version = await cf.createVersion(script, {
    main: main.path.replace(/^\.kw-bundle\//, ""),
    modules: modules.map((m) => ({ name: m.path.replace(/^\.kw-bundle\//, ""), content: m.content, type: /\.wasm$/.test(m.path) ? "application/wasm" : "application/javascript+module" })),
    assetsJwt, bindings, commitSha: input.commitSha, compatibilityDate: "2026-11-01", compatibilityFlags: ["nodejs_compat"],
  });
  await log(`Uploaded version ${version.id}.`);

  // Verify — preview address first, then traffic, then the live address.
  await setStatus("verifying");
  const previewUrl = cf.previewUrlFor(script, version.id, subdomain);
  const preview = await health(previewUrl);
  if (!preview.ok) throw new DeployFailed(`the new version failed its preview check at ${previewUrl} (${preview.reason}); no traffic was moved`);
  await log(`Preview ${previewUrl} is healthy.`);
  const previous = await cf.liveVersion(script);
  await cf.deployVersion(script, version.id, input.commitSha ? `Keelwork ${input.commitSha.slice(0, 12)}` : "Keelwork deploy");
  const live = await health(liveUrl);
  if (!live.ok) {
    if (previous) await cf.deployVersion(script, previous, "Keelwork: new version failed its live check; restored");
    throw new DeployFailed(`the live check failed at ${liveUrl} (${live.reason}); traffic was switched back to the previous version`);
  }
  await log(`Live at ${liveUrl}.`);
  return { url: liveUrl, versionId: version.id };
}
