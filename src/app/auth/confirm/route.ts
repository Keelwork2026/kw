import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/auth/redirect";

const TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "email_change"];

/** Email verification and password recovery links. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(url.searchParams.get("next"));
  if (!tokenHash || !type || !TYPES.includes(type)) {
    return NextResponse.redirect(new URL("/sign-in?error=link", url.origin));
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return NextResponse.redirect(new URL("/sign-in?error=link", url.origin));
  return NextResponse.redirect(new URL(type === "recovery" ? "/settings/security?reset=1" : next, url.origin));
}
