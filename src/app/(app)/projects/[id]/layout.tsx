import Link from "next/link";
import { loadProject } from "@/lib/project";
import { StatusPill } from "@/components/page-header";
import { ProjectTabs } from "@/components/project-tabs";
import { JourneySteps } from "@/components/project-journey";
import { loadJourneyState } from "@/lib/journey-state";
import { stages } from "@/lib/journey";

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
        </div>
        {journey ? <JourneySteps stages={stages(journey)} /> : null}
        <ProjectTabs projectId={project.id} />
      </div>
      {children}
    </>
  );
}
