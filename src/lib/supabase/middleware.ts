import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/** Refreshes the Supabase session cookie on every request. */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { user: null, aal: null as string | null };
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  let aal: string | null = null;
  if (data.user) {
    const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    // Needs MFA when a verified factor exists but the session is still AAL1.
    if (level && level.nextLevel === "aal2" && level.currentLevel !== "aal2") aal = "needs-mfa";
  }
  return { user: data.user, aal };
}
