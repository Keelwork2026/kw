import { loadProject } from "@/lib/project";
import { brokerConfig, createBrokerClient, sandboxIdFor } from "@/lib/sandbox/client";
import { buildSchema } from "@/lib/db/schema";
import { explainMigration, migrationRisk, checksum } from "@/lib/db/apply";
import { BACKENDS, migrationsDirFor, isBackend } from "@/lib/stack/backends";
import { ActionForm } from "@/components/action-form";
import { Notice, StatusPill, EmptyState } from "@/components/page-header";
import { applyPendingMigration } from "./actions";

export const metadata = { title: "Database" };

export default async function DatabasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, project, can } = await loadProject(id);
  const backend = isBackend(project.backend) ? project.backend : "supabase";
  const dir = migrationsDirFor(backend);
  if (!dir) {
    const b = BACKENDS.find((x) => x.id === backend)!;
    return (
      <div className="card max-w-2xl">
        <h2 className="text-xl">{b.name} stores data in document collections</h2>
        <p className="mt-2 text-muted">There are no SQL migrations for this backend. The data model lives in code: {backend === "appwrite" ? "collections and their permissions are created by lib/appwrite-server.ts and described in AGENTS.md" : "collections and their security rules are in cloudbaserc.json"}. Open them in the Code tab.</p>
      </div>
    );
  }
  const cfg = brokerConfig();
  const { data: sandbox } = await supabase.from("sandboxes").select("status").eq("project_id", project.id).maybeSingle();
  if (!cfg || sandbox?.status !== "running") return <Notice>The schema is read from the project&apos;s migration files in its sandbox, which {cfg ? "isn't running" : "isn't connected to this installation"}.</Notice>;

  const broker = createBrokerClient(cfg);
  const sb = sandboxIdFor(project.id);
  const list = await broker.list(sb, dir).catch(() => ({ entries: [] }));
  const names = list.entries.filter((e) => e.type === "file" && e.name.endsWith(".sql")).map((e) => e.name).sort();
  const files = await Promise.all(names.map(async (name) => ({ name, sql: await broker.readFile(sb, `${dir}/${name}`).catch(() => "") })));
  const schema = buildSchema(files);
  const { data: ledger } = await supabase.from("project_migrations").select("filename, checksum, status, risk, applied_at, error, created_at").eq("project_id", project.id).order("created_at", { ascending: false });
  const applied = new Map((ledger ?? []).filter((l) => l.status === "applied").map((l) => [l.filename as string, l.checksum as string]));

  return (
    <div className="grid gap-6">
      <Notice>This schema is replayed from the migration files, not read from your live database.</Notice>
      <section aria-labelledby="tables">
        <h2 id="tables" className="mb-3 text-xl">Tables</h2>
        {schema.tables.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {schema.tables.map((t) => (
              <article key={t.name} className="panel p-5">
                <div className="flex items-center justify-between gap-2"><h3 className="font-mono text-base">{t.name}</h3>
                  {backend === "supabase" ? <span className={`pill ${t.rls ? "bg-[#e6fbf1] text-[#0b7a4b]" : "bg-[#fde8e4] text-[#a3281a]"}`}>RLS {t.rls ? "on" : "off"}</span> : null}</div>
                <table className="mt-3 w-full text-left text-xs">
                  <thead className="text-muted"><tr><th className="py-1">Column</th><th className="py-1">Type</th><th className="py-1">Notes</th></tr></thead>
                  <tbody>{t.columns.map((c) => (
                    <tr key={c.name} className="border-t border-border"><td className="py-1.5 font-mono">{c.name}</td><td className="py-1.5 font-mono">{c.type}</td>
                      <td className="py-1.5 text-muted">{[c.primaryKey && "primary key", !c.nullable && !c.primaryKey && "required", c.references && `→ ${c.references}`, c.default && `default ${c.default}`].filter(Boolean).join(" · ")}</td></tr>
                  ))}</tbody>
                </table>
                {t.policies.length ? <ul className="mt-3 grid gap-1 text-xs">{t.policies.map((p) => <li key={p.name}><strong>{p.name}</strong> <span className="text-muted">({p.command} to {p.roles}) {p.using ? `using ${p.using}` : ""}{p.check ? ` check ${p.check}` : ""}</span></li>)}</ul>
                  : backend === "supabase" ? <p className="mt-3 text-xs text-danger">No policies: {t.rls ? "nobody can read or write rows from the browser." : "row-level security is off."}</p> : null}
              </article>
            ))}
          </div>
        ) : <EmptyState title="No tables yet">The Database Engineer writes migrations into {dir}.</EmptyState>}
      </section>

      <section aria-labelledby="migrations">
        <h2 id="migrations" className="mb-3 text-xl">Migrations</h2>
        <ul className="grid gap-4">
          {files.map((f) => {
            const risk = migrationRisk(f.sql);
            const done = applied.get(f.name);
            const drift = done !== undefined && done !== checksum(f.sql);
            return (
              <li key={f.name} className="panel p-5">
                <div className="flex flex-wrap items-center gap-2"><code className="font-mono">{f.name}</code>
                  <StatusPill status={drift ? "failed" : done ? "applied" : "pending"} />
                  <span className={`pill ${risk === "additive" ? "bg-[#e6fbf1] text-[#0b7a4b]" : risk === "destructive" ? "bg-[#fff6d6] text-[#8a6100]" : "bg-[#fde8e4] text-[#a3281a]"}`}>{risk}</span>
                  {drift ? <span className="text-sm text-danger">Changed after it was applied (drift). Write a new migration instead.</span> : null}</div>
                <ol className="mt-3 grid gap-1.5 text-sm">
                  {explainMigration(f.sql).map((s, i) => (
                    <li key={i}><span>{s.explanation}</span>{s.risk !== "additive" ? <span className="ml-2 text-xs font-semibold text-danger">{s.risk}</span> : null}{s.unsupported ? <span className="ml-2 text-xs text-danger">Unsupported: {s.unsupported}</span> : null}</li>
                  ))}
                </ol>
                {!done && risk !== "denied" && can("project.manage") ? (
                  <ActionForm action={applyPendingMigration} submitLabel="Apply to database" pendingLabel="Applying…" className="mt-4 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="filename" value={f.name} />
                    <div><label className="label" htmlFor={`env-${f.name}`}>Database</label><select id={`env-${f.name}`} name="environment" className="input min-h-10 py-0"><option>production</option><option>preview</option><option>development</option></select></div>
                    {risk === "destructive" ? <div><label className="label" htmlFor={`c-${f.name}`}>Type {f.name} to confirm</label><input id={`c-${f.name}`} name="confirmation" required className="input min-h-10 font-mono" autoComplete="off" /></div> : null}
                  </ActionForm>
                ) : null}
              </li>
            );
          })}
        </ul>
        {ledger?.some((l) => l.status === "failed") ? (
          <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold">Failed attempts</summary>
            <ul className="mt-2 grid gap-1">{ledger.filter((l) => l.status === "failed").map((l, i) => <li key={i}><code>{l.filename}</code> — {l.error}</li>)}</ul></details>
        ) : null}
      </section>
    </div>
  );
}
