import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { SimpleGuide } from "@/components/simple/guide";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main id="main"><div className="mx-auto max-w-5xl px-4"><SimpleGuide className="mt-6" /></div>{children}</main>
      <SiteFooter />
    </>
  );
}
