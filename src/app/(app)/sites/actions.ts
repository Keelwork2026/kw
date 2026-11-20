"use server";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { generateSite } from "@/lib/sites/engine/generate";
import { validateSite } from "@/lib/sites/validate";
import { SITE_CATEGORIES } from "@/lib/sites";
import { VOICES } from "@/lib/sites/engine/copy";
import type { BusinessProfile, Category, Lang, Section, Site, Voice } from "@/lib/sites/types";
import type { ActionResult } from "@/components/action-form";
import { gatewayFor, serverCatalog } from "@/lib/ai/server";

const LANGS: Lang[] = ["en", "fr", "es", "de", "pt"];
const field = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

/** Step 1: the business profile → a complete generated website draft. */
export async function createSiteDraft(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, org, can, user } = await requireOrg();
  if (!can("project.write")) return { ok: false, message: "You don't have permission to create websites in this workspace." };
  const industry = field(form, "industry", 60) as Category;
  const voice = field(form, "voice", 30) as Voice;
  const lang = field(form, "lang", 2) as Lang;
  const profile: BusinessProfile = {
    name: field(form, "name", 80),
    industry: SITE_CATEGORIES.includes(industry) ? industry : "Corporate & Business",
    description: field(form, "description", 400),
    services: field(form, "services", 600).split(/\n|,/).map((s) => s.trim()).filter(Boolean).slice(0, 8),
    audience: field(form, "audience", 160),
    location: field(form, "location", 80),
    purpose: field(form, "purpose", 300),
    goal: field(form, "goal", 80),
    voice: VOICES.includes(voice) ? voice : "professional",
    size: (["solo", "small", "mid", "large"] as const).find((x) => x === form.get("size")),
    lang: LANGS.includes(lang) ? lang : "en",
  };
  if (!profile.name) return { ok: false, message: "Add your business name." };
  if (profile.description.length < 10) return { ok: false, message: "Describe your business in a sentence or two." };
  if (!profile.services.length) return { ok: false, message: "List at least one product or service." };
  const site = generateSite(profile);
  const { data, error } = await supabase.from("site_drafts").insert({ org_id: org.id, name: profile.name, site, created_by: user.id }).select("id").single();
  if (error || !data) return { ok: false, message: "Couldn't save the new website. Try again." };
  redirect(`/sites/${data.id}`);
}

/** Autosave. Returns the new version so the editor can show "Saved". */
export async function saveSiteDraft(id: string, site: unknown): Promise<{ ok: true; version: number } | { ok: false; message: string }> {
  const { supabase, can } = await requireOrg();
  if (!can("project.write")) return { ok: false, message: "You have read-only access to this website." };
  const v = validateSite(site);
  if (!v.ok) return { ok: false, message: v.error };
  const { data, error } = await supabase.from("site_drafts").update({ site: v.site, name: v.site.name }).eq("id", id).select("version").single();
  if (error || !data) return { ok: false, message: "Couldn't save. Your changes are kept here — we'll retry." };
  return { ok: true, version: data.version as number };
}

export async function shareSiteDraft(id: string, on: boolean): Promise<{ ok: true; token: string | null } | { ok: false; message: string }> {
  const { supabase, can } = await requireOrg();
  if (!can("project.write")) return { ok: false, message: "You don't have permission to share this website." };
  const { data, error } = await supabase.rpc("site_draft_share", { p_draft: id, p_on: on });
  if (error) return { ok: false, message: "Couldn't change sharing. Try again." };
  return { ok: true, token: (data as string | null) ?? null };
}

export async function deleteSiteDraft(id: string): Promise<void> {
  const { supabase, can } = await requireOrg();
  if (!can("project.write")) return;
  await supabase.from("site_drafts").delete().eq("id", id);
  redirect("/sites");
}

export type AiEdit = "tone" | "language" | "audience" | "rewrite" | "headlines";

/**
 * AI rewrites of one section's text through the metered AI gateway. Returns
 * an honest error when AI isn't configured on this installation.
 */
export async function aiRewriteSection(input: { section: Section; site: Pick<Site, "name" | "profile">; op: AiEdit; value?: string }): Promise<{ ok: true; section: Section } | { ok: false; message: string }> {
  const { org, can, user } = await requireOrg();
  if (!can("project.write")) return { ok: false, message: "You don't have permission to edit this website." };
  if (!serverCatalog().catalog) return { ok: false, message: "AI rewriting isn't set up on this Keelwork installation yet. The quick edits and Regenerate still work." };
  const ask = {
    tone: `Rewrite in a ${input.value ?? "professional"} tone.`,
    language: `Translate into ${input.value ?? "English"}, natural and idiomatic.`,
    audience: `Rewrite for this audience: ${input.value ?? "general public"}.`,
    rewrite: "Rewrite to be clearer and more specific, keeping the meaning.",
    headlines: "Write a stronger, more specific headline (title field) and keep the rest.",
  }[input.op];
  const rules = "Return ONLY the JSON section with the same shape and keys; change only human-readable text values. Never invent facts: no statistics, years in business, awards, certifications, customer counts, reviews, prices or medical/financial/legal claims. Keep every fact, claim, number, testimonial and opinion already in the section: they are the owner's own content, so rephrase them if asked but don't remove, soften or fact-check them. Keep any [[placeholder]] tokens exactly as they are. Do not change href, art, icon, t, v or id values.";
  try {
    const g = gatewayFor({ orgId: org.id, userId: user.id });
    const res = await g.complete({ route: "chat", json: true, maxOutputTokens: 2000, temperature: 0.6, messages: [
      { role: "system", content: `You are a careful website copywriter for ${input.site.name}. ${rules}` },
      { role: "user", content: `${ask}\nBusiness: ${JSON.stringify(input.site.profile ?? {})}\nSection:\n${JSON.stringify(input.section)}` },
    ] });
    const parsed = JSON.parse(res.text) as Section;
    if (!parsed || parsed.t !== input.section.t) return { ok: false, message: "The AI returned something unexpected. Nothing was changed." };
    const check = validateSite({ name: "x", pages: [{ slug: "", sections: [parsed] }], palette: { a: "#000000" }, fonts: { display: "sans", body: "sans" }, radius: "soft" });
    if (!check.ok) return { ok: false, message: check.error };
    return { ok: true, section: parsed };
  } catch (e) {
    return { ok: false, message: (e as Error).message || "AI is unavailable right now." };
  }
}
