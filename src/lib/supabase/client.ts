"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Browser client for auth flows (MFA enrolment). RLS applies. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}
