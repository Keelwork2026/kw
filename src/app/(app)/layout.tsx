import { requireOrg } from "@/lib/org";
import { Sidebar } from "@/components/sidebar";
import { MobileMenu } from "@/components/mobile-menu";
import { PageHints } from "@/components/page-hints";
import { Logo } from "@/components/logo";
import { Notifications } from "@/components/notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, org, orgs } = await requireOrg();
  const [{ data: isAdmin }, { data: projects }, approvalsWaiting, plansWaiting] = await Promise.all([
    supabase.rpc("is_platform_admin"),
    supabase.from("projects").select("id, name").eq("org_id", org.id).neq("status", "archived").order("updated_at", { ascending: false }).limit(50),
    supabase.from("approvals").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "pending"),
    supabase.from("plans").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "draft").gte("created_at", new Date(Date.now() - 14 * 86_400_000).toISOString()),
  ]);
  const { count: incidentsOpen } = await supabase.from("incidents").select("id", { count: "exact", head: true }).eq("org_id", org.id).in("status", ["open", "fix_proposed"]);
  // The bell's badge counts only things waiting on you (the same three sources the panel lists first).
  const waiting = (approvalsWaiting.count ?? 0) + (plansWaiting.count ?? 0) + (incidentsOpen ?? 0);
  // Staff see how much is waiting for them next to "Platform admin".
  const { data: staffQueue } = isAdmin
    ? await supabase.from("marketplace_items").select("id", { count: "exact", head: true }).eq("status", "pending_review").then((r) => ({ data: r.count ?? 0 }))
    : { data: 0 };
  const list = (projects ?? []) as { id: string; name: string }[];
  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <a href="#main" className="btn btn-primary sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50">Skip to content</a>
      <div className="hidden md:flex"><Sidebar orgs={orgs} current={org} email={user.email ?? ""} isAdmin={Boolean(isAdmin)} projects={list} staffQueue={staffQueue} waiting={waiting} /></div>
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-2 md:hidden">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-1"><Notifications waiting={waiting} placement="top" /><MobileMenu isAdmin={Boolean(isAdmin)} projects={list} staffQueue={staffQueue} /></div>
      </header>
      <main id="main" className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8"><PageHints />{children}</main>
    </div>
  );
}
