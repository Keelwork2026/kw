import Link from "next/link";
import { loadProject } from "@/lib/project";
import { CONNECTOR_CATEGORIES } from "@/lib/integrations/catalog";
import { connectorViews, recentConnections } from "@/lib/integrations/hub";
import { ConnectorHub } from "@/components/connectors/hub";

export const metadata = { title: "Connectors" };

export default async function IntegrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, project, can } = await loadProject(id);
  const [{ data: secrets }, { data: workflows }] = await Promise.all([
    supabase.from("project_secrets").select("project_id, name, updated_at").eq("project_id", project.id),
    supabase.from("workflows").select("project_id, definition").eq("project_id", project.id),
  ]);
  const views = connectorViews([project], secrets ?? [], workflows ?? []);
  const recent = recentConnections(views).map((r) => ({ id: r.integration.id, name: r.integration.name, project: r.project, projectId: r.projectId, since: r.since }));
  return (
    <>
      <p className="mb-4 text-sm text-muted">Connectors use your own accounts. One is connected when this project holds every key it needs, kept encrypted on the <Link className="font-semibold text-accent" href={`/projects/${project.id}/secrets`}>Secrets tab</Link>. <Link className="font-semibold text-accent" href="/integrations">See all projects →</Link></p>
      <ConnectorHub views={views} categories={CONNECTOR_CATEGORIES} projects={[{ id: project.id, name: project.name }]} recent={recent} canManage={can("secret.manage")} />
    </>
  );
}
