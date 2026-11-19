"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath, onboardingParams } from "@/lib/auth/redirect";
import { enabledProviders, type OAuthProvider } from "@/lib/auth/providers";
import { limitOrMessage } from "@/lib/security/server-limit";
import type { ActionResult } from "@/components/action-form";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
}

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

export async function signIn(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const email = str(form, "email").trim().toLowerCase();
  const password = str(form, "password");
  if (!email || !password) return { ok: false, message: "Enter your email and password." };

  const limited = await limitOrMessage("signIn", `${email}|${await clientIp()}`);
  if (limited) return { ok: false, message: limited };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "That email and password don't match an account." };
  await supabase.rpc("record_security_event", { p_action: "auth.signed_in", p_metadata: { method: "password" } });
  redirect(safeRedirectPath(str(form, "next")));
}

export async function signUp(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const email = str(form, "email").trim().toLowerCase();
  const password = str(form, "password");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Enter a valid email address." };
  if (password.length < 10) return { ok: false, message: "Use at least 10 characters for your password." };

  const limited = await limitOrMessage("signIn", `${email}|${await clientIp()}`);
  if (limited) return { ok: false, message: limited };

  const carry = onboardingParams({ prompt: str(form, "prompt"), template: str(form, "template"), name: str(form, "name") });
  const next = new URLSearchParams({ ...(carry.prompt ? { prompt: carry.prompt } : {}), ...(carry.template ? { template: carry.template } : {}), ...(carry.name ? { name: carry.name } : {}) });
  const nextPath = `/new-project${next.size ? `?${next}` : ""}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent(nextPath)}` },
  });
  if (error) return { ok: false, message: "We couldn't create that account. Try a different email, or sign in." };
  if (data.session) redirect(nextPath);
  return { ok: true, message: "Check your inbox to confirm your email, then you'll land in your first project." };
}

export async function forgotPassword(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const email = str(form, "email").trim().toLowerCase();
  if (!email) return { ok: false, message: "Enter your email address." };
  const limited = await limitOrMessage("signIn", `reset|${email}|${await clientIp()}`);
  if (limited) return { ok: false, message: limited };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent("/settings/security")}`,
  });
  // Same message either way, so the form can't be used to discover accounts.
  return { ok: true, message: "If that address has an account, a reset link is on its way." };
}

export async function oauthSignIn(form: FormData): Promise<void> {
  const provider = str(form, "provider");
  if (!enabledProviders(process.env.AUTH_PROVIDERS).some((p) => p === provider)) redirect("/sign-in?error=provider");
  const chosen = provider as OAuthProvider;
  const next = safeRedirectPath(str(form, "next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: chosen,
    options: { redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`, scopes: chosen === "azure" ? "email" : undefined },
  });
  if (error || !data.url) redirect("/sign-in?error=oauth");
  redirect(data.url);
}

export async function verifyMfa(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const code = str(form, "code").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return { ok: false, message: "Enter the 6-digit code from your authenticator app." };
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");
  if (!factor) return { ok: false, message: "No authenticator is set up for this account." };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { ok: false, message: "That code didn't work. Codes change every 30 seconds — try the current one." };
  await supabase.rpc("record_security_event", { p_action: "auth.mfa_verified", p_metadata: {} });
  redirect(safeRedirectPath(str(form, "next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
