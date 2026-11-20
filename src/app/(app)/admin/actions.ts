"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/nav";
import type { ActionResult } from "@/components/action-form";

export async function reviewItem(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = String(form.get("itemId") ?? "");
  const decision = String(form.get("decision") ?? "");
  if (!isUuid(id) || !["approve", "reject", "delist"].includes(decision)) return { ok: false, message: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_marketplace_item", { p_item: id, p_decision: decision, p_note: String(form.get("note") ?? "") || null });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
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
