"use server";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { dollarsToMicros, isStaffRole } from "@/lib/admin/staff";
import { isUuid } from "@/lib/nav";
import type { ActionResult } from "@/components/action-form";

export async function reviewItem(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = String(form.get("itemId") ?? "");
  const decision = String(form.get("decision") ?? "");
  if (!isUuid(id) || !["approve", "reject", "delist"].includes(decision)) return { ok: false, message: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_marketplace_item", { p_item: id, p_decision: decision, p_note: String(form.get("note") ?? "") || null });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/marketplace");
  return { ok: true, message: `Item ${decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "delisted"}.` };
}

export async function requestAccess(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const org = String(form.get("orgId") ?? "");
  const hours = Number(form.get("hours"));
  if (!isUuid(org)) return { ok: false, message: "Invalid organization." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_support_access", { p_org: org, p_reason: String(form.get("reason") ?? ""), p_hours: hours });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/admin/orgs/${org}`);
  return { ok: true, message: "Requested. An owner of the organization must approve it on Settings → Support access." };
}

export async function revokeMyAccess(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_support_access", { p_grant: String(form.get("grantId")) });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Access ended." };
}

/** Platform staff: uphold or overturn an appealed policy decision, with a note for the person. */
export async function decidePolicy(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = String(form.get("eventId") ?? "");
  const decision = String(form.get("decision") ?? "");
  if (!isUuid(id) || !["upheld", "overturned"].includes(decision)) return { ok: false, message: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_policy_event", { p_event: id, p_decision: decision, p_note: String(form.get("note") ?? "") });
  if (error) return { ok: false, message: error.message.replace(/^.*?:\s*/, "") };
  revalidatePath("/admin/policy");
  return { ok: true, message: decision === "overturned" ? "Overturned — that request will now go through for them." : "Upheld." };
}

// ---- Back office (every action is checked again and audited in the database) ----

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const clean = (m: string) => m.replace(/^permission denied: platform admin$/, "Your staff role can't do that.");
async function call(fn: string, args: Record<string, unknown>, paths: string[], ok: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, message: clean(error.message) };
  for (const p of paths) revalidatePath(p);
  return { ok: true, message: ok };
}

export async function suspendOrg(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const org = s(f, "orgId"); if (!isUuid(org)) return { ok: false, message: "Invalid organization." };
  if (f.get("confirm") !== "yes") return { ok: false, message: "Tick the box to confirm." };
  return call("admin_suspend_org", { p_org: org, p_reason: s(f, "reason") }, [`/admin/orgs/${org}`, "/admin/orgs"], "Suspended. Its people can still read and pay; everything else is stopped, and queued work was cancelled.");
}
export async function unsuspendOrg(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const org = s(f, "orgId"); if (!isUuid(org)) return { ok: false, message: "Invalid organization." };
  return call("admin_unsuspend_org", { p_org: org, p_note: s(f, "note") }, [`/admin/orgs/${org}`, "/admin/orgs"], "Suspension lifted.");
}
export async function adjustCredits(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const org = s(f, "orgId"); if (!isUuid(org)) return { ok: false, message: "Invalid organization." };
  const micros = dollarsToMicros(s(f, "amount"));
  if (micros === null) return { ok: false, message: "Enter an amount like 25 or -10.50 (not zero, at most $10,000)." };
  return call("admin_adjust_credits", { p_org: org, p_amount_micros: micros, p_reason: s(f, "reason") }, [`/admin/orgs/${org}`], `${micros > 0 ? "Added" : "Removed"} $${(Math.abs(micros) / 1_000_000).toFixed(2)} of credit.`);
}

/** Bans go through Supabase Auth (signs them out everywhere); the database checks and records the action first. */
export async function setUserBan(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const user = s(f, "userId"); const ban = s(f, "ban") === "1"; const reason = s(f, "reason");
  if (!isUuid(user)) return { ok: false, message: "Invalid person." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_user_action", { p_user: user, p_action: ban ? "ban" : "unban", p_reason: reason });
  if (error) return { ok: false, message: clean(error.message) };
  const { error: authErr } = await createServiceClient().auth.admin.updateUserById(user, { ban_duration: ban ? "876000h" : "none" });
  if (authErr) {
    await supabase.rpc("admin_user_action", { p_user: user, p_action: "ban_failed", p_reason: `${ban ? "ban" : "unban"} failed: ${authErr.message}`.slice(0, 300) });
    return { ok: false, message: `Recorded, but Supabase Auth refused: ${authErr.message}` };
  }
  revalidatePath("/admin/people");
  return { ok: true, message: ban ? "Banned. They're signed out and can't sign in." : "Ban lifted. They can sign in again." };
}

export async function addStaff(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const role = s(f, "role"); if (!isStaffRole(role)) return { ok: false, message: "Choose a role." };
  return call("staff_add", { p_email: s(f, "email"), p_role: role, p_note: s(f, "note") || null }, ["/admin/staff"], "Added to staff. They'll see the back office the next time they load a page.");
}
export async function setStaffRole(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const user = s(f, "userId"); const role = s(f, "role");
  if (!isUuid(user) || !isStaffRole(role)) return { ok: false, message: "Invalid request." };
  return call("staff_set_role", { p_user: user, p_role: role }, ["/admin/staff"], "Role changed.");
}
export async function removeStaff(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const user = s(f, "userId"); if (!isUuid(user)) return { ok: false, message: "Invalid request." };
  return call("staff_remove", { p_user: user }, ["/admin/staff"], "Removed from staff. Their support access was ended.");
}

export async function updateReport(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const id = s(f, "reportId"); const status = s(f, "status");
  if (!isUuid(id) || !["open", "investigating", "actioned", "dismissed"].includes(status)) return { ok: false, message: "Invalid request." };
  return call("admin_update_report", { p_report: id, p_status: status, p_resolution: s(f, "resolution"), p_assign_to_me: f.get("assign") === "yes" }, ["/admin/safety"], status === "investigating" ? "Marked as yours and under investigation." : `Marked ${status}.`);
}
export async function linkReport(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const id = s(f, "reportId"); const org = s(f, "orgId");
  if (!isUuid(id) || !isUuid(org)) return { ok: false, message: "Paste the organization's id (from its staff page)." };
  return call("admin_link_report", { p_report: id, p_org: org }, ["/admin/safety"], "Linked.");
}

export async function publishAnnouncement(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const hours = s(f, "hours");
  return call("admin_publish_announcement", { p_message: s(f, "message"), p_level: s(f, "level"), p_hours: hours ? Number(hours) : null }, ["/admin/platform", "/dashboard"], "Published. Everyone signed in sees it now.");
}
export async function endAnnouncement(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const id = s(f, "id"); if (!isUuid(id)) return { ok: false, message: "Invalid request." };
  return call("admin_end_announcement", { p_id: id }, ["/admin/platform"], "Ended.");
}
export async function setFlag(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const key = s(f, "key"); const on = s(f, "enabled") === "1";
  return call("admin_set_flag", { p_key: key, p_enabled: on, p_reason: s(f, "reason") }, ["/admin/platform"], on ? "Switched on." : "Switched off. The database now refuses it everywhere.");
}
