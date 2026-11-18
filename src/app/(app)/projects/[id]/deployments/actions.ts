"use server";
import { revalidatePath } from "next/cache";
import { loadProject } from "@/lib/project";
import { isUuid } from "@/lib/nav";
import type { ActionResult } from "@/components/action-form";

export async function deploy(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const environment = String(form.get("environment") ?? "");
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.manage")) return { ok: false, message: "Only owners and admins can deploy." };
  if (environment === "production" && form.get("confirm") !== "yes") return { ok: false, message: "Tick the box to confirm a production deployment." };
  const { error } = await supabase.rpc("request_deployment", { p_project: project.id, p_environment: environment, p_confirm: environment === "production" });
  if (error) {
    if (/critical/.test(error.message)) return { ok: false, message: "Open critical security findings block deployments. Fix them on the Security tab first." };
    if (/one_active/.test(error.message)) return { ok: false, message: `A ${environment} deployment is already in progress.` };
    return { ok: false, message: error.message };
  }
  revalidatePath(`/projects/${project.id}/deployments`);
  return { ok: true, message: `Queued. It's only marked live after its health check passes.` };
}

export async function rollback(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const target = String(form.get("target") ?? "");
  if (!isUuid(target)) return { ok: false, message: "Choose a version." };
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.manage")) return { ok: false, message: "Only owners and admins can roll back." };
  const { error } = await supabase.rpc("request_rollback", { p_project: project.id, p_environment: String(form.get("environment")), p_target: target });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/projects/${project.id}/deployments`);
  return { ok: true, message: "Rollback queued." };
}
