import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { sectionBySlug } from "@/lib/nav";
import { PageHeader, EmptyState, StatusPill } from "@/components/page-header";

/** Org-level section pages list the organization's projects and link to that project's tab. */
export async function SectionPicker({ slug, extra }: { slug: string; extra?: React.ReactNode }) {
  const section = sectionBySlug(slug)!;
  const { supabase, org } = await requireOrg();
  const { data } = await supabase.from("projects").select("id, name, status, backend, deploy_target").eq("org_id", org.id).neq("status", "archived").order("updated_at", { ascending: false });
  const tab = section.projectTab ?? "";
  return (
    <>
      <PageHeader title={section.label} description={`${section.description} Choose a project.`} />
      {extra}
      {data?.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}${tab ? `/${tab}` : ""}`} className="panel flex items-center justify-between gap-3 p-5 hover:border-accent">
                <span><span className="block font-semibold">{p.name}</span><span className="font-mono text-xs text-muted">{p.backend} · {p.deploy_target}</span></span>
                <StatusPill status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No projects yet"><Link className="font-semibold text-accent" href="/new-project">Create a project</Link> to use {section.label}.</EmptyState>}
    </>
  );
}
