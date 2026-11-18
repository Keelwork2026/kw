import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState, StatusPill, timeAgo } from "@/components/page-header";

export const metadata = { title: "My Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const { supabase, org, can } = await requireOrg();
  const showArchived = (await searchParams).archived === "1";
  let q = supabase.from("projects").select("id, name, description, status, backend, deploy_target, updated_at").eq("org_id", org.id).order("updated_at", { ascending: false });
  q = showArchived ? q.eq("status", "archived") : q.neq("status", "archived");
  const { data } = await q;
  return (
    <>
      <PageHeader
        title="My Projects"
        description={`Every app in ${org.name}.`}
        actions={<div className="flex gap-2"><Link href={showArchived ? "/projects" : "/projects?archived=1"} className="btn btn-secondary">{showArchived ? "Active projects" : "Archived"}</Link>{can("project.write") ? <Link href="/new-project" className="btn btn-gradient">New project</Link> : null}</div>}
      />
      {data?.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="panel block h-full p-5 hover:border-accent">
                <div className="flex items-start justify-between gap-2"><p className="font-display text-lg font-bold">{p.name}</p><StatusPill status={p.status} /></div>
                {p.description ? <p className="mt-2 line-clamp-2 text-sm text-muted">{p.description}</p> : null}
                <p className="mt-4 font-mono text-xs text-muted">{p.backend} · {p.deploy_target} · {timeAgo(p.updated_at)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={showArchived ? "No archived projects" : "No projects yet"}>{can("project.write") ? <Link className="font-semibold text-accent" href="/new-project">Create your first project</Link> : "Ask an owner or admin for write access to create projects."}</EmptyState>
      )}
    </>
  );
}
