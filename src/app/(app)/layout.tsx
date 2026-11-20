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
  const [{ count: incidentsOpen }, { data: orgState }, { data: announcements }] = await Promise.all([
    supabase.from("incidents").select("id", { count: "exact", head: true }).eq("org_id", org.id).in("status", ["open", "fix_proposed"]),
    supabase.from("organizations").select("suspended_at, suspended_reason").eq("id", org.id).maybeSingle(),
    // Active announcements only (RLS hides ended ones from customers; staff see history in the back office).
    supabase.from("platform_announcements").select("id, message, level, ends_at, starts_at").lte("starts_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(3),
  ]);
  const now = Date.now();
  const showing = (announcements ?? []).filter((a) => !a.ends_at || new Date(a.ends_at).getTime() > now);
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
      <main id="main" className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8">
        {showing.map((a) => (
          <p key={a.id} role="status" className={`mb-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${a.level === "info" ? "border-border bg-surface-2" : "border-[#f0d99a] bg-[#fff6d6] text-[#5c4100]"}`}>
            <span className="pill shrink-0 bg-text text-bg">{a.level === "maintenance" ? "Maintenance" : a.level === "warning" ? "Heads up" : "Keelwork"}</span>{a.message}
          </p>
        ))}
        {orgState?.suspended_at ? (
          <div role="alert" className="mb-4 rounded-2xl border border-[#f3c1b8] bg-[#fde8e4] px-4 py-3 text-sm text-[#7a1d12]">
            <p className="font-semibold">{org.name} is suspended.</p>
            <p className="mt-0.5">{orgState.suspended_reason} You can still read your projects, export them and manage billing; builds, automations, deployments and changes are paused. If you think this is a mistake, contact us through the <a className="font-semibold underline" href="/trust">Trust page</a>.</p>
          </div>
        ) : null}
        <PageHints />{children}
      </main>
    </div>
  );
}
