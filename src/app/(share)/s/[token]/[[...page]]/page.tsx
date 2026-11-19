import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { SiteDocument } from "@/components/sites/render";
import { pageBySlug, plain } from "@/lib/sites/text";
import type { Site } from "@/lib/sites/types";

/** A website draft its owner chose to share. Read-only, no sign-in, not indexed. */
type Params = { params: Promise<{ token: string; page?: string[] }> };

async function load(token: string): Promise<Site | null> {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const { data } = await createServiceClient().rpc("shared_site", { p_token: token });
  return (data as Site | null) ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token, page } = await params;
  const site = await load(token);
  const p = site && pageBySlug(site, page?.join("/") ?? "");
  if (!site || !p) return { robots: { index: false } };
  return { title: { absolute: plain(p.seo?.title ?? `${p.title} · ${site.name}`) }, description: plain(p.seo?.description ?? p.description), robots: { index: false, follow: false } };
}

export default async function SharedSite({ params }: Params) {
  const { token, page } = await params;
  const site = await load(token);
  const p = site && pageBySlug(site, page?.join("/") ?? "");
  if (!site || !p) notFound();
  return <SiteDocument site={site} page={p} base={`/s/${token}`} />;
}
