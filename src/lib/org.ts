import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/nav";

export type OrgSummary = { id: string; name: string; slug: string; personal: boolean; role: string };

export type OrgContext = {
  supabase: SupabaseClient;
  user: User;
  org: OrgSummary;
  orgs: OrgSummary[];
  permissions: Set<string>;
  can: (permission: string) => boolean;
};

const COOKIE = "kw_org";

export async function setCurrentOrg(orgId: string) {
  if (!isUuid(orgId)) return;
  const store = await cookies();
  store.set(COOKIE, orgId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

/**
 * Loads the signed-in user's active organization. Membership is read
 * through RLS, so a suspended or removed member simply has no rows.
 */
export async function requireOrg(): Promise<OrgContext> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/sign-in");

  const { data: rows } = await supabase
    .from("org_members")
    .select("role, status, organizations(id, name, slug, personal)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const orgs: OrgSummary[] = (rows ?? []).flatMap((r) => {
    const o = r.organizations as unknown as { id: string; name: string; slug: string; personal: boolean } | null;
    return o ? [{ ...o, role: r.role as string }] : [];
  });
  if (orgs.length === 0) redirect("/no-organization");

  const store = await cookies();
  const chosen = store.get(COOKIE)?.value;
  const org = orgs.find((o) => o.id === chosen) ?? orgs[0]!;

  const { data: perms } = await supabase.from("role_permissions").select("permission").eq("role", org.role);
  const permissions = new Set((perms ?? []).map((p) => p.permission as string));
  return { supabase, user, org, orgs, permissions, can: (p) => permissions.has(p) };
}
