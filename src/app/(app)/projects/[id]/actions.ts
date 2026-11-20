"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loadProject } from "@/lib/project";
import { createServiceClient } from "@/lib/supabase/server";
import { gatewayFor, serverCatalog } from "@/lib/ai/server";
import { parsePlan, planMessages } from "@/lib/ai/plan";
import { backendRules, isBackend, isDeployTarget } from "@/lib/stack/backends";
import { limitOrMessage } from "@/lib/security/server-limit";
import { brokerConfig, createBrokerClient, sandboxIdFor } from "@/lib/sandbox/client";
import { storeSecret } from "@/lib/secrets/server";
import { isUuid } from "@/lib/nav";
import type { ActionResult } from "@/components/action-form";
import { screenRequest, REVIEW_HINT } from "@/lib/policy/server";

function str(form: FormData, k: string) { const v = form.get(k); return typeof v === "string" ? v : ""; }
function fail(message: string): ActionResult { return { ok: false, message }; }

/** Posts the person's message, then asks the Software Architect for a plan. */
export async function sendMessage(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const projectId = str(form, "projectId");
  const content = str(form, "content").trim();
  if (!content) return fail("Write a message first.");
  if (content.length > 8000) return fail("Keep messages under 8000 characters.");
  const { supabase, project, can, userId } = await loadProject(projectId);
  if (!can("project.write")) return fail("You can't write to this project.");

  const { data: thread } = await supabase.from("threads").select("id").eq("project_id", project.id).order("created_at").limit(1).single();
  if (!thread) return fail("This project has no chat thread.");
  const { error: msgErr } = await supabase.from("messages").insert({ thread_id: thread.id, role: "user", content, author_id: userId });
  if (msgErr) return fail("Couldn't post your message.");
  revalidatePath(`/projects/${project.id}`);
  return planFromThread(project.id, thread.id, project.org_id, userId, project.backend);
}

/** Asks for a plan from the existing thread (e.g. the idea carried in from sign-up). */
export async function requestPlan(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can, userId } = await loadProject(str(form, "projectId"));
  if (!can("project.write")) return fail("You can't write to this project.");
  const { data: thread } = await supabase.from("threads").select("id").eq("project_id", project.id).order("created_at").limit(1).single();
  if (!thread) return fail("This project has no chat thread.");
  return planFromThread(project.id, thread.id, project.org_id, userId, project.backend, str(form, "route") === "reason" ? "reason" : "plan");
}

async function planFromThread(projectId: string, threadId: string, orgId: string, userId: string, backend: string, route: "plan" | "reason" = "plan"): Promise<ActionResult> {
  const { catalog, error: catErr } = serverCatalog();
  if (!catalog) return { ok: true, message: catErr ? `Your message is saved, but AI is misconfigured: ${catErr}` : "Your message is saved. AI isn't configured on this installation, so no plan can be made yet." };
  const limited = await limitOrMessage("aiMessage", userId);
  if (limited) return fail(limited);

  const db = createServiceClient();
  const { data: history } = await db.from("messages").select("role, content").eq("thread_id", threadId).order("created_at", { ascending: false }).limit(13);
  const ordered = (history ?? []).reverse();
  const last = ordered.pop();
  if (!last || last.role !== "user") return fail("There's nothing new to plan.");
  const convo = ordered.filter((m) => m.role !== "system").map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string }));

  // Policy: judge what the project would DO, across everything the person has asked for in this thread.
  const asked = [...convo.filter((m) => m.role === "user").map((m) => m.content), last.content as string].join("\n");
  const screened = await screenRequest(asked, { orgId, userId, projectId, source: "chat" });
  if (screened.refusal) {
    await db.from("messages").insert({ thread_id: threadId, org_id: orgId, role: "assistant", content: `${screened.refusal} ${REVIEW_HINT}`, metadata: { policy_event_id: screened.eventId } });
    revalidatePath(`/projects/${projectId}`);
    return fail(`${screened.refusal} ${REVIEW_HINT}`);
  }

  await db.from("projects").update({ status: "planning" }).eq("id", projectId).in("status", ["draft", "live"]);
  try {
    const gw = gatewayFor({ orgId, projectId, userId });
    const res = await gw.complete({
      route,
      json: true,
      maxOutputTokens: 4000,
      messages: planMessages({ description: last.content as string, history: convo, backendRules: isBackend(backend) ? backendRules(backend) : undefined, policyNote: screened.note || undefined }),
    });
    const parsed = parsePlan(res.text);
    if (!parsed.ok) return fail(`The planner's answer wasn't a valid plan (${parsed.error}), so it isn't shown. Try rephrasing.`);
    const { data: plan, error } = await db.from("plans").insert({ project_id: projectId, org_id: orgId, thread_id: threadId, content: parsed.plan, created_by: userId }).select("id").single();
    if (error || !plan) return fail("Couldn't save the plan.");
    await db.from("messages").insert({ thread_id: threadId, org_id: orgId, role: "assistant", content: parsed.plan.summary, metadata: { plan_id: plan.id } });
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, message: "A plan is ready for you to review." };
  } catch (e) {
    return fail((e as Error).message);
  } finally {
    await db.from("projects").update({ status: "draft" }).eq("id", projectId).eq("status", "planning");
  }
}

