import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Logo } from "@/components/logo";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main id="main">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-muted">
          <Logo />
          {/* Privacy policy and terms are not linked until they exist. */}
          <nav aria-label="Footer" className="flex flex-wrap gap-4">
            <Link href="/pricing" className="hover:text-text">Pricing</Link>
            <Link href="/#templates" className="hover:text-text">Templates</Link>
            <Link href="/sign-in" className="hover:text-text">Log in</Link>
          </nav>
          <p>Your code, always.</p>
        </div>
      </footer>
    </>
  );
}
