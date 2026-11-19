import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { SiteDocument } from "@/components/sites/render";
import { pageBySlug } from "@/lib/sites/text";
import type { Site } from "@/lib/sites/types";

/** The saved draft, rendered exactly as it will publish. Framed by the editor. */
export const metadata = { robots: { index: false } };

export default async function DraftPreview({ params }: { params: Promise<{ id: string; page?: string[] }> }) {
  const { id, page } = await params;
  const { supabase } = await requireOrg();
  const { data } = await supabase.from("site_drafts").select("site").eq("id", id).maybeSingle();
  if (!data) notFound();
  const site = data.site as Site;
  const p = pageBySlug(site, page?.join("/") ?? "");
  if (!p) notFound();
  return <SiteDocument site={site} page={p} base={`/sites/${id}/preview`} />;
}
