import Link from "next/link";
import { loadProject } from "@/lib/project";
import { StatusPill } from "@/components/page-header";
import { ProjectTabs } from "@/components/project-tabs";
import { JourneySteps } from "@/components/project-journey";
import { loadJourneyState } from "@/lib/journey-state";
import { stages } from "@/lib/journey";
import { ActionForm } from "@/components/action-form";
import { archiveProject } from "./actions";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, project, readOnly, can } = await loadProject(id);
  const journey = project.status === "archived" ? null : await loadJourneyState(supabase, project, can("project.write"));
  return (
    <>
      <div className="mb-6">
        <Link href="/projects" className="text-sm font-semibold text-muted hover:text-text">← Projects</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">{project.name}</h1>
          <StatusPill status={project.status} />
          {readOnly ? <span className="pill bg-surface-2">Read-only</span> : null}
          {can("project.manage") ? (
            <details className="ml-auto text-sm">
              <summary className="cursor-pointer rounded-full px-3 py-2 font-semibold text-muted hover:text-text">Archive…</summary>
              <ActionForm action={archiveProject} submitLabel="Archive project" submitClassName="btn btn-secondary" className="panel mt-2 grid max-w-sm gap-2 p-4">
                <input type="hidden" name="projectId" value={project.id} />
                <p className="text-muted">Archiving makes the project read-only and frees a slot in your plan. Its code, history and deployments are kept.</p>
                <label className="label" htmlFor="confirmName">Type <strong>{project.name}</strong> to confirm</label>
                <input id="confirmName" name="confirmName" required className="input" autoComplete="off" />
              </ActionForm>
            </details>
          ) : null}
        </div>
        {journey ? <JourneySteps stages={stages(journey)} /> : null}
        <ProjectTabs projectId={project.id} />
      </div>
      {children}
    </>
  );
}
