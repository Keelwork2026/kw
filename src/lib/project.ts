import "server-only";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/nav";

export type ProjectRow = {
  id: string; org_id: string; name: string; description: string | null; status: string;
  backend: string; deploy_target: string; template_key: string | null; created_at: string; updated_at: string;
};

/**
 * Every project page loads through here. Permissions come from the
 * project's organization (has_permission), so a read-only support grant
 * never sees edit controls. Archived projects are read-only.
 */
export async function loadProject(id: string): Promise<{
  supabase: SupabaseClient; project: ProjectRow; userId: string;
  can: (permission: string) => boolean; readOnly: boolean;
}> {
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) notFound();
  const { data: project } = await supabase.from("projects")
    .select("id, org_id, name, description, status, backend, deploy_target, template_key, created_at, updated_at")
    .eq("id", id).maybeSingle();
  if (!project) notFound();

  const perms = ["project.read", "project.write", "project.manage", "secret.manage", "usage.read"] as const;
  const results = await Promise.all(perms.map((p) => supabase.rpc("has_permission", { p_org: project.org_id, p_perm: p })));
  const granted = new Set<string>(perms.filter((_, i) => results[i]?.data === true));
  const archived = project.status === "archived";
  const can = (p: string) => granted.has(p) && (!archived || p === "project.read" || p === "usage.read");
  return { supabase, project: project as ProjectRow, userId: auth.user.id, can, readOnly: archived || !granted.has("project.write") };
}
