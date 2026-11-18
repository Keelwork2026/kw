"use server";
import { revalidatePath } from "next/cache";
import { loadProject } from "@/lib/project";
import type { ActionResult } from "@/components/action-form";

export async function enableAnalytics(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.manage")) return { ok: false, message: "Only owners and admins can turn on analytics." };
  const origins = String(form.get("origins") ?? "").split(/[\s,]+/).map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
  const { error } = await supabase.rpc("enable_analytics", { p_project: project.id, p_origins: origins });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/projects/${project.id}/analytics`);
  return { ok: true, message: "Analytics is on. Add NEXT_PUBLIC_KW_ANALYTICS_URL (shown below) to the app's variables and redeploy." };
}
