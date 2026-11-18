"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/org";
import { createCreditCheckout, createPlanCheckout, createPortalSession, parseCreditPacks, stripeConfigured } from "./stripe";
import type { ActionResult } from "@/components/action-form";

function site() { return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""); }

export async function buyCredits(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, org, can } = await requireOrg();
  if (!can("billing.manage")) return { ok: false, message: "Only owners and billing managers can buy credits." };
  if (!stripeConfigured()) return { ok: false, message: "Online payments aren't available on this installation." };
  const pack = parseCreditPacks(process.env.CREDIT_PACKS).find((p) => p.id === form.get("pack"));
  if (!pack) return { ok: false, message: "Choose a credit pack." };
  const { data: b } = await supabase.from("org_billing").select("stripe_customer_id").eq("org_id", org.id).maybeSingle();
  let url: string;
  try { url = (await createCreditCheckout({ org: org.id, pack, customer: b?.stripe_customer_id, successUrl: `${site()}/billing?paid=1`, cancelUrl: `${site()}/billing` })).url; }
  catch (e) { return { ok: false, message: `Stripe: ${(e as Error).message}` }; }
  redirect(url);
}

export async function changePlan(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, org, can } = await requireOrg();
  if (!can("billing.manage")) return { ok: false, message: "Only owners and billing managers can change the plan." };
  if (!stripeConfigured()) return { ok: false, message: "Online payments aren't available on this installation." };
  const key = String(form.get("plan") ?? "");
  const { data: plan } = await supabase.from("billing_plans").select("key, stripe_price_env, monthly_credits_micros").eq("key", key).maybeSingle();
  const priceId = plan?.stripe_price_env ? process.env[plan.stripe_price_env] : undefined;
  if (!plan || !priceId) return { ok: false, message: "That plan isn't available for online purchase." };
  const { data: b } = await supabase.from("org_billing").select("stripe_customer_id").eq("org_id", org.id).maybeSingle();
  let url: string;
  try { url = (await createPlanCheckout({ org: org.id, plan: plan.key, priceId, monthlyCreditsMicros: plan.monthly_credits_micros, customer: b?.stripe_customer_id, successUrl: `${site()}/billing?subscribed=1`, cancelUrl: `${site()}/billing` })).url; }
  catch (e) { return { ok: false, message: `Stripe: ${(e as Error).message}` }; }
  redirect(url);
}

export async function openPortal(_prev: ActionResult): Promise<ActionResult> {
  const { supabase, org, can } = await requireOrg();
  if (!can("billing.manage")) return { ok: false, message: "Only owners and billing managers can manage the subscription." };
  const { data: b } = await supabase.from("org_billing").select("stripe_customer_id").eq("org_id", org.id).maybeSingle();
  if (!b?.stripe_customer_id || !stripeConfigured()) return { ok: false, message: "There's no Stripe customer for this organization yet." };
  let url: string;
  try { url = (await createPortalSession(b.stripe_customer_id, `${site()}/billing`)).url; }
  catch (e) { return { ok: false, message: `Stripe: ${(e as Error).message}` }; }
  redirect(url);
}

export async function setSpendLimit(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, org, can } = await requireOrg();
  if (!can("billing.manage")) return { ok: false, message: "Only owners and billing managers can set the limit." };
  const raw = String(form.get("limit") ?? "").trim();
  const dollars = raw === "" ? null : Number(raw);
  if (dollars !== null && (!Number.isFinite(dollars) || dollars < 0 || dollars > 1_000_000)) return { ok: false, message: "Enter an amount in dollars, or leave it empty for no limit." };
  const { error } = await supabase.rpc("set_spend_limit", { p_org: org.id, p_limit_micros: dollars === null ? null : Math.round(dollars * 1_000_000) });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/billing");
  return { ok: true, message: dollars === null ? "No monthly limit." : `Monthly limit set to $${dollars.toFixed(2)}.` };
}
