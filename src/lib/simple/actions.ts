"use server";
import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { limitOrMessage } from "@/lib/security/server-limit";

/** "Did this page make sense?" from the Simple Mode guide. Rate limited; stored for staff only. */
export async function sendSimpleFeedback(input: { page: string; helpful: boolean; note?: string }): Promise<{ ok: boolean; message: string }> {
  const page = String(input.page ?? "").slice(0, 80);
  const note = String(input.note ?? "").trim().slice(0, 500);
  if (!/^[\w:/.-]{1,80}$/.test(page)) return { ok: false, message: "This information doesn't look right yet." };
  const h = await headers();
  const ip = (h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
  const limited = await limitOrMessage("feedback", ip);
  if (limited) return { ok: false, message: "Thanks — that's plenty for now. Please try again later." };
  let userId: string | null = null;
  try { userId = (await (await createClient()).auth.getUser()).data.user?.id ?? null; } catch { userId = null; }
  const { error } = await createServiceClient().from("simple_feedback").insert({ page_key: page, helpful: Boolean(input.helpful), note: note || null, user_id: userId });
  if (error) return { ok: false, message: "We couldn't save that just now. Your work is safe." };
  return { ok: true, message: "Thank you! This helps us make Keelwork easier." };
}
