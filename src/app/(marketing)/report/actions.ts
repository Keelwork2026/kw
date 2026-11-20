"use server";
import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { limitOrMessage } from "@/lib/security/server-limit";
import { REPORT_CATEGORIES } from "@/lib/admin/staff";
import type { ActionResult } from "@/components/action-form";

/** Anyone can report a site or app built with Keelwork. Stored for staff; never shown publicly. */
export async function submitReport(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const str = (k: string) => String(form.get(k) ?? "").trim();
  const category = str("category");
  const url = str("url");
  const details = str("details");
  const contact = str("contact");
  if (str("website")) return { ok: true, message: "Thank you — our team will look at it." }; // honeypot for bots
  if (!REPORT_CATEGORIES.some((c) => c.id === category)) return { ok: false, message: "Choose what the problem is." };
  if (url && !/^https?:\/\/[^\s]{3,}$/i.test(url)) return { ok: false, message: "Enter the full address, starting with https://" };
  if (details.length < 10) return { ok: false, message: "Tell us a little more (at least 10 characters)." };
  if (details.length > 2000) return { ok: false, message: "Keep it under 2000 characters." };
  if (contact && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact)) return { ok: false, message: "That email address doesn't look right." };

  const h = await headers();
  const ip = (h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
  const limited = await limitOrMessage("report", ip);
  if (limited) return { ok: false, message: limited };

  const { data: { user } } = await (await createClient()).auth.getUser();
  const { error } = await createServiceClient().from("abuse_reports").insert({
    category, url: url || null, details, contact_email: contact || null, reporter_id: user?.id ?? null,
  });
  if (error) return { ok: false, message: "We couldn't save your report. Please try again, or email the address on our Trust page." };
  return { ok: true, message: "Thank you — our trust and safety team will look at it. If you left an email, we may contact you." };
}
