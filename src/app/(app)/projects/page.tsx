import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState, StatusPill, timeAgo } from "@/components/page-header";
import { ProjectActions } from "@/components/project-actions";
import { renameProject, archiveProject, restoreProject } from "./[id]/actions";
import { ActionForm } from "@/components/action-form";

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
            <li key={p.id} className="relative">
              <Link href={`/projects/${p.id}`} className="panel block h-full p-5 pb-12 hover:border-accent">
                <div className="flex items-start justify-between gap-2"><p className="font-display text-lg font-bold">{p.name}</p><StatusPill status={p.status} /></div>
                {p.description ? <p className="mt-2 line-clamp-2 text-sm text-muted">{p.description}</p> : null}
                <p className="mt-4 font-mono text-xs text-muted">{p.backend} · {p.deploy_target} · {timeAgo(p.updated_at)}</p>
              </Link>
              {!showArchived ? <div className="absolute bottom-2 right-2"><ProjectActions project={p} canWrite={can("project.write")} canManage={can("project.manage")} rename={renameProject} archive={archiveProject} /></div>
                : can("project.manage") ? (
                  <ActionForm action={restoreProject} submitLabel="Restore" pendingLabel="Restoring…" submitClassName="btn btn-secondary min-h-9 px-3 text-sm" className="absolute bottom-0 right-3 [&>div]:mt-0 [&>div]:justify-end [&>div]:pb-2">
                    <input type="hidden" name="projectId" value={p.id} />
                  </ActionForm>
                ) : null}
            </li>
          ))}
        </ul>
      ) : (
        showArchived ? (
          <EmptyState icon="archive" title="No archived projects" action={{ label: "Back to active projects", href: "/projects" }}>Archived projects are read-only and kept here with their code, history and deployments. They don&apos;t count toward your plan&apos;s project limit.</EmptyState>
        ) : (
          <EmptyState icon="folder" title="No projects yet" action={can("project.write") ? { label: "Create your first project", href: "/new-project" } : undefined} secondary={can("project.write") ? { label: "Explore templates", href: "/templates#starters" } : undefined}>
            {can("project.write") ? "Your projects will appear here. Start with an idea — one sentence is enough — and the planner works it through with you before anything is built." : "Projects in this workspace will appear here. Ask an owner or admin for the member role to create one."}
          </EmptyState>
        )
      )}
    </>
  );
}