export async function approvePlan(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const planId = str(form, "planId");
  if (!isUuid(planId)) return fail("Invalid plan.");
  const { supabase, project, can } = await loadProject(str(form, "projectId"));
  if (!can("project.write")) return fail("You can't approve plans in this project.");
  const { error } = await supabase.rpc("approve_plan", { p_plan: planId });
  if (error) return fail(error.message.includes("already running") ? "A build is already running for this project." : error.message);
  revalidatePath(`/projects/${project.id}`);
  return { ok: true, message: "Approved. The agents are queued and will start when the worker picks up the build." };
}

export async function decideApproval(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = str(form, "approvalId");
  const approve = str(form, "decision") === "approve";
  if (!isUuid(id)) return fail("Invalid request.");
  const { supabase, project, can } = await loadProject(str(form, "projectId"));
  if (!can("project.write")) return fail("You can't decide requests in this project.");
  const { data: approval } = await supabase.from("approvals").select("id, kind, details, status").eq("id", id).eq("project_id", project.id).single();
  if (!approval) return fail("Request not found.");

  if (approve && approval.kind === "secret_request") {
    const value = str(form, "secretValue");
    const name = String((approval.details as { name?: string }).name ?? "");
    if (!value) return fail("Enter the secret value to approve this request.");
    if (!can("secret.manage")) return fail("Only owners and admins can provide secrets.");
    const stored = await storeSecret({ supabase, projectId: project.id, name, environment: "development", value });
    if (!stored.ok) return fail(stored.message);
  }
  const { data: status, error } = await supabase.rpc("decide_approval", { p_approval: id, p_approve: approve, p_note: str(form, "note") || null });
  if (error) return fail(/permission/.test(error.message) ? "This request needs an owner or admin." : error.message);
  revalidatePath(`/projects/${project.id}`);
  if (status === "expired") return fail("This request expired before it was decided. The agent will ask again if it still needs it.");
  return { ok: true, message: approve ? "Approved." : "Declined." };
}

export async function controlRun(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const runId = str(form, "runId");
  const action = str(form, "action");
  if (!isUuid(runId) || !["pause", "resume", "cancel"].includes(action)) return fail("Invalid request.");
  const { supabase, project } = await loadProject(str(form, "projectId"));
  const { error } = await supabase.rpc("control_run", { p_run: runId, p_action: action });
  if (error) return fail(error.message);
  revalidatePath(`/projects/${project.id}`);
  return { ok: true, message: action === "pause" ? "Paused. File locks were released." : action === "resume" ? "Resumed." : "Cancelled." };
}

