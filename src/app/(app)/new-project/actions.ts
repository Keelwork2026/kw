"use server";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import type { ActionResult } from "@/components/action-form";

export async function createProject(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, org, can } = await requireOrg();
  if (!can("project.write")) return { ok: false, message: "You don't have permission to create projects." };
  const name = String(form.get("name") ?? "").trim();
  const prompt = String(form.get("prompt") ?? "").trim();
  const template = String(form.get("template") ?? "").trim();
  if (!name || name.length > 80) return { ok: false, message: "Give the project a name of 1–80 characters." };
  if (prompt.length > 2000) return { ok: false, message: "Keep the description under 2000 characters." };
  const { data, error } = await supabase.rpc("create_project", {
    p_org: org.id, p_name: name, p_description: prompt ? prompt.slice(0, 280) : null,
    p_prompt: prompt || null, p_template: /^[a-z0-9-]{1,48}$/.test(template) ? template : null,
  });
  if (error) {
    if (/project limit/.test(error.message)) return { ok: false, message: "Your plan's project limit is reached. Archive a project or upgrade on the Billing page." };
    return { ok: false, message: /permission/.test(error.message) ? "You don't have permission to create projects." : "Couldn't create the project. Try again." };
  }
  redirect(`/projects/${data}`);
}
