import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState, timeAgo } from "@/components/page-header";
import { SiteThumb } from "@/components/sites/site-card";
import type { Site } from "@/lib/sites/types";

export const metadata = { title: "Websites" };

export default async function SitesPage() {
  const { supabase, org, can } = await requireOrg();
  const { data } = await supabase.from("site_drafts").select("id, name, site, version, share_token, updated_at").eq("org_id", org.id).order("updated_at", { ascending: false }).limit(60);
  const drafts = (data ?? []) as { id: string; name: string; site: Site; version: number; share_token: string | null; updated_at: string }[];
  return (
    <>
      <PageHeader title="Websites" description="Complete websites written from your business details. Edit every word, preview on any device, share a link or export the HTML." actions={can("project.write") ? <Link href="/sites/new" className="btn btn-gradient">Create a website</Link> : null} />
      {drafts.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {drafts.map((d) => (
            <li key={d.id}>
              <Link href={`/sites/${d.id}`} className="panel block overflow-hidden p-3 hover:border-accent">
                <SiteThumb site={d.site} className="rounded-xl border border-border" />
                <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-3">
                  <span className="font-semibold">{d.name}</span>
                  {d.share_token ? <span className="pill bg-surface-2 text-xs">Shared</span> : null}
                </div>
                <p className="px-2 text-xs text-muted">{d.site.category} · {d.site.pages.length} pages · version {d.version} · edited {timeAgo(d.updated_at)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No websites yet">
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Answer a few questions about your business and Keelwork writes a complete multi-page website — headlines, services, about, contact, SEO and legal pages — ready to edit.</p>
          {can("project.write") ? <Link href="/sites/new" className="btn btn-primary mt-5">Create a website</Link> : null}
        </EmptyState>
      )}
    </>
  );
}
