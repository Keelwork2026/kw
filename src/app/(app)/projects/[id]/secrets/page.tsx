import { loadProject } from "@/lib/project";
import { vaultReady } from "@/lib/secrets/server";
import { ENVIRONMENTS } from "@/lib/secrets/vault";
import { ActionForm } from "@/components/action-form";
import { EmptyState, Notice, timeAgo } from "@/components/page-header";
import { setSecret, deleteSecret } from "./actions";
import { INTEGRATIONS } from "@/lib/integrations/catalog";

export const metadata = { title: "Secrets" };

export default async function SecretsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ name?: string; connect?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const prefill = sp.name && /^[A-Z][A-Z0-9_]{1,63}$/.test(sp.name) ? sp.name : "";
  const connecting = INTEGRATIONS.find((i) => i.id === sp.connect);
  const { supabase, project, can } = await loadProject(id);
  const { data } = await supabase.from("project_secrets").select("name, environment, updated_at, key_version").eq("project_id", project.id).order("name");
  const manage = can("secret.manage");
  const ready = vaultReady();
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="panel overflow-x-auto" aria-labelledby="secret-list">
        <h2 id="secret-list" className="px-5 pt-4 text-lg">Secrets</h2>
        <p className="px-5 text-sm text-muted">Encrypted with a fresh key per value. Values are never shown again — not to you, not to agents, not to Keelwork staff.</p>
        {data?.length ? (
          <table className="mt-3 w-full min-w-[520px] text-left text-sm">
            <thead className="text-muted"><tr><th className="px-5 py-2">Name</th><th className="px-5 py-2">Environment</th><th className="px-5 py-2">Updated</th><th className="px-5 py-2"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={`${s.name}:${s.environment}`} className="border-t border-border">
                  <td className="px-5 py-3 font-mono text-xs">{s.name}</td><td className="px-5 py-3">{s.environment}</td><td className="px-5 py-3 text-muted">{timeAgo(s.updated_at)}</td>
                  <td className="px-5 py-3">{manage ? (
                    <ActionForm action={deleteSecret} submitLabel="Delete" submitClassName="btn btn-danger min-h-9 px-3 text-xs" confirm={`Delete ${s.name} (${s.environment})? Apps using it will stop working.`}>
                      <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="name" value={s.name} /><input type="hidden" name="environment" value={s.environment} />
                    </ActionForm>) : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="p-5"><EmptyState icon="key" title="No secrets yet" action={{ label: "Add a secret", href: "#set-secret" }}>API keys and tokens your app needs, encrypted at rest and never shown again. Agents ask for them when they need one.</EmptyState></div>}
      </section>
      <section className="card" aria-labelledby="set-secret">
        <h2 id="set-secret" className="text-lg">{connecting ? `Connect ${connecting.name}` : "Set or replace a secret"}</h2>
        {connecting ? (
          <div className="mt-2 rounded-xl bg-surface-2 p-3 text-sm">
            <p>{connecting.name} needs {connecting.secrets.length === 1 ? "this key" : `these ${connecting.secrets.length} keys`}. Add each one:</p>
            <ul className="mt-1 grid gap-1">{connecting.secrets.map((k) => {
              const have = (data ?? []).some((x) => x.name === k.name);
              return <li key={k.name}>{have ? "✓ " : ""}<a className="font-mono text-xs font-semibold text-accent" href={`?connect=${connecting.id}&name=${k.name}#set-secret`}>{k.name}</a> <span className="text-xs text-muted">— {k.hint}</span></li>;
            })}</ul>
            <p className="mt-2 text-xs text-muted">Where to get it: {connecting.setup} {connecting.access}</p>
          </div>
        ) : null}
        {!ready ? <div className="mt-3"><Notice>Secrets can&apos;t be added: this installation has no SECRETS_MASTER_KEYS.</Notice></div> : !manage ? <p className="mt-2 text-sm text-muted">Only owners and admins can change secrets.</p> : (
          <ActionForm action={setSecret} submitLabel="Save secret" className="mt-3 grid gap-3">
            <input type="hidden" name="projectId" value={project.id} />
            <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" required pattern="[A-Za-z][A-Za-z0-9_]{1,63}" placeholder="STRIPE_SECRET_KEY" defaultValue={prefill} key={prefill} className="input font-mono" autoComplete="off" /></div>
            <div><label className="label" htmlFor="environment">Environment</label><select id="environment" name="environment" className="input">{ENVIRONMENTS.map((e) => <option key={e}>{e}</option>)}</select></div>
            <div><label className="label" htmlFor="value">Value</label><input id="value" name="value" type="password" required autoComplete="off" className="input font-mono" /></div>
            <p className="text-xs text-muted">Deploy credentials (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, VERCEL_TOKEN) are used only by the deploy service and never passed to your app.</p>
          </ActionForm>
        )}
      </section>
    </div>
  );
}
