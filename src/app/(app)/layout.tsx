import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { Sidebar } from "@/components/sidebar";
import { SECTIONS } from "@/lib/nav";
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
        <details className="relative">
          <summary className="btn btn-secondary min-h-11 cursor-pointer list-none">Menu</summary>
          <nav aria-label="Main" className="absolute right-0 z-40 mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-xl">
            {SECTIONS.map((s) => (
              <Link key={s.slug} href={`/${s.slug}`} className="flex min-h-12 items-center rounded-xl px-3 text-sm font-medium hover:bg-surface-2">{s.label}</Link>
            ))}
          </nav>
        </details>
      </header>
      <main id="main" className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8">{children}</main>
    </div>
  );
}
