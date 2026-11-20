import { loadProject } from "@/lib/project";
import { vaultReady } from "@/lib/secrets/server";
import { ENVIRONMENTS } from "@/lib/secrets/vault";
import { ActionForm } from "@/components/action-form";
import { EmptyState, Notice, timeAgo } from "@/components/page-header";
import { setSecret, deleteSecret } from "./actions";
import { INTEGRATIONS } from "@/lib/integrations/catalog";
import { Check, Confetti } from "@/components/motion";
import { Simple, OnlySimple } from "@/components/simple/simple";
import { Explain } from "@/components/simple/guide";

export const metadata = { title: "Secrets" };

export default async function SecretsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ name?: string; connect?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const connecting = INTEGRATIONS.find((i) => i.id === sp.connect && i.secrets.length > 0);
  const { supabase, project, can } = await loadProject(id);
  const { data } = await supabase.from("project_secrets").select("name, environment, updated_at, key_version").eq("project_id", project.id).order("name");
  const manage = can("secret.manage");
  // Connecting: start with the named key, or the first one this project doesn't have yet.
  const prefill = sp.name && /^[A-Z][A-Z0-9_]{1,63}$/.test(sp.name) ? sp.name : connecting?.secrets.find((k) => !(data ?? []).some((x) => x.name === k.name))?.name ?? "";
  const ready = vaultReady();
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="panel overflow-x-auto" aria-labelledby="secret-list">
        <h2 id="secret-list" className="px-5 pt-4 text-lg"><Simple simple="Your private keys">Secrets</Simple></h2>
        <p className="px-5 text-sm text-muted"><Simple simple="Keys are like house keys for your other apps. We lock each one away. After you save it, nobody can read it again — not you, not the AI helpers, not our team.">Encrypted with a fresh key per value. Values are never shown again — not to you, not to agents, not to Keelwork staff.</Simple></p>
        {data?.length ? (
          <table className="mt-3 w-full min-w-[520px] text-left text-sm">
            <thead className="text-muted"><tr><th className="px-5 py-2"><Simple simple="Key name">Name</Simple></th><th className="px-5 py-2"><Simple simple="Used for">Environment</Simple></th><th className="px-5 py-2"><Simple simple="Last changed">Updated</Simple></th><th className="px-5 py-2"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={`${s.name}:${s.environment}`} data-guide="secret-row" className="border-t border-border">
                  <td className="px-5 py-3 font-mono text-xs">{s.name}</td><td className="px-5 py-3">{s.environment}</td><td className="px-5 py-3 text-muted">{timeAgo(s.updated_at)}</td>
                  <td className="px-5 py-3">{manage ? (
                    <ActionForm action={deleteSecret} submitLabel="Delete" submitClassName="btn btn-danger min-h-9 px-3 text-xs" confirm={`Delete ${s.name} (${s.environment})? Apps using it will stop working.`}>
                      <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="name" value={s.name} /><input type="hidden" name="environment" value={s.environment} />
                    </ActionForm>) : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="p-5"><EmptyState icon="key" title="No secrets yet" action={{ label: "Add a secret", href: "#set-secret" }}><Simple simple="No keys yet. When your app needs to use another service, like payments, you paste its key here. The AI helpers tell you when one is needed.">API keys and tokens your app needs, encrypted at rest and never shown again. Agents ask for them when they need one.</Simple></EmptyState></div>}
      </section>
      <section className="card" aria-labelledby="set-secret">
        <h2 id="set-secret" className="text-lg">{connecting ? <Simple simple={`Link ${connecting.name}`}>{`Connect ${connecting.name}`}</Simple> : <Simple simple="Add a private key">Set or replace a secret</Simple>}</h2>
        <OnlySimple className="mt-2 rounded-xl border border-border p-3 text-sm"><strong>How to add a key:</strong> 1) Copy the key from the other app&apos;s website. 2) Type its name exactly as shown. 3) Paste the key and press the button. That&apos;s it.</OnlySimple>
        {connecting && connecting.secrets.every((k) => (data ?? []).some((x) => x.name === k.name)) ? (
          <div role="status" className="mt-2 flex items-center gap-2 rounded-xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] p-3 text-sm font-semibold text-success">
            <Confetti id={`connector-${project.id}-${connecting.id}`} pieces={20} /><Check /><Simple simple={`All done! ${connecting.name} is linked to this project.`}>{`${connecting.name} is connected to this project.`}</Simple>
          </div>
        ) : null}
        {connecting ? (
          <div className="mt-2 rounded-xl bg-surface-2 p-3 text-sm">
            <p><Simple simple={<>{connecting.name} needs {connecting.secrets.length === 1 ? "one key" : `${connecting.secrets.length} keys`}. Tap a name to fill it in, then paste the key:</>}>{connecting.name} needs {connecting.secrets.length === 1 ? "this key" : `these ${connecting.secrets.length} keys`}. Add each one:</Simple></p>
            <ul className="mt-1 grid gap-1">{connecting.secrets.map((k) => {
              const have = (data ?? []).some((x) => x.name === k.name);
              return <li key={k.name}>{have ? "✓ " : ""}<a className="font-mono text-xs font-semibold text-accent" href={`?connect=${connecting.id}&name=${k.name}#set-secret`}>{k.name}</a> <span className="text-xs text-muted">— {k.hint}</span></li>;
            })}</ul>
            <p className="mt-2 text-xs text-muted"><Simple simple={<>Where to find it: {connecting.setup}</>}>Where to get it: {connecting.setup} {connecting.access}</Simple></p>
          </div>
        ) : null}
        {!ready ? <div className="mt-3"><Notice><Simple simple="Keys can&apos;t be saved on this computer yet. The person who set up Keelwork needs to finish its setup.">Secrets can&apos;t be added: this installation has no SECRETS_MASTER_KEYS.</Simple></Notice></div> : !manage ? <p className="mt-2 text-sm text-muted"><Simple simple="Only the owner or an admin can add keys. Ask them to do it.">Only owners and admins can change secrets.</Simple></p> : (
          <ActionForm action={setSecret} submitLabel="Save secret" className="mt-3 grid gap-3">
            <input type="hidden" name="projectId" value={project.id} />
            <div><label className="label" htmlFor="name"><Simple simple="Key name (type it exactly as shown)">Name</Simple></label><input id="name" name="name" required pattern="[A-Za-z][A-Za-z0-9_]{1,63}" placeholder="STRIPE_SECRET_KEY" defaultValue={prefill} key={prefill} className="input font-mono" autoComplete="off" /></div>
            <div><label className="label" htmlFor="environment"><Simple simple={<>Where it&apos;s used <Explain term="environment" /></>}>Environment</Simple></label><select id="environment" name="environment" className="input">{ENVIRONMENTS.map((e) => <option key={e}>{e}</option>)}</select></div>
            <div><label className="label" htmlFor="value"><Simple simple="Paste the key here (it stays hidden)">Value</Simple></label><input id="value" name="value" type="password" required autoComplete="off" className="input font-mono" /></div>
            <p className="text-xs text-muted"><Simple simple="Keys for your hosting account are only used to put your app online. Your app itself never sees them.">Deploy credentials (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, VERCEL_TOKEN) are used only by the deploy service and never passed to your app.</Simple></p>
          </ActionForm>
        )}
      </section>
    </div>
  );
}
