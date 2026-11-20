/**
 * Deployment service inside the worker: claims queued deployments and runs
 * the Cloudflare (default) or Vercel pipeline with the project owner's
 * credentials from the vault. Deploy credentials are used only here — never
 * passed to the app or the sandbox. A deployment is never marked live until
 * its health check passes.
 */
import type { WorkerContext } from "./worker";
import { runCloudflareDeploy, appVarsFrom, DeployFailed, type DeploySandbox, type PipelineDeps } from "./deploy-cloudflare";
import { createCloudflare } from "../../../src/lib/deploy/cloudflare";
import { createVercel, type Vercel } from "../../../src/lib/deploy/vercel";
import { verifyHealth } from "../../../src/lib/deploy/health";
import { collectForExport, shouldInclude } from "../../../src/lib/export/collect";
import { sandboxIdFor, type BrokerClient } from "../../../src/lib/sandbox/client";
import { lsFilesArgs } from "../../../src/lib/code/git";
import { parseEntries } from "../../../src/lib/code/tree";
import { loadMasterKeys } from "../../../src/lib/secrets/vault";
import { decryptProjectSecrets } from "../../../src/lib/secrets/load";
import { redactSecrets } from "../../../src/lib/secrets/redact";

export type VercelDeployInput = { projectId: string; projectName: string; environment: "preview" | "production"; commitSha: string | null; appVars: Record<string, string>; knownValues: string[]; previousDeploymentId: string | null; rollbackVersion?: string | null };

export async function runVercelDeploy(deps: PipelineDeps & { vercel: Vercel; pollMs?: number; maxPolls?: number }, input: VercelDeployInput): Promise<{ url: string; versionId: string }> {
  const { sandbox, vercel, health, setStatus, log } = deps;
  const name = `kw-${input.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "app"}-${input.projectId.slice(0, 8)}`;
  const project = await vercel.ensureProject(name);
  const prodUrl = `https://${name}.vercel.app`;

  if (input.rollbackVersion) {
    await setStatus("uploading"); await setStatus("building"); await setStatus("verifying");
    await vercel.promote(project.id, input.rollbackVersion);
    const h = await health(prodUrl);
    if (!h.ok) { if (input.previousDeploymentId) await vercel.promote(project.id, input.previousDeploymentId); throw new DeployFailed(`the restored version failed its health check (${h.reason}); switched back`); }
    return { url: prodUrl, versionId: input.rollbackVersion };
  }

  const paths = (await sandbox.listFiles()).filter(shouldInclude);
  const files = await Promise.all(paths.map(async (p) => ({ path: p, content: await sandbox.readFile(p) })));
  const collected = collectForExport(files, input.knownValues);
  if (!collected.ok) throw new DeployFailed(collected.reason === "credentials" ? `credentials found in the source: ${collected.findings.slice(0, 5).map((f) => `${f.title} in ${f.file}`).join("; ")}` : collected.message);

  await setStatus("uploading");
  await vercel.upsertEnv(project.id, input.environment, input.appVars);
  const created = await vercel.createDeployment({ name, projectId: project.id, target: "preview", files: collected.files.map((f) => ({ file: f.path, data: f.content.toString("base64") })), commitSha: input.commitSha });
  await log(`Uploaded ${collected.files.length} files; Vercel deployment ${created.id}.`);
  await setStatus("building");
  let state = await vercel.getDeployment(created.id);
  for (let i = 0; i < (deps.maxPolls ?? 120) && !["READY", "ERROR", "CANCELED"].includes(state.readyState); i++) {
    await new Promise((r) => setTimeout(r, deps.pollMs ?? 5000));
    state = await vercel.getDeployment(created.id);
  }
  if (state.readyState !== "READY") throw new DeployFailed(`Vercel build ${state.readyState === "ERROR" ? `failed: ${state.errorMessage ?? "unknown error"}` : "didn't finish in time"}`);

  await setStatus("verifying");
  const preview = await health(state.url);
  if (!preview.ok) throw new DeployFailed(`the deployment failed its health check at ${state.url} (${preview.reason})`);
  if (input.environment === "preview") return { url: state.url, versionId: created.id };
  await vercel.promote(project.id, created.id);
  const live = await health(prodUrl);
  if (!live.ok) {
    if (input.previousDeploymentId) await vercel.promote(project.id, input.previousDeploymentId);
    throw new DeployFailed(`production failed its health check (${live.reason}); switched back to the previous deployment`);
  }
  return { url: prodUrl, versionId: created.id };
}

