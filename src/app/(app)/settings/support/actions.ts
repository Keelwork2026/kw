"use server";
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/org";
import type { ActionResult } from "@/components/action-form";

export async function decideSupport(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOrg();
  const approve = form.get("approve") === "1";
  const hours = form.get("hours") ? Number(form.get("hours")) : null;
  const { error } = await supabase.rpc("decide_support_access", { p_grant: String(form.get("grantId")), p_approve: approve, p_hours: hours });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/settings/support");
  return { ok: true, message: approve ? "Approved. Access ends automatically at the time shown." : "Denied." };
}

export async function revokeSupport(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOrg();
  const { error } = await supabase.rpc("revoke_support_access", { p_grant: String(form.get("grantId")) });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/settings/support");
  return { ok: true, message: "Revoked." };
}
