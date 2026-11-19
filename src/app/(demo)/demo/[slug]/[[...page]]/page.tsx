import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SITES, siteBySlug } from "@/lib/sites";
import { pageBySlug, plain } from "@/lib/sites/text";
import { SiteDocument } from "@/components/sites/render";
import { PreviewBar } from "@/components/sites/preview-bar";
import { siteUseHref } from "@/components/sites/site-card";

/** Public, sign-in-free live demos of every website template. */
type Params = { params: Promise<{ slug: string; page?: string[] }> };

export function generateStaticParams() {
  return SITES.flatMap((s) => s.pages.map((p) => ({ slug: s.slug, page: p.slug ? p.slug.split("/") : [] })));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, page } = await params;
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
