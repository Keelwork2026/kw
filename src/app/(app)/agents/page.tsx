import { requireOrg } from "@/lib/org";
import { PageHeader, Notice } from "@/components/page-header";
import { AGENTS } from "@/lib/agents/graph";
import { serverCatalog } from "@/lib/ai/server";
import { routeFor } from "@/lib/ai/catalog";

export const metadata = { title: "AI Agents" };

export default async function AgentsPage() {
  await requireOrg();
  const { catalog, error } = serverCatalog();
  return (
    <>
      <PageHeader title="AI Agents" description="Eight specialists build every project. They review each other, and a person approves anything risky." />
      {!catalog ? <div className="mb-6"><Notice>{error ? `The AI catalogue is invalid: ${error}` : "AI isn't configured on this installation (AI_MODEL_CATALOG is empty), so agents can't run yet."}</Notice></div> : null}
      <ul className="grid gap-4 md:grid-cols-2">
        {AGENTS.map((a) => {
          const models = catalog ? routeFor(catalog, a.route) : [];
          return (
            <li key={a.id} className="card">
              <p className="font-display text-xl font-bold">{a.name}</p>
              <p className="mt-1 text-muted">{a.role}</p>
              <p className="mt-3 text-sm">Route <code className="font-mono">{a.route}</code>{models.length ? <> → {models.map((m, i) => <span key={m.id}>{i ? " then " : ""}<code className="font-mono">{m.model}</code></span>)}</> : " (no model configured)"}</p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
