import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { serverCatalog } from "@/lib/ai/server";
import { SiteEditor } from "@/components/sites/editor";
import type { Site } from "@/lib/sites/types";

export const metadata = { title: "Website editor" };

export default async function SiteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase, can } = await requireOrg();
  const { data } = await supabase.from("site_drafts").select("id, site, version, share_token").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted"><Link href="/sites" className="hover:text-text">Websites</Link> <span aria-hidden>/</span> {(data.site as Site).name}</nav>
      <SiteEditor id={data.id as string} initial={data.site as Site} version={data.version as number} shareToken={(data.share_token as string | null) ?? null} canEdit={can("project.write")} aiReady={serverCatalog().catalog !== null} />
    </>
  );
}
