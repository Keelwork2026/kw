"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrg, setCurrentOrg } from "@/lib/org";
import { isUuid } from "@/lib/nav";
import { limitOrMessage } from "@/lib/security/server-limit";
import { sendInvitationEmail } from "@/lib/email";
import type { ActionResult } from "@/components/action-form";

const ROLES = ["owner", "admin", "member", "billing", "viewer"] as const;

function friendly(message: string): string {
  if (/permission denied/.test(message)) return "You don't have permission to do that.";
  if (/at least one owner/.test(message)) return "An organization must keep at least one active owner.";
  return message.replace(/^.*?:\s*/, "").slice(0, 200) || "Something went wrong.";
}

export async function createOrganization(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const name = String(form.get("name") ?? "").trim();
  if (!name || name.length > 80) return { ok: false, message: "Use a name of 1–80 characters." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization", { p_name: name });
  if (error) return { ok: false, message: friendly(error.message) };
  await setCurrentOrg(String(data));
  redirect("/dashboard");
}

export async function switchOrganization(form: FormData): Promise<void> {
  const id = String(form.get("org") ?? "");
  if (isUuid(id)) await setCurrentOrg(id);
  redirect("/dashboard");
}

export async function inviteMember(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, org, can } = await requireOrg();
  if (!can("members.invite")) return { ok: false, message: "You don't have permission to invite people." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role") ?? "member");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Enter a valid email address." };
  if (!ROLES.includes(role as (typeof ROLES)[number])) return { ok: false, message: "Choose a role." };
  const limited = await limitOrMessage("invite", org.id);
  if (limited) return { ok: false, message: limited };

  const { data: token, error } = await supabase.rpc("create_invitation", { p_org: org.id, p_email: email, p_role: role });
  if (error) return { ok: false, message: friendly(error.message) };
  const link = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/invite/${token}`;
  const sent = await sendInvitationEmail({ to: email, orgName: org.name, link });
  revalidatePath("/team");
  return sent
    ? { ok: true, message: `Invitation sent to ${email}.` }
    : { ok: true, message: `Invitation created. Email isn't configured, so share this link with ${email} yourself: ${link}` };
}

export async function revokeInvitation(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = String(form.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Invalid invitation." };
  const { supabase } = await requireOrg();
  const { error } = await supabase.rpc("revoke_invitation", { p_invitation: id });
  if (error) return { ok: false, message: friendly(error.message) };
  revalidatePath("/team");
  return { ok: true, message: "Invitation revoked." };
}

export async function changeRole(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const user = String(form.get("user") ?? "");
  const role = String(form.get("role") ?? "");
  if (!isUuid(user) || !ROLES.includes(role as (typeof ROLES)[number])) return { ok: false, message: "Invalid request." };
  const { supabase, org } = await requireOrg();
  const { error } = await supabase.rpc("update_member_role", { p_org: org.id, p_user: user, p_role: role });
  if (error) return { ok: false, message: friendly(error.message) };
  revalidatePath("/team");
  return { ok: true, message: "Role updated." };
}

export async function changeStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const user = String(form.get("user") ?? "");
  const status = String(form.get("status") ?? "");
  if (!isUuid(user) || (status !== "active" && status !== "suspended")) return { ok: false, message: "Invalid request." };
  const { supabase, org } = await requireOrg();
  const { error } = await supabase.rpc("set_member_status", { p_org: org.id, p_user: user, p_status: status });
  if (error) return { ok: false, message: friendly(error.message) };
  revalidatePath("/team");
  return { ok: true, message: status === "suspended" ? "Member suspended." : "Member reactivated." };
}

export async function removeMember(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const user = String(form.get("user") ?? "");
  if (!isUuid(user)) return { ok: false, message: "Invalid request." };
  const { supabase, org, user: me } = await requireOrg();
  const { error } = await supabase.rpc("remove_member", { p_org: org.id, p_user: user });
  if (error) return { ok: false, message: friendly(error.message) };
  if (user === me.id) redirect("/dashboard");
  revalidatePath("/team");
  return { ok: true, message: "Member removed." };
}

