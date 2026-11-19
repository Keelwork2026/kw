import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/site/site-footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
