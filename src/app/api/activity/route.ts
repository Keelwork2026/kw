import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/org";
import { buildActivity, type ActivityRaw } from "@/lib/activity";

export const dynamic = "force-dynamic";

/** The notification centre's feed for the current organization (last 14 days; RLS scopes every read). */
export async function GET() {
  const auth = await createClient();
  const { data } = await auth.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "sign in" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { supabase, org } = await requireOrg();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [projects, approvals, plans, incidents, runs, qa, deploys] = await Promise.all([
    supabase.from("projects").select("id, name").eq("org_id", org.id).limit(200),
    supabase.from("approvals").select("id, project_id, summary, requested_at").eq("org_id", org.id).eq("status", "pending").order("requested_at", { ascending: false }).limit(10),
    supabase.from("plans").select("id, project_id, created_at").eq("org_id", org.id).eq("status", "draft").gte("created_at", since).order("created_at", { ascending: false }).limit(10),
    supabase.from("incidents").select("id, project_id, title, status, last_seen").eq("org_id", org.id).in("status", ["open", "fix_proposed"]).order("last_seen", { ascending: false }).limit(10),
    supabase.from("agent_runs").select("id, project_id, status, finished_at, error").eq("org_id", org.id).in("status", ["succeeded", "failed"]).gte("finished_at", since).order("finished_at", { ascending: false }).limit(10),
    supabase.from("qa_runs").select("id, project_id, mode, finished_at, readiness").eq("org_id", org.id).eq("status", "completed").gte("finished_at", since).order("finished_at", { ascending: false }).limit(10),
    supabase.from("deployments").select("id, project_id, environment, status, url, created_at, live_at, error").eq("org_id", org.id).in("status", ["live", "done", "failed"]).gte("created_at", since).order("created_at", { ascending: false }).limit(10),
  ]);
  const raw = { projects: projects.data ?? [], approvals: approvals.data ?? [], plans: plans.data ?? [], incidents: incidents.data ?? [], runs: runs.data ?? [], qa: qa.data ?? [], deploys: deploys.data ?? [] } as unknown as ActivityRaw;
  return NextResponse.json({ items: buildActivity(raw) }, { headers: { "Cache-Control": "no-store" } });
}
