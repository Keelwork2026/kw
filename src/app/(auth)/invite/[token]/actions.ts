"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setCurrentOrg } from "@/lib/org";
import type { ActionResult } from "@/components/action-form";

export async function acceptInvitation(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const token = String(form.get("token") ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) redirect("/invite/invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) {
    if (/different email/.test(error.message)) {
      return { ok: false, message: "This invitation was sent to a different email address. Log in with that address to accept it." };
    }
    redirect("/invite/invalid");
  }
  await setCurrentOrg(String(data));
  redirect("/dashboard");
}
