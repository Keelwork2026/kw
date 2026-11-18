"use server";
import { revalidatePath } from "next/cache";
import { loadProject } from "@/lib/project";
import type { ActionResult } from "@/components/action-form";

const KINDS = new Set(["tests", "affected_tests", "lint", "typecheck", "build", "audit", "secrets", "review"]);

export async function requestChecks(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const kinds = form.getAll("kind").map(String).filter((k) => KINDS.has(k));
  if (!kinds.length) return { ok: false, message: "Choose a check." };
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.write")) return { ok: false, message: "You can't run checks in this project." };
  const { error } = await supabase.rpc("request_checks", { p_project: project.id, p_kinds: kinds });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/projects/${project.id}/tests`);
  revalidatePath(`/projects/${project.id}/security`);
  return { ok: true, message: "Queued. The agent worker runs it in the sandbox." };
}
