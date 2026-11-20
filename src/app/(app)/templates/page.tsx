import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { importWebsite } from "./actions";
import { CATALOG } from "@/lib/catalog";
import { CatalogGallery } from "@/components/catalog/catalog-gallery";

export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const { supabase, org, can } = await requireOrg();
  const [{ data: items }, { data: projects }, { data: used }] = await Promise.all([
    supabase.from("marketplace_items").select("id, title, description, category").eq("status", "approved").order("reviewed_at", { ascending: false }).limit(12),
    supabase.from("projects").select("id, name").eq("org_id", org.id).neq("status", "archived").order("updated_at", { ascending: false }),
    supabase.from("projects").select("template_key").eq("org_id", org.id).not("template_key", "is", null).limit(1000),
  ]);
  // Real counts of projects in this workspace started from each template.
  const usage: Record<string, number> = {};
  for (const p of used ?? []) if (p.template_key) usage[p.template_key] = (usage[p.template_key] ?? 0) + 1;
  return (
    <>
      <PageHeader title="Templates" description="Start from a designed starter, a reviewed marketplace template, or the structure of a site you own." actions={<Link href="/marketplace" className="btn btn-secondary">Browse the marketplace</Link>} />
      <section aria-labelledby="starters" className="mb-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="starters" className="text-xl">Templates</h2>
            <p className="text-sm text-muted">{CATALOG.length} websites and apps. Search in your own words, preview without leaving the page, then build from one.</p>
          </div>
          {can("project.write") ? <Link href="/sites/new" className="btn btn-secondary">Write a website from my details</Link> : null}
        </div>
        <CatalogGallery signedIn usage={usage} />
      </section>
      <section aria-labelledby="reviewed">
        <h2 id="reviewed" className="mb-3 text-xl">From the marketplace</h2>
        {items?.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <li key={i.id}><Link href={`/marketplace/${i.id}`} className="panel block h-full p-5 hover:border-accent"><p className="font-semibold">{i.title}</p><p className="mt-1 line-clamp-3 text-sm text-muted">{i.description}</p><p className="mt-3 text-xs text-muted">{i.category}</p></Link></li>
            ))}
          </ul>
        ) : <EmptyState icon="layers" title="No reviewed templates yet" action={{ label: "Open the marketplace", href: "/marketplace" }}>Templates appear here once a reviewer approves them in the marketplace.</EmptyState>}
      </section>

      <section className="card mt-10 max-w-2xl" aria-labelledby="import">
        <h2 id="import" className="text-xl">Import a website</h2>
        <p className="mt-1 text-sm text-muted">Keelwork reads one page and extracts its structure — title, headings, navigation, sections, colours and fonts. It copies no images or scripts.</p>
        {can("project.write") && projects?.length ? (
          <ActionForm action={importWebsite} submitLabel="Import page" pendingLabel="Importing…" className="mt-4 grid gap-3">
            <div><label className="label" htmlFor="projectId">Into project</label>
              <select id="projectId" name="projectId" className="input">{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label" htmlFor="url">Page address</label><input id="url" name="url" type="url" required placeholder="https://your-site.com" className="input" /></div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm" value="yes" required className="mt-1" /><span>I own this site or am authorized to use its content. This confirmation is recorded in the audit log.</span></label>
          </ActionForm>
        ) : <p className="mt-3 text-sm text-muted">Create a project first (you need write access) to import into it.</p>}
      </section>
    </>
  );
}