export async function setStack(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const backend = str(form, "backend");
  const target = str(form, "deployTarget");
  if (!isBackend(backend) || !isDeployTarget(target)) return fail("Choose a backend and a deploy target.");
  const { supabase, project } = await loadProject(str(form, "projectId"));
  const { error } = await supabase.rpc("set_project_stack", { p_project: project.id, p_backend: backend, p_deploy_target: target });
  if (error) return fail(/first build/.test(error.message) ? "The stack is fixed once the first build has started." : error.message);
  revalidatePath(`/projects/${project.id}`);
  return { ok: true, message: "Stack saved." };
}

/** Starts or restarts the project's sandbox on the broker host. */
export async function startSandbox(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { project, can } = await loadProject(str(form, "projectId"));
  if (!can("project.write")) return fail("You can't start this project's sandbox.");
  const cfg = brokerConfig();
  if (!cfg) return fail("The sandbox service isn't connected to this installation (SANDBOX_BROKER_URL is not set).");
  const broker = createBrokerClient(cfg);
  const db = createServiceClient();
  await db.from("sandboxes").upsert({ project_id: project.id, org_id: project.org_id, status: "starting", error: null }, { onConflict: "project_id" });
  try {
    if (str(form, "restart") === "1") await broker.stop(sandboxIdFor(project.id)).catch(() => undefined);
    await broker.create(project.id);
    await broker.serve(sandboxIdFor(project.id)).catch(() => undefined);
    await db.from("sandboxes").update({ status: "running", container: sandboxIdFor(project.id) }).eq("project_id", project.id);
    revalidatePath(`/projects/${project.id}`);
    return { ok: true, message: "Sandbox is running." };
  } catch (e) {
    await db.from("sandboxes").update({ status: "failed", error: (e as Error).message.slice(0, 500) }).eq("project_id", project.id);
    return fail(`The sandbox didn't start: ${(e as Error).message}`);
  }
}

/** Archives the project (owners and admins): it becomes read-only and stops counting toward the plan's project limit. Code, history and deployments are kept. */
export async function archiveProject(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(str(form, "projectId"));
  if (!can("project.manage")) return fail("Only owners and admins can archive projects.");
  if (str(form, "confirmName").trim() !== project.name) return fail(`Type the project name (${project.name}) to confirm.`);
  const { error } = await supabase.rpc("archive_project", { p_project: project.id });
  if (error) return fail(/project\.manage|permission/.test(error.message) ? "Only owners and admins can archive projects." : "Couldn't archive the project. Try again.");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect("/projects?archived=1");
}

/** Renames the project. Names are free text up to 80 characters. */
export async function renameProject(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(str(form, "projectId"));
  if (!can("project.write")) return fail("You can't rename this project.");
  const name = str(form, "name").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!name || name.length > 80) return fail("Use a name of 1–80 characters.");
  if (name === project.name) return { ok: true, message: "That's already its name." };
  const { error } = await supabase.from("projects").update({ name }).eq("id", project.id);
  if (error) return fail("Couldn't rename the project. Try again.");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${project.id}`, "layout");
  return { ok: true, message: `Renamed to “${name}”.` };
}

/** Restores an archived project (owners and admins), within the plan's project limit. */
export async function restoreProject(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project } = await loadProject(str(form, "projectId"));
  const { error } = await supabase.rpc("restore_project", { p_project: project.id });
  if (error) {
    if (/project limit/.test(error.message)) return fail("Your plan's project limit is reached. Archive another project or upgrade on the Billing page, then restore this one.");
    if (/project\.manage|permission/.test(error.message)) return fail("Only owners and admins can restore projects.");
    if (/not archived/.test(error.message)) return fail("This project isn't archived.");
    return fail("Couldn't restore the project. Try again.");
  }
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}
