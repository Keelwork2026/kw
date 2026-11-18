import Link from "next/link";
import { loadProject } from "@/lib/project";
import { INTEGRATIONS, connectionStatus } from "@/lib/integrations/catalog";

export const metadata = { title: "Integrations" };

export default async function IntegrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, project } = await loadProject(id);
  const { data } = await supabase.from("project_secrets").select("name").eq("project_id", project.id);
  const connected: Set<string> = new Set((data ?? []).map((s) => s.name as string));
  return (
    <>
      <p className="mb-4 text-sm text-muted">Integrations use your own accounts. One is connected when this project holds the secrets it needs — add them on the <Link className="font-semibold text-accent" href={`/projects/${project.id}/secrets`}>Secrets tab</Link>.</p>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((i) => {
          const s = connectionStatus(i, connected);
          return (
            <li key={i.id} className="panel p-5">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-semibold">{i.name}</p><p className="text-xs text-muted">{i.category}</p></div>
                <span className={`pill ${s.connected ? "bg-[#e6fbf1] text-[#0b7a4b]" : "bg-surface-2"}`}>{s.connected ? "Connected" : "Not connected"}</span>
              </div>
              <p className="mt-2 text-sm">{i.description}</p>
              <p className="mt-1 text-xs text-muted">Used by: {i.usedBy}</p>
              <ul className="mt-3 grid gap-1 text-xs">
                {i.secrets.map((sec) => <li key={sec.name}><code className={connected.has(sec.name) ? "text-success" : ""}>{sec.name}</code> <span className="text-muted">— {sec.hint}</span></li>)}
              </ul>
              <a href={i.docs} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-accent">Docs →</a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
