"use server";
import { revalidatePath } from "next/cache";
import { loadProject } from "@/lib/project";
import { storeSecret } from "@/lib/secrets/server";
import type { ActionResult } from "@/components/action-form";

export async function setSecret(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("secret.manage")) return { ok: false, message: "Only owners and admins can change secrets." };
  const name = String(form.get("name") ?? "").trim().toUpperCase();
  const environment = String(form.get("environment") ?? "");
  const value = String(form.get("value") ?? "");
  if (!value) return { ok: false, message: "Enter a value." };
  const r = await storeSecret({ supabase, projectId: project.id, name, environment, value });
  if (!r.ok) return r;
  revalidatePath(`/projects/${project.id}/secrets`);
  return { ok: true, message: `${name} saved for ${environment}. Its value can't be shown again.` };
}

export async function deleteSecret(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("secret.manage")) return { ok: false, message: "Only owners and admins can change secrets." };
  const { error } = await supabase.rpc("delete_project_secret", { p_project: project.id, p_name: String(form.get("name")), p_environment: String(form.get("environment")) });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/projects/${project.id}/secrets`);
  return { ok: true, message: "Secret deleted." };
}
