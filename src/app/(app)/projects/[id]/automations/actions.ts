"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { loadProject } from "@/lib/project";
import { validateDefinition } from "@/lib/automation/definition";
import { parseCron, nextRun } from "@/lib/automation/cron";
import { WORKFLOW_TEMPLATES } from "@/lib/automation/templates";
import { webhookSecretName } from "@/lib/automation/webhook";
import { encryptSecret, loadMasterKeys } from "@/lib/secrets/vault";
import { isUuid } from "@/lib/nav";
import type { ActionResult } from "@/components/action-form";

function fail(message: string): ActionResult { return { ok: false, message }; }

export async function saveWorkflow(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.write")) return fail("You can't edit automations in this project.");
  const workflowId = String(form.get("workflowId") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const trigger = String(form.get("trigger") ?? "");
  const schedule = String(form.get("schedule") ?? "").trim();
  if (!name || name.length > 80) return fail("Give the automation a name (1–80 characters).");
  if (!["manual", "webhook", "schedule"].includes(trigger)) return fail("Choose a trigger.");
  if (trigger === "schedule") { try { parseCron(schedule); } catch (e) { return fail(`Schedule: ${(e as Error).message}`); } }
  let def: unknown;
  try { def = JSON.parse(String(form.get("definition") ?? "")); } catch { return fail("The steps aren't valid JSON."); }
  const v = validateDefinition(def);
  if (!v.ok) return fail(`Fix these first: ${v.errors.slice(0, 5).join("; ")}`);
  const { error } = await supabase.rpc("save_workflow", { p_project: project.id, p_workflow: isUuid(workflowId) ? workflowId : null, p_name: name, p_trigger: trigger, p_schedule: trigger === "schedule" ? schedule : null, p_definition: v.definition });
  if (error) return fail(error.message);
  revalidatePath(`/projects/${project.id}/automations`);
  revalidatePath("/automation");
  return { ok: true, message: "Saved as a draft. An owner or admin switches it on." };
}

export async function createFromTemplate(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const t = WORKFLOW_TEMPLATES.find((x) => x.key === form.get("template"));
  if (!t) return fail("Unknown template.");
  const next = new FormData();
  next.set("projectId", String(form.get("projectId")));
  next.set("name", t.name); next.set("trigger", t.trigger); next.set("schedule", t.schedule ?? ""); next.set("definition", JSON.stringify(t.definition));
  return saveWorkflow(null, next);
}

export async function setEnabled(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = String(form.get("workflowId") ?? "");
  const enable = form.get("enabled") === "1";
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.manage")) return fail("Only owners and admins can switch automations on or off.");
  const { data: wf } = await supabase.from("workflows").select("trigger_kind, schedule").eq("id", id).eq("project_id", project.id).single();
  if (!wf) return fail("Automation not found.");
  let next: string | null = null;
  if (enable && wf.trigger_kind === "schedule") { try { next = nextRun(String(wf.schedule), new Date()).toISOString(); } catch (e) { return fail((e as Error).message); } }
  const { error } = await supabase.rpc("set_workflow_enabled", { p_workflow: id, p_enabled: enable, p_next_run_at: next });
  if (error) return fail(error.message);
  revalidatePath(`/projects/${project.id}/automations`);
  revalidatePath("/automation");
  return { ok: true, message: enable ? `Switched on.${next ? ` Next run ${next.replace("T", " ").slice(0, 16)} UTC.` : ""}` : "Switched off." };
}

export async function runNow(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.write")) return fail("You can't run automations in this project.");
  let input: unknown = {};
  const raw = String(form.get("input") ?? "").trim();
  if (raw) { try { input = JSON.parse(raw); } catch { return fail("The test input isn't valid JSON."); } }
  const { error } = await supabase.rpc("run_workflow_now", { p_workflow: String(form.get("workflowId")), p_input: { body: input } });
  if (error) return fail(error.message);
  revalidatePath(`/projects/${project.id}/automations`);
  revalidatePath("/automation");
  return { ok: true, message: "Queued. The automation runner picks it up within seconds when it's deployed." };
}

export async function cancelRun(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project } = await loadProject(String(form.get("projectId") ?? ""));
  const { error } = await supabase.rpc("cancel_workflow_run", { p_run: String(form.get("runId")) });
  if (error) return fail(error.message);
  revalidatePath(`/projects/${project.id}/automations`);
  revalidatePath("/automation");
  return { ok: true, message: "Cancelled." };
}

/** Creates or rotates the signing secret. It's shown once, here, and stored encrypted. */
export async function rotateWebhookSecret(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = String(form.get("workflowId") ?? "");
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.manage")) return fail("Only owners and admins can rotate signing secrets.");
  let keys;
  try { keys = loadMasterKeys(process.env.SECRETS_MASTER_KEYS); } catch { keys = null; }
  if (!keys) return fail("Webhooks need SECRETS_MASTER_KEYS on this installation.");
  const secret = `whsec_${randomBytes(24).toString("base64url")}`;
  const envelope = encryptSecret(keys, { projectId: project.id, name: webhookSecretName(id), environment: "production" }, secret);
  const { data: endpoint, error } = await supabase.rpc("set_webhook_secret", { p_workflow: id, p_envelope: envelope });
  if (error) return fail(error.message);
  revalidatePath(`/projects/${project.id}/automations`);
  revalidatePath("/automation");
  const url = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/api/hooks/${endpoint}`;
  return { ok: true, message: `Copy this now — it won't be shown again. URL: ${url}  Secret: ${secret}  Sign each request with keelwork-signature: t=<unix seconds>,v1=HMAC-SHA256(secret, "<t>.<body>").` };
}
