import { requireOrg } from "@/lib/org";
import { Sidebar } from "@/components/sidebar";
import { MobileMenu } from "@/components/mobile-menu";
import { PageHints } from "@/components/page-hints";
import { Logo } from "@/components/logo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, org, orgs } = await requireOrg();
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <a href="#main" className="btn btn-primary sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50">Skip to content</a>
      <div className="hidden md:flex"><Sidebar orgs={orgs} current={org} email={user.email ?? ""} isAdmin={Boolean(isAdmin)} /></div>
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-2 md:hidden">
        <Logo href="/dashboard" />
        <MobileMenu isAdmin={Boolean(isAdmin)} />
      </header>
      <main id="main" className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8"><PageHints />{children}</main>
    </div>
  );
}
