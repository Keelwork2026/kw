"use server";
import { revalidatePath } from "next/cache";
import { loadProject } from "@/lib/project";
import type { ActionResult } from "@/components/action-form";

export async function acceptRisk(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.manage")) return { ok: false, message: "Only owners and admins can accept risks." };
  const { error } = await supabase.rpc("accept_finding_risk", { p_finding: String(form.get("findingId")), p_reason: String(form.get("reason") ?? "") });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/projects/${project.id}/security`);
  return { ok: true, message: "Risk accepted and recorded in the audit log." };
}

export async function reopen(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.manage")) return { ok: false, message: "Only owners and admins can reopen findings." };
  const { error } = await supabase.rpc("reopen_finding", { p_finding: String(form.get("findingId")) });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/projects/${project.id}/security`);
  return { ok: true, message: "Reopened." };
}
