"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { loadProject } from "@/lib/project";
import { requireOrg } from "@/lib/org";
import { createServiceClient } from "@/lib/supabase/server";
import { brokerConfig, createBrokerClient, sandboxIdFor } from "@/lib/sandbox/client";
import { lsFilesArgs } from "@/lib/code/git";
import { parseEntries } from "@/lib/code/tree";
import { collectForExport, shouldInclude } from "@/lib/export/collect";
import { loadMasterKeys } from "@/lib/secrets/vault";
import { decryptProjectSecrets } from "@/lib/secrets/load";
import type { ActionResult } from "@/components/action-form";

const fail = (message: string): ActionResult => ({ ok: false, message });

/**
 * Duplicates a project with its code: same brief and stack, every source
 * file copied into a fresh sandbox and committed. Secrets are never copied,
 * and — like export — a copy is refused if any file contains a credential.
 */
export async function duplicateProject(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { project, can } = await loadProject(String(form.get("projectId") ?? ""));
  const { supabase, org, can: canOrg } = await requireOrg();
  if (!can("project.write") || !canOrg("project.write")) return fail("You can't duplicate this project.");
  const cfg = brokerConfig();
  if (!cfg) return fail("The sandbox service isn't connected, so the code can't be copied. Use “Start a similar project” to reuse the brief.");
  const broker = createBrokerClient(cfg);
  const src = sandboxIdFor(project.id);
  const ls = await broker.exec(src, lsFilesArgs()).catch(() => null);
  if (!ls || ls.exitCode !== 0) return fail("Start this project's sandbox first (Build tab → preview), then duplicate it — the code is read from there.");
  const paths = parseEntries(ls.stdout).filter(shouldInclude);
  if (!paths.length) return fail("There's no code to copy yet. Use “Start a similar project” to reuse the brief.");
  const files = await Promise.all(paths.map(async (p) => ({ path: p, content: await broker.readFileBytes(src, p).catch(() => null) })));
  if (files.some((f) => f.content === null)) return fail("Some files couldn't be read from the sandbox. Try again.");

  // The same credential scan as export: secret values the project knows, plus pattern rules.
  let known: string[] = [];
  try {
    const keys = loadMasterKeys(process.env.SECRETS_MASTER_KEYS);
    if (keys) for (const env of ["development", "preview", "production"] as const) known = known.concat(Object.values(await decryptProjectSecrets(createServiceClient(), project.id, env, keys)));
  } catch { /* pattern rules still apply */ }
  const collected = collectForExport(files as { path: string; content: Buffer }[], known);
  if (!collected.ok) {
    if (collected.reason === "limits") return fail(`This project is too large to duplicate (${collected.message}).`);
    return fail(`Not copied: credentials were found in ${collected.findings.map((f) => f.file).slice(0, 3).join(", ")}. Remove and rotate them, then try again.`);
  }

  const name = `${project.name} (copy)`.slice(0, 80);
  const { data: newId, error } = await supabase.rpc("create_project", { p_org: org.id, p_name: name, p_description: project.description, p_prompt: null, p_template: null });
  if (error || !newId) {
    if (error && /project limit/.test(error.message)) return fail("Your plan's project limit is reached. Archive a project or upgrade, then duplicate.");
    return fail("Couldn't create the copy. Try again.");
  }
  const copyId = String(newId);
  await supabase.rpc("set_project_stack", { p_project: copyId, p_backend: (project as { backend?: string }).backend ?? "supabase", p_deploy_target: (project as { deploy_target?: string }).deploy_target ?? "cloudflare" });

  let installed = false;
  try {
    await broker.create(copyId);
    const dst = sandboxIdFor(copyId);
    for (const f of collected.files) await broker.writeFile(dst, f.path, f.content);
    await broker.exec(dst, ["git", "init", "-q"]);
    await broker.exec(dst, ["git", "add", "-A"]);
    await broker.exec(dst, ["git", "-c", "user.name=Keelwork", "-c", "user.email=agents@keelwork.invalid", "commit", "-qm", `Copied from ${project.name}`]);
    // Install packages now so the copy's preview starts like the original's.
    const install = await broker.exec(dst, ["pnpm", "install"]).catch(() => null);
    installed = install?.exitCode === 0;
    await createServiceClient().from("sandboxes").upsert({ project_id: copyId, org_id: org.id, status: "stopped", error: null }, { onConflict: "project_id" });
  } catch (e) {
    revalidatePath("/projects");
    return fail(`The copy “${name}” was created, but its code couldn't be written (${(e as Error).message.slice(0, 120)}). Open it and start the sandbox, or archive it.`);
  }
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${copyId}?created=1&copied=${collected.files.length}${installed ? "" : "&install=failed"}`);
}
