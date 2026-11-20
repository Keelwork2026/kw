import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canOpen, isStaffRole, type StaffRole } from "./staff";

/** Staff-only pages: a 404 for everyone else (the back office isn't advertised). */
export async function requireStaff(section: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data } = await supabase.rpc("staff_role");
  const role: StaffRole | null = isStaffRole(data) ? data : null;
  if (!role || !canOpen(role, section)) notFound();
  return { supabase, user, role };
}
