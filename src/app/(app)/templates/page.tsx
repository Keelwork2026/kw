import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { importWebsite } from "./actions";
import { STARTERS, starterHref } from "@/lib/site/starters";
import { StarterCard } from "@/components/site/blocks";
import { SITES, siteBySlug } from "@/lib/sites";
import { SiteCard } from "@/components/sites/site-card";

export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const { supabase, org, can } = await requireOrg();
  const [{ data: items }, { data: projects }] = await Promise.all([
    supabase.from("marketplace_items").select("id, title, description, category").eq("status", "approved").order("reviewed_at", { ascending: false }).limit(12),
    supabase.from("projects").select("id, name").eq("org_id", org.id).neq("status", "archived").order("updated_at", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader title="Templates" description="Start from a designed starter, a reviewed marketplace template, or the structure of a site you own." actions={<Link href="/marketplace" className="btn btn-secondary">Browse the marketplace</Link>} />
      <section aria-labelledby="starters" className="mb-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="starters" className="text-xl">Website templates</h2>
            <p className="text-sm text-muted">{SITES.length} complete multi-page websites. Use one with the AI builder, or write your own from your business details.</p>
          </div>
          {can("project.write") ? <Link href="/sites/new" className="btn btn-primary">Write a website from my details</Link> : null}
        </div>
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {SITES.map((s) => <li key={s.slug}><SiteCard site={s} /></li>)}
        </ul>
        <h3 className="mt-10 text-lg">App starters</h3>
        <p className="mb-4 text-sm text-muted">Starting points for web apps. “Use this template” opens Create Project with the name and a detailed brief filled in — edit anything before planning.</p>
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {STARTERS.filter((s) => !siteBySlug(s.slug)).map((s) => <li key={s.slug}><StarterCard s={s} href={starterHref(s, true)} /></li>)}
        </ul>
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
