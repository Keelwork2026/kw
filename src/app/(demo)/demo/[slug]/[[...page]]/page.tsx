import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SITES, siteBySlug } from "@/lib/sites";
import { pageBySlug, plain } from "@/lib/sites/text";
import { SiteDocument } from "@/components/sites/render";
import { PreviewBar } from "@/components/sites/preview-bar";
import { siteUseHref } from "@/components/sites/site-card";
import { APP_TEMPLATES, appBySlug, appUseHref } from "@/lib/apps";
import { AppPreview } from "@/components/apps/render";

/** Public, sign-in-free live demos of every website template. */
type Params = { params: Promise<{ slug: string; page?: string[] }> };

export function generateStaticParams() {
  return [
    ...SITES.flatMap((s) => s.pages.map((p) => ({ slug: s.slug, page: p.slug ? p.slug.split("/") : [] }))),
    ...APP_TEMPLATES.flatMap((a) => [{ slug: a.slug, page: [] }, ...a.screens.map((s) => ({ slug: a.slug, page: [s.slug] }))]),
  ];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, page } = await params;
  const app = appBySlug(slug);
  if (app) return { title: { absolute: `${app.name} — interactive template preview` }, description: app.tagline, robots: { index: false, follow: true } };
  const site = siteBySlug(slug);
  const p = site && pageBySlug(site, page?.join("/") ?? "");
  if (!site || !p) return {};
  const title = plain(p.seo?.title ?? (p.slug ? `${p.title} · ${site.name}` : `${site.name} — ${p.title}`));
  const description = plain(p.seo?.description ?? p.description);
  return {
    title: { absolute: title },
    description,
    keywords: p.seo?.keywords,
    openGraph: { title: p.seo?.ogTitle ?? title, description: p.seo?.ogDescription ?? description, type: "website" },
    alternates: { canonical: `/demo/${site.slug}${p.slug ? `/${p.slug}` : ""}` },
    robots: { index: false, follow: true },
  };
}

export default async function DemoPage({ params }: Params) {
  const { slug, page } = await params;
  const app = appBySlug(slug);
  if (app) {
    const screen = page?.[0];
    if (page && page.length > 1) notFound();
    if (screen && !app.screens.some((s) => s.slug === screen)) notFound();
    return (
      <>
        <AppPreview app={app} initialScreen={screen} />
        <PreviewBar name={`${app.name} (sample data)`} useHref={appUseHref(app, false)} detailHref={`/starters?t=${app.slug}#gallery`} />
      </>
    );
  }
  const site = siteBySlug(slug);
  const p = site && pageBySlug(site, page?.join("/") ?? "");
  if (!site || !p) notFound();
  return (
    <>
      <SiteDocument site={site} page={p} base={`/demo/${site.slug}`} />
      <PreviewBar name={site.name} useHref={siteUseHref(site)} detailHref={`/starters/${site.slug}`} />
    </>
  );
}
