"use server";
import { revalidatePath } from "next/cache";
import { loadProject } from "@/lib/project";
import { brokerConfig, createBrokerClient, sandboxIdFor } from "@/lib/sandbox/client";
import { createServiceClient } from "@/lib/supabase/server";
import { referencedFiles, repairRequest } from "@/lib/heal/incident";
import { lsFilesArgs } from "@/lib/code/git";
import { parseEntries } from "@/lib/code/tree";
import { loadMasterKeys } from "@/lib/secrets/vault";
import { decryptProjectSecrets } from "@/lib/secrets/load";
import { requestPlan } from "../actions";
import type { ActionResult } from "@/components/action-form";

/** "Propose a fix": builds a repair request from the real error and code, posts it, and asks for a plan. */
export async function proposeFix(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.write")) return { ok: false, message: "You can't change this project." };
  const { data: incident } = await supabase.from("incidents").select("id, title, source, signature, count, detail, status").eq("id", String(form.get("incidentId"))).eq("project_id", project.id).single();
  if (!incident) return { ok: false, message: "Incident not found." };

  const files = new Map<string, string>();
  const cfg = brokerConfig();
  if (cfg) {
    const broker = createBrokerClient(cfg);
    const sb = sandboxIdFor(project.id);
    const known = new Set(parseEntries((await broker.exec(sb, lsFilesArgs()).catch(() => ({ stdout: "" }))).stdout));
    const text = JSON.stringify(incident.detail);
    for (const ref of referencedFiles(text.replace(/\\n/g, "\n"), known)) {
      if (!files.has(ref.file)) files.set(ref.file, await broker.readFile(sb, ref.file).catch(() => ""));
    }
  }
  let secrets: string[] = [];
  try {
    const keys = loadMasterKeys(process.env.SECRETS_MASTER_KEYS);
    if (keys) for (const env of ["development", "preview", "production"] as const) secrets = secrets.concat(Object.values(await decryptProjectSecrets(createServiceClient(), project.id, env, keys)));
  } catch { /* pattern redaction still applies downstream */ }

  const detail = incident.detail as Record<string, unknown>;
  const request = repairRequest({ ...incident, detail: { ...detail, error: String(detail.error ?? detail.output_tail ?? "").replace(/\\n/g, "\n") || JSON.stringify(detail) } }, files, secrets);
  const { error } = await supabase.rpc("request_fix", { p_incident: incident.id, p_request: request });
  if (error) return { ok: false, message: error.message };
  const next = new FormData();
  next.set("projectId", project.id);
  next.set("route", "reason");
  const planned = await requestPlan(null, next);
  revalidatePath(`/projects/${project.id}/incidents`);
  return planned?.ok ? { ok: true, message: "A fix plan is ready for approval on the Build tab." } : { ok: true, message: `The repair request is on the Build tab. ${planned?.message ?? ""}` };
}

export async function dismiss(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project } = await loadProject(String(form.get("projectId") ?? ""));
  const { error } = await supabase.rpc("dismiss_incident", { p_incident: String(form.get("incidentId")), p_reason: String(form.get("reason") ?? "") });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/projects/${project.id}/incidents`);
  return { ok: true, message: "Dismissed." };
}
