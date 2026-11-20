"use server";
import { revalidatePath } from "next/cache";
import { loadProject } from "@/lib/project";
import type { ActionResult } from "@/components/action-form";
import { categoriesFor } from "@/lib/qa/score";
import { CATEGORIES, normalizeSettings, SEVERITIES, type Category, type Mode } from "@/lib/qa/types";
import { sendMessage } from "../actions";

const MODES: Mode[] = ["quick", "full", "predeploy", "custom", "regression"];
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const done = (projectId: string, message: string): ActionResult => { revalidatePath(`/projects/${projectId}/qa`); return { ok: true, message }; };

/** Start a QA run: Quick, Full, Pre-deployment, Regression, or chosen categories / pages / endpoints. */
export async function runQa(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const mode = s(form, "mode") as Mode;
  if (!MODES.includes(mode)) return { ok: false, message: "Choose how much to test." };
  const chosen = form.getAll("category").map(String).filter((c): c is Category => CATEGORIES.includes(c as Category));
  if (mode === "custom" && !chosen.length) return { ok: false, message: "Choose at least one category to test." };
  const pages = s(form, "pages").split(/[\s,]+/).filter((p) => /^\/[\w\-./[\]]*$/.test(p)).slice(0, 20);
  const endpoints = s(form, "endpoints").split(/[\s,]+/).filter((p) => /^\/[\w\-./[\]]*$/.test(p)).slice(0, 20);
  const { supabase, project, can } = await loadProject(s(form, "projectId"));
  if (!can("project.write")) return { ok: false, message: "You can't run QA in this project." };
  const scope = { ...(pages.length ? { pages } : {}), ...(endpoints.length ? { endpoints } : {}), ...(mode === "regression" || form.get("changedOnly") === "on" ? { changedOnly: true } : {}) };
  const { error } = await supabase.rpc("request_qa_run", { p_project: project.id, p_mode: mode, p_categories: categoriesFor(mode, chosen), p_scope: scope, p_trigger: mode === "predeploy" ? "predeploy" : "manual" });
  if (error) return { ok: false, message: error.message.includes("already in progress") ? "A QA run is already in progress for this project. Wait for it or stop it first." : error.message };
  return done(project.id, "QA run queued. Progress appears here as the worker runs each step.");
}

export async function stopQa(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(s(form, "projectId"));
  if (!can("project.write")) return { ok: false, message: "You can't stop runs in this project." };
  const { error } = await supabase.rpc("stop_qa_run", { p_run: s(form, "runId") });
  if (error) return { ok: false, message: error.message };
  return done(project.id, "Stopping. The run ends after its current step and keeps the results it has.");
}

/** Re-run just the checks behind one issue (and its category), to verify a fix. */
export async function retestIssue(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(s(form, "projectId"));
  if (!can("project.write")) return { ok: false, message: "You can't run QA in this project." };
  const { data: issue } = await supabase.from("qa_issues").select("id, category, status").eq("id", s(form, "issueId")).eq("project_id", project.id).maybeSingle();
  if (!issue) return { ok: false, message: "Issue not found." };
  const cats = [...new Set([issue.category as Category, "regression" as Category])];
  const { error } = await supabase.rpc("request_qa_run", { p_project: project.id, p_mode: "custom", p_categories: cats, p_scope: { issueId: issue.id }, p_trigger: "retest" });
  if (error) return { ok: false, message: error.message.includes("already in progress") ? "Another QA run is in progress; retest when it finishes." : error.message };
  if (["fixed", "in_progress", "awaiting_review"].includes(issue.status as string)) await supabase.rpc("set_qa_issue_status", { p_issue: issue.id, p_status: "awaiting_retest", p_note: "Retest requested" });
  return done(project.id, "Retest queued. If the check passes, the issue is marked verified automatically.");
}

export async function setIssueStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(s(form, "projectId"));
  if (!can("project.write")) return { ok: false, message: "You can't triage issues in this project." };
  const { error } = await supabase.rpc("set_qa_issue_status", { p_issue: s(form, "issueId"), p_status: s(form, "status"), p_note: s(form, "note") || null });
  if (error) return { ok: false, message: error.message };
  return done(project.id, "Issue updated.");
}

export async function acceptRisk(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(s(form, "projectId"));
  if (!can("project.manage")) return { ok: false, message: "Only owners and admins can accept a risk." };
  const { error } = await supabase.rpc("accept_qa_risk", { p_issue: s(form, "issueId"), p_reason: s(form, "reason"), p_expires: s(form, "expires") || null });
  if (error) return { ok: false, message: error.message };
  return done(project.id, "Risk accepted and recorded. It counts as open again after the review date.");
}

/**
 * Remediation: posts a scoped instruction to the project's builder thread.
 * The planner proposes a plan (the preview), nothing changes until you
 * approve it, and the issues are retested when you ask (or automatically
 * after the build, if enabled in QA settings).
 */