function brokerSandbox(broker: BrokerClient, projectId: string): DeploySandbox {
  const sb = sandboxIdFor(projectId);
  const listTree = async (dir: string): Promise<string[]> => {
    const r = await broker.list(sb, dir).catch(() => ({ entries: [] }));
    const out: string[] = [];
    for (const e of r.entries) {
      const p = `${dir}/${e.name}`;
      if (e.type === "dir") out.push(...(await listTree(p))); else out.push(p);
    }
    return out;
  };
  return {
    listFiles: async () => parseEntries((await broker.exec(sb, lsFilesArgs())).stdout),
    listTree,
    readFile: (p) => broker.readFileBytes(sb, p),
    writeFile: async (p, c) => { await broker.writeFile(sb, p, c); },
    exec: async (argv) => {
      const r = await broker.exec(sb, argv);
      // The deploy build rewrites .next under a running preview; restart it cleanly.
      if (argv.includes("opennextjs-cloudflare") && argv.includes("build")) await broker.serve(sb, { onlyIfRunning: true }).catch(() => undefined);
      return r;
    },
  };
}

export async function processDeployments(ctx: WorkerContext) {
  const { data: claimed, error } = await ctx.db.rpc("claim_deployments", { p_worker: ctx.workerId, p_limit: 1 });
  if (error) throw error;
  for (const d of claimed ?? []) {
    const lines: { at: string; message: string }[] = [];
    let knownValues: string[] = [];
    const log = async (message: string) => {
      lines.push({ at: new Date().toISOString(), message: redactSecrets(message, knownValues).slice(0, 2000) });
      await ctx.db.from("deployments").update({ log: lines }).eq("id", d.id);
    };
    const setStatus = async (status: string) => { await ctx.db.from("deployments").update({ status }).eq("id", d.id); };
    try {
      const { data: project } = await ctx.db.from("projects").select("id, name, deploy_target").eq("id", d.project_id).single();
      if (!project) throw new DeployFailed("project not found");
      const keys = loadMasterKeys(process.env.SECRETS_MASTER_KEYS);
      if (!keys) throw new DeployFailed("SECRETS_MASTER_KEYS is not set on the worker");
      const envSecrets = await decryptProjectSecrets(ctx.db, project.id, d.environment, keys);
      const all = { ...(await decryptProjectSecrets(ctx.db, project.id, "development", keys)), ...(await decryptProjectSecrets(ctx.db, project.id, "preview", keys)), ...(await decryptProjectSecrets(ctx.db, project.id, "production", keys)) };
      knownValues = Object.values(all);
      const deploySecrets = { ...all, ...envSecrets };
      const head = await ctx.broker.exec(sandboxIdFor(project.id), ["git", "rev-parse", "HEAD"]).catch(() => null);
      const commitSha = head?.exitCode === 0 && /^[0-9a-f]{40}$/.test(head.stdout.trim()) ? head.stdout.trim() : null;
      if (commitSha) await ctx.db.from("deployments").update({ commit_sha: commitSha }).eq("id", d.id);
      const deps: PipelineDeps = { sandbox: brokerSandbox(ctx.broker, project.id), health: (url) => verifyHealth(url), setStatus, log };
      let result: { url: string; versionId: string };
      if (d.provider === "vercel") {
        if (!deploySecrets.VERCEL_TOKEN) throw new DeployFailed("add VERCEL_TOKEN on the Secrets tab to deploy to Vercel");
        const { data: prev } = await ctx.db.from("deployments").select("version_id").eq("project_id", project.id).eq("environment", d.environment).eq("status", "live").maybeSingle();
        result = await runVercelDeploy({ ...deps, vercel: createVercel({ token: deploySecrets.VERCEL_TOKEN }) }, { projectId: project.id, projectName: project.name, environment: d.environment, commitSha, appVars: appVarsFrom(envSecrets), knownValues, previousDeploymentId: prev?.version_id ?? null, rollbackVersion: d.kind === "rollback" ? d.version_id : null });
      } else {
        if (!deploySecrets.CLOUDFLARE_API_TOKEN || !deploySecrets.CLOUDFLARE_ACCOUNT_ID) throw new DeployFailed("add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID on the Secrets tab to deploy to Cloudflare");
        const cf = createCloudflare({ accountId: deploySecrets.CLOUDFLARE_ACCOUNT_ID, apiToken: deploySecrets.CLOUDFLARE_API_TOKEN });
        result = await runCloudflareDeploy({ ...deps, cf }, { projectId: project.id, projectName: project.name, environment: d.environment, commitSha, appVars: appVarsFrom(envSecrets), knownValues, rollbackVersion: d.kind === "rollback" ? d.version_id : null });
      }
      const { error: liveErr } = await ctx.db.rpc("mark_deployment_live", { p_deployment: d.id, p_url: result.url, p_version: result.versionId });
      if (liveErr) throw new DeployFailed(`couldn't record the go-live: ${liveErr.message}`);
    } catch (e) {
      const message = redactSecrets((e as Error).message, knownValues).slice(0, 2000);
      await log(`Failed: ${message}`).catch(() => undefined);
      await ctx.db.from("deployments").update({ status: "failed", error: message }).eq("id", d.id);
    }
  }
}
