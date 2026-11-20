import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState, StatusPill } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { CATEGORIES } from "@/lib/marketplace/package";
import { publishProject } from "./actions";

export const metadata = { title: "Marketplace" };

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { supabase, org, can } = await requireOrg();
  const category = (await searchParams).category;
  let q = supabase.from("marketplace_items").select("id, title, description, category").eq("status", "approved").order("reviewed_at", { ascending: false }).limit(60);
  if (category && (CATEGORIES as readonly string[]).includes(category)) q = q.eq("category", category);
  const [{ data: items }, { data: mine }, { data: projects }] = await Promise.all([
    q,
    supabase.from("marketplace_items").select("id, title, status, review_note, blocking_findings, created_at").eq("publisher_org", org.id).order("created_at", { ascending: false }),
    supabase.from("projects").select("id, name").eq("org_id", org.id).neq("status", "archived"),
  ]);
  return (
    <>
      <PageHeader title="Marketplace" description="Free templates published by Keelwork users. Every one is scanned and reviewed by a person before it's listed." />
      <nav aria-label="Categories" className="mb-4 flex flex-wrap gap-1.5 text-sm">
        <Link href="/marketplace" className={`pill min-h-9 px-3 ${!category ? "bg-brand text-brand-contrast" : "border border-border"}`}>All</Link>
        {CATEGORIES.map((c) => <Link key={c} href={`/marketplace?category=${c}`} aria-current={category === c ? "page" : undefined} className={`pill min-h-9 px-3 ${category === c ? "bg-brand text-brand-contrast" : "border border-border"}`}>{c}</Link>)}
      </nav>
      {items?.length ? (
        <ul id="browse" aria-label="Published templates" className="grid scroll-mt-6 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => <li key={i.id}><Link href={`/marketplace/${i.id}`} className="panel block h-full p-5 hover:border-accent"><p className="font-semibold">{i.title}</p><p className="mt-1 line-clamp-3 text-sm text-muted">{i.description}</p><p className="mt-3 text-xs text-muted">{i.category}</p></Link></li>)}
        </ul>
      ) : <EmptyState icon="layers" title="No templates here yet" action={{ label: "Browse starter templates", href: "/templates#starters" }}>Reviewed community templates appear here. Starter templates are always available.</EmptyState>}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {can("project.manage") && projects?.length ? (
          <section className="card" aria-labelledby="publish">
            <h2 id="publish" className="text-xl">Publish a project</h2>
            <p className="mt-1 text-sm text-muted">Env files are never included. Every file is scanned for credentials and the database is reviewed.</p>
            <ActionForm action={publishProject} submitLabel="Submit for review" pendingLabel="Packaging…" className="mt-4 grid gap-3">
              <div><label className="label" htmlFor="pp">Project</label><select id="pp" name="projectId" className="input">{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="label" htmlFor="pt">Title</label><input id="pt" name="title" required minLength={3} maxLength={80} className="input" /></div>
              <div><label className="label" htmlFor="pd">Description</label><textarea id="pd" name="description" required minLength={10} maxLength={2000} rows={3} className="input" /></div>
              <div><label className="label" htmlFor="pc">Category</label><select id="pc" name="category" className="input">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="rights" value="yes" required className="mt-1" />I hold the rights to everything in this template (code, text, images and fonts).</label>
            </ActionForm>
          </section>
        ) : null}
        <section className="panel p-5" aria-labelledby="mine">
          <h2 id="mine" className="text-xl">My submissions</h2>
          {mine?.length ? <ul className="mt-3 grid gap-2 text-sm">{mine.map((m) => <li key={m.id} className="flex flex-wrap items-center gap-2"><StatusPill status={m.status === "pending_review" ? "pending" : m.status} /><span>{m.title}</span>{m.blocking_findings ? <span className="text-danger">{m.blocking_findings} blocking</span> : null}{m.review_note ? <span className="text-muted">— {m.review_note}</span> : null}</li>)}</ul> : <p className="mt-2 text-sm text-muted">Nothing submitted yet.</p>}
        </section>
      </div>
    </>
  );
}
