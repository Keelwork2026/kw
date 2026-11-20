import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { CONNECTOR_CATEGORIES } from "@/lib/integrations/catalog";
import { connectorViews, recentConnections } from "@/lib/integrations/hub";
import { ConnectorHub } from "@/components/connectors/hub";
import { SectionPicker } from "@/components/section-picker";

export const metadata = { title: "Connectors" };

/** Workspace-wide connector marketplace. Status comes from the keys each project actually holds. */
export default async function ConnectorsPage({ searchParams }: { searchParams: Promise<{ to?: string; at?: string; q?: string }> }) {
  // Menu links to a project tab (e.g. Secrets) come through here: choose the project first.
  const sp = await searchParams;
  if (sp.to) return <SectionPicker slug="integrations" searchParams={sp} />;
  const { supabase, org, can } = await requireOrg();
  const { data: projects } = await supabase.from("projects").select("id, name, backend, deploy_target").eq("org_id", org.id).neq("status", "archived").order("updated_at", { ascending: false });
  const ids = (projects ?? []).map((p) => p.id);
  const [{ data: secrets }, { data: workflows }] = ids.length ? await Promise.all([
    supabase.from("project_secrets").select("project_id, name, updated_at").in("project_id", ids),
    supabase.from("workflows").select("project_id, definition").in("project_id", ids),
  ]) : [{ data: [] }, { data: [] }];
  const views = connectorViews(projects ?? [], secrets ?? [], workflows ?? []);
  const recent = recentConnections(views).map((r) => ({ id: r.integration.id, name: r.integration.name, project: r.project, projectId: r.projectId, since: r.since }));
  const connected = views.filter((v) => v.state === "connected").length;
  return (
    <>
      <PageHeader title="Connectors" description={`Connect payments, email, messaging, AI and more with your own accounts. ${connected ? `${connected} connected across your projects.` : "Nothing connected yet."} Keys stay encrypted in each project.`} />
      <ConnectorHub views={views} categories={CONNECTOR_CATEGORIES} projects={(projects ?? []).map((p) => ({ id: p.id, name: p.name }))} recent={recent} canManage={can("secret.manage")} />
    </>
  );
}