export async function changePassword(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 10) return { ok: false, message: "Use at least 10 characters." };
  if (password !== confirm) return { ok: false, message: "The two passwords don't match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: "Couldn't change your password. You may need to sign in again first." };
  await supabase.rpc("record_security_event", { p_action: "auth.password_changed", p_metadata: {} });
  return { ok: true, message: "Password changed." };
}

export async function signOutOthers(_prev: ActionResult): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { ok: false, message: "Couldn't sign out your other sessions." };
  await supabase.rpc("record_security_event", { p_action: "auth.signed_out_others", p_metadata: {} });
  return { ok: true, message: "Your other sessions are signed out." };
}

export async function recordMfaEvent(kind: "enrolled" | "removed"): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("record_security_event", { p_action: kind === "enrolled" ? "auth.mfa_enrolled" : "auth.mfa_removed", p_metadata: {} });
}

const EXPERIENCE = ["new", "some", "developer"] as const;
const clean = (v: FormDataEntryValue | null) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();

/** Your name and coding experience (experience only changes how much in-app guidance is shown). */
export async function updateProfile(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireOrg();
  const name = clean(form.get("displayName"));
  const exp = clean(form.get("experience"));
  if (!name || name.length > 80) return { ok: false, message: "Use a name of 1–80 characters." };
  if (exp && !EXPERIENCE.includes(exp as (typeof EXPERIENCE)[number])) return { ok: false, message: "Choose one of the experience options." };
  const { error } = await supabase.from("profiles").update({ display_name: name, experience: exp || null, updated_at: new Date().toISOString() }).eq("id", user.id);
  if (error) return { ok: false, message: "Couldn't save your profile. Try again." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

/** Renames the current organization (owners and admins). */
export async function renameOrganization(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, org, can } = await requireOrg();
  if (!can("org.manage")) return { ok: false, message: "Only owners and admins can rename the organization." };
  const name = clean(form.get("orgName"));
  if (!name || name.length > 80) return { ok: false, message: "Use a name of 1–80 characters." };
  if (name === org.name) return { ok: true, message: "That's already its name." };
  const { error } = await supabase.rpc("rename_organization", { p_org: org.id, p_name: name });
  if (error) return { ok: false, message: friendly(error.message) };
  revalidatePath("/", "layout");
  return { ok: true, message: `Renamed to “${name}”.` };
}

/**
 * Saves the welcome flow's answers (each optional) and marks onboarding done,
 * so it's offered once and never forced. Skipping saves nothing but the date.
 */
export async function completeOnboarding(input: { displayName?: string; experience?: string; orgName?: string }): Promise<{ ok: boolean; message?: string }> {
  const { supabase, user, org, can } = await requireOrg();
  const name = clean(input.displayName ?? null);
  const exp = clean(input.experience ?? null);
  const orgName = clean(input.orgName ?? null);
  const patch: Record<string, string | null> = { onboarded_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (name && name.length <= 80) patch.display_name = name;
  if (EXPERIENCE.includes(exp as (typeof EXPERIENCE)[number])) patch.experience = exp;
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { ok: false, message: "Couldn't save your answers. You can set them later in Settings." };
  if (orgName && orgName.length <= 80 && orgName !== org.name && can("org.manage")) {
    const r = await supabase.rpc("rename_organization", { p_org: org.id, p_name: orgName });
    if (r.error) return { ok: false, message: "Saved, but the workspace couldn't be renamed. Try again in Settings." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** "Not now" on the dashboard's setup card: records that onboarding was offered, saves nothing else. */
export async function dismissOnboarding(): Promise<void> {
  const { supabase, user } = await requireOrg();
  await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/dashboard");
}

/** Ask platform staff to review a policy decision. */
export async function appealPolicy(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = String(form.get("eventId") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Invalid request." };
  const { supabase } = await requireOrg();
  const { error } = await supabase.rpc("appeal_policy_event", { p_event: id, p_note: clean(form.get("note")) });
  if (error) return { ok: false, message: friendly(error.message) };
  revalidatePath("/settings/policy");
  return { ok: true, message: "Review requested. You'll see the decision here." };
}