export async function askAgentsToFix(prev: ActionResult, form: FormData): Promise<ActionResult> {
  const ids = form.getAll("issueId").map(String).slice(0, 10);
  const { supabase, project, can } = await loadProject(s(form, "projectId"));
  if (!can("project.write")) return { ok: false, message: "You can't change this project." };
  const { data: issues } = await supabase.from("qa_issues").select("id, ref, title, severity, description, recommendation, verify, target, evidence").eq("project_id", project.id).in("id", ids);
  if (!issues?.length) return { ok: false, message: "Choose at least one issue." };
  const extra = s(form, "note").slice(0, 1000);
  const lines = issues.map((i) => {
    const code = ((i.evidence ?? []) as { kind: string; file?: string; line?: number }[]).filter((e) => e.kind === "code").slice(0, 3).map((e) => `${e.file}${e.line ? `:${e.line}` : ""}`).join(", ");
    return `QA-${i.ref} [${i.severity}] ${i.title}\n  Problem: ${i.description}\n  Fix: ${i.recommendation}${i.target ? `\n  Where: ${i.target}` : ""}${code ? `\n  Code: ${code}` : ""}\n  Done when: ${i.verify}`;
  }).join("\n\n");
  const content = `Please fix ${issues.length === 1 ? "this QA issue" : `these ${issues.length} QA issues`}. Change only what is needed for these fixes: don't alter unrelated features, branding, data structures, business rules or copy. Explain any risk or side effect in the plan.\n\n${lines}${extra ? `\n\nNote from the owner: ${extra}` : ""}`;
  const next = new FormData();
  next.set("projectId", project.id);
  next.set("content", content.slice(0, 7900));
  const res = await sendMessage(prev, next);
  if (!res?.ok) return res;
  for (const i of issues) await supabase.rpc("set_qa_issue_status", { p_issue: i.id, p_status: "in_progress", p_note: "Sent to the agents to fix" });
  revalidatePath(`/projects/${project.id}`);
  return done(project.id, "Sent to the planner. Review and approve its plan on the Build tab; then retest here.");
}

export async function saveQaSettings(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(s(form, "projectId"));
  if (!can("project.manage")) return { ok: false, message: "Only owners and admins can change QA settings." };
  const lines = (k: string) => s(form, k).split(/\n|,/).map((x) => x.trim()).filter(Boolean);
  const settings = normalizeSettings({
    gate: {
      blockingSeverities: form.getAll("blocking").map(String).filter((x) => (SEVERITIES as readonly string[]).includes(x)),
      minOverall: Number(s(form, "minOverall")),
      requiredCategories: form.getAll("required").map(String),
      requireManualReview: form.get("manualReview") === "on",
      enforceOnDeploy: form.get("enforceOnDeploy") === "on",
    },
    excludedRoutes: lines("excludedRoutes"),
    excludedEndpoints: lines("excludedEndpoints"),
    viewports: lines("viewports").map(Number),
    maxPages: Number(s(form, "maxPages")),
    load: { enabled: form.get("loadEnabled") === "on", concurrency: Number(s(form, "loadConcurrency")), seconds: Number(s(form, "loadSeconds")) },
    activeSecurity: form.get("activeSecurity") === "on",
    autoAfterBuild: form.get("autoAfterBuild") === "on",
    weights: Object.fromEntries([...form.entries()].filter(([k]) => k.startsWith("w_")).map(([k, v]) => [k.slice(2), Number(v)])),
  });
  if (!settings.gate.blockingSeverities.length) return { ok: false, message: "Choose at least one severity that blocks release (critical is recommended)." };
  const { error } = await supabase.rpc("save_qa_settings", { p_project: project.id, p_settings: settings });
  if (error) return { ok: false, message: error.message };
  return done(project.id, "QA settings saved. They apply from the next run.");
}

export async function authorizePentest(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(s(form, "projectId"));
  if (!can("project.manage")) return { ok: false, message: "Only owners and admins can authorise penetration testing." };
  const on = s(form, "on") === "1";
  if (on && form.get("confirm") !== "on") return { ok: false, message: "Confirm that you own this app and authorise testing of its sandbox." };
  const { error } = await supabase.rpc("authorize_qa_pentest", { p_project: project.id, p_scope: s(form, "scope"), p_on: on });
  if (error) return { ok: false, message: error.message };
  return done(project.id, on ? "Authorised. Penetration probes run in Full QA, against this project's sandbox only." : "Authorisation withdrawn.");
}

export async function approveRelease(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(s(form, "projectId"));
  if (!can("project.manage")) return { ok: false, message: "Only owners and admins can approve a release." };
  const { error } = await supabase.rpc("approve_qa_release", { p_run: s(form, "runId"), p_note: s(form, "note") });
  if (error) return { ok: false, message: error.message };
  return done(project.id, "Approved for release. The approval is recorded in the audit log.");
}

export async function addPersona(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(s(form, "projectId"));
  if (!can("project.write")) return { ok: false, message: "You can't change this project." };
  const { error } = await supabase.from("qa_personas").insert({ project_id: project.id, name: s(form, "name").slice(0, 60), description: s(form, "description").slice(0, 600), goal: s(form, "goal").slice(0, 300) });
  if (error) return { ok: false, message: error.message.includes("check") ? "Give the persona a name, a description of at least 10 characters and a goal." : error.message };
  return done(project.id, "Persona saved. It runs in the next QA run that includes AI personas.");
}

export async function deletePersona(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, project, can } = await loadProject(s(form, "projectId"));
  if (!can("project.write")) return { ok: false, message: "You can't change this project." };
  await supabase.from("qa_personas").delete().eq("id", s(form, "personaId")).eq("project_id", project.id);
  return done(project.id, "Persona removed.");
}
