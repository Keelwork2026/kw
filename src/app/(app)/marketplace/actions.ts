"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/org";
import { loadProject } from "@/lib/project";
import { createServiceClient } from "@/lib/supabase/server";
import { brokerConfig, createBrokerClient, sandboxIdFor } from "@/lib/sandbox/client";
import { lsFilesArgs } from "@/lib/code/git";
import { parseEntries } from "@/lib/code/tree";
import { packageTemplate, validateListing } from "@/lib/marketplace/package";
import { migrationsDirFor, isBackend } from "@/lib/stack/backends";
import { loadMasterKeys } from "@/lib/secrets/vault";
import { decryptProjectSecrets } from "@/lib/secrets/load";
import { isUuid } from "@/lib/nav";
import type { ActionResult } from "@/components/action-form";

export async function publishProject(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const listing = { title: String(form.get("title") ?? ""), description: String(form.get("description") ?? ""), category: String(form.get("category") ?? ""), rightsConfirmed: form.get("rights") === "yes" };
  const invalid = validateListing(listing);
  if (invalid) return { ok: false, message: invalid };
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.manage")) return { ok: false, message: "Only owners and admins can publish a project." };
  const cfg = brokerConfig();
  if (!cfg) return { ok: false, message: "The sandbox service isn't connected, so the project's files can't be packaged." };
  const broker = createBrokerClient(cfg);
  const sb = sandboxIdFor(project.id);
  const ls = await broker.exec(sb, lsFilesArgs()).catch(() => null);
  if (!ls) return { ok: false, message: "Start the project's sandbox first." };
  const files = (await Promise.all(parseEntries(ls.stdout).slice(0, 2000).map(async (p) => ({ path: p, content: await broker.readFile(sb, p).catch(() => "") }))));
  let known: string[] = [];
  try { const keys = loadMasterKeys(process.env.SECRETS_MASTER_KEYS); if (keys) for (const e of ["development", "preview", "production"] as const) known = known.concat(Object.values(await decryptProjectSecrets(createServiceClient(), project.id, e, keys))); } catch { /* pattern scan still runs */ }
  const pkg = packageTemplate(files, known, isBackend(project.backend) ? migrationsDirFor(project.backend) : null);
  const { error } = await supabase.rpc("publish_marketplace_item", {
    p_project: project.id, p_title: listing.title.trim(), p_description: listing.description.trim(), p_category: listing.category, p_rights_confirmed: true,
    p_files: pkg.files, p_manifest: pkg.manifest, p_findings: pkg.findings, p_blocking: pkg.blocking,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/marketplace");
  return pkg.blocking
    ? { ok: true, message: `Submitted, but ${pkg.blocking} blocking finding(s) must be fixed before a reviewer can approve it. Fix them and publish again.` }
    : { ok: true, message: "Submitted for review. A Keelwork reviewer checks every template before it's listed." };
}

export async function installItem(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const item = String(form.get("itemId") ?? "");
  if (!isUuid(item)) return { ok: false, message: "Invalid template." };
  const { supabase, org, can } = await requireOrg();
  if (!can("project.write")) return { ok: false, message: "You can't create projects in this organization." };
  const { data, error } = await supabase.rpc("install_template", { p_item: item, p_org: org.id, p_name: String(form.get("name") ?? "") });
  if (error) return { ok: false, message: /project limit/.test(error.message) ? "Your plan's project limit is reached." : error.message };
  redirect(`/projects/${data}`);
}
