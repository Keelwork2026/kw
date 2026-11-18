import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Documentation" };

const SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
  { id: "start", title: "From idea to app", body: (
    <ol className="list-decimal space-y-1 pl-5">
      <li>Describe the app on <Link className="text-accent" href="/new-project">Create Project</Link>.</li>
      <li>Choose the backend and where it deploys (the Stack card). This is fixed once the first build starts.</li>
      <li>The Software Architect replies with a plan. Nothing is built until you press <strong>Approve and build</strong>.</li>
      <li>Eight specialist agents build it in an isolated sandbox. Risky steps — new packages, deleting files, production deploys, secrets — wait for your approval.</li>
      <li>Preview it live, change it by chatting or with Design mode, run tests and scans, then deploy to your own Cloudflare or Vercel account.</li>
    </ol>
  ) },
  { id: "agents", title: "The agents", body: <p>Architect, Database, Backend, Frontend, Integrations, QA, Security and Docs. Each works through tools a policy engine checks before anything runs; every tool call is logged with secret-looking values masked. See <Link className="text-accent" href="/agents">AI Agents</Link> for the models each uses.</p> },
  { id: "credits", title: "Credits", body: <p>AI calls and web searches are metered in millionths of a dollar at each model&apos;s price. Before every call Keelwork checks your balance and monthly limit, so spending stops before it goes over. Every charge is a ledger row on <Link className="text-accent" href="/billing">Billing</Link>.</p> },
  { id: "secrets", title: "Secrets", body: <p>Each value is encrypted with its own key and can&apos;t be read back — not by you, agents or Keelwork staff. Agents ask for secrets with a request you approve by typing the value; it&apos;s written to the sandbox&apos;s <code>.env.local</code> and scrubbed from everything the model and logs see. Exports and deployments are scanned and blocked if a credential appears in code.</p> },
  { id: "design", title: "Design mode", body: <p>Turn on Design mode in the preview, click an element, and describe the change. Keelwork knows the element&apos;s file and line and asks the planner for a scoped plan.</p> },
  { id: "data", title: "Database", body: <p>The Database tab shows the schema replayed from your migration files, explains each statement in plain language, and lets an owner apply pending migrations to your own database once, in a transaction. Destructive migrations need the file name typed to confirm.</p> },
  { id: "automations", title: "Automations", body: <p>Manual, signed-webhook or scheduled (at most every 5 minutes) workflows of HTTP, email, Slack, transform and delay steps. Saving makes a draft; an owner or admin switches it on. Webhooks are signed with <code>keelwork-signature: t=…,v1=HMAC-SHA256(secret, &quot;t.body&quot;)</code> and replays are refused.</p> },
  { id: "deploy", title: "Deploying", body: <p>Add your deploy credentials on the Secrets tab. A deployment is only called live after its health check passes (<code>/api/health</code>, then <code>/</code>). On Cloudflare the new version is checked on its preview address first; if the live check fails, traffic switches back automatically. You can roll back to any earlier version.</p> },
  { id: "support", title: "Support access", body: <p>Keelwork staff see only organization metadata. To look inside, they request access with a reason; an owner approves it for 1–72 hours on Settings → Support access, and can revoke it. The grant is read-only, secrets stay unreadable, and every step is in your audit log.</p> },
  { id: "own", title: "Your code is yours", body: <p>Export the full source as a ZIP from the builder at any time. The archive never contains env files or secrets; a README lists the variables your app needs by name.</p> },
];

export default async function DocsPage() {
  await requireOrg();
  return (
    <>
      <PageHeader title="Documentation" description="How Keelwork works, briefly." />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-6 grid gap-1 text-sm">{SECTIONS.map((s) => <li key={s.id}><a className="flex min-h-9 items-center rounded-lg px-2 hover:bg-surface-2" href={`#${s.id}`}>{s.title}</a></li>)}</ul>
        </nav>
        <div className="grid max-w-3xl gap-8">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`} className="text-2xl">{s.title}</h2>
              <div className="mt-2 leading-7 text-text">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
