import { loadProject } from "@/lib/project";
import { brokerConfig, createBrokerClient, sandboxIdFor } from "@/lib/sandbox/client";
import { lsFilesArgs } from "@/lib/code/git";
import { parseEntries } from "@/lib/code/tree";
import { analyzeSource, candidateFiles, type RouteReport } from "@/lib/backend/routes";
import { Notice, EmptyState } from "@/components/page-header";

export const metadata = { title: "Backend" };

export default async function BackendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, project } = await loadProject(id);
  const cfg = brokerConfig();
  const { data: sandbox } = await supabase.from("sandboxes").select("status").eq("project_id", project.id).maybeSingle();
  if (!cfg || sandbox?.status !== "running") return <Notice>Routes are read from the project&apos;s sandbox, which {cfg ? "isn't running" : "isn't connected to this installation"}.</Notice>;
  const broker = createBrokerClient(cfg);
  const sb = sandboxIdFor(project.id);
  const ls = await broker.exec(sb, lsFilesArgs()).catch(() => null);
  const files = candidateFiles(parseEntries(ls?.stdout ?? "")).slice(0, 200);
  const reports = (await Promise.all(files.map(async (f) => analyzeSource(f, await broker.readFile(sb, f).catch(() => ""))))).filter((r): r is RouteReport => r !== null);
  const routes = reports.filter((r) => r.kind === "route");
  const actions = reports.filter((r) => r.kind === "action");
  return (
    <div className="grid gap-6">
      <p className="text-sm text-muted">Found by reading the source. Checks are heuristics: a ✓ means the pattern was found, not that the code is correct.</p>
      {[["API routes", routes], ["Server actions and client code", actions]].map(([title, list]) => (
        <section key={title as string} className="panel overflow-x-auto" aria-labelledby={title === "API routes" ? "routes" : "actions"}>
          <h2 id={title === "API routes" ? "routes" : "actions"} className="px-5 pt-4 text-lg">{title as string}</h2>
          {(list as RouteReport[]).length ? (
            <table className="mt-2 w-full min-w-[720px] text-left text-sm">
              <thead className="text-muted"><tr><th className="px-5 py-2">Route / file</th><th className="px-5 py-2">Methods</th><th className="px-5 py-2">Caller checked</th><th className="px-5 py-2">Input validated</th><th className="px-5 py-2">Issues</th></tr></thead>
              <tbody>{(list as RouteReport[]).map((r) => (
                <tr key={r.file} className="border-t border-border align-top">
                  <td className="px-5 py-3"><p className="font-mono text-xs font-semibold">{r.path ?? r.file}</p>{r.path ? <p className="font-mono text-[11px] text-muted">{r.file}</p> : null}</td>
                  <td className="px-5 py-3 font-mono text-xs">{r.methods.join(", ") || (r.kind === "action" ? "action" : "—")}</td>
                  <td className="px-5 py-3">{r.checksCaller ? "✓" : "✗"}</td><td className="px-5 py-3">{r.validatesInput ? "✓" : "✗"}</td>
                  <td className="px-5 py-3 text-xs">{r.issues.length ? <ul className="grid gap-1 text-danger">{r.issues.map((i) => <li key={i}>{i}</li>)}</ul> : <span className="text-success">None found</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <div className="p-5"><EmptyState title="Nothing found" /></div>}
        </section>
      ))}
    </div>
  );
}
