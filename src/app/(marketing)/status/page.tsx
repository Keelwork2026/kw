import { createServiceClient } from "@/lib/supabase/server";
import { EXPECTED_MIGRATIONS } from "@/lib/security/readiness";
import { brokerConfig } from "@/lib/sandbox/client";
import { PageHero } from "@/components/site/blocks";

export const metadata = { title: "System status", description: "Live status of Keelwork's services on this installation." };
export const dynamic = "force-dynamic";

type State = "up" | "down" | "off";

async function database(): Promise<State> {
  try {
    const { data, error } = await createServiceClient().rpc("readiness");
    const applied = new Set(((data as { migrations?: string[] } | null)?.migrations ?? []));
    return !error && EXPECTED_MIGRATIONS.every((m) => applied.has(m)) ? "up" : "down";
  } catch { return "down"; }
}

async function sandboxes(): Promise<State> {
  const cfg = brokerConfig();
  if (!cfg) return "off";
  try {
    const r = await fetch(`${cfg.url}/health`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    const j = (await r.json()) as { ok?: boolean; docker?: boolean };
    return r.ok && j.ok && j.docker ? "up" : "down";
  } catch { return "down"; }
}

/** Live checks, run when the page is opened. Nothing here is a static claim. */
export default async function StatusPage() {
  const [db, sb] = await Promise.all([database(), sandboxes()]);
  const rows: { name: string; what: string; state: State }[] = [
    { name: "Web app", what: "Sign-in, dashboard and studios", state: "up" },
    { name: "Database and auth", what: "Accounts, projects and every migration applied", state: db },
    { name: "Sandboxes and previews", what: "Isolated builds and live previews", state: sb },
    { name: "AI planning and building", what: "Model catalogue configured for the agents", state: process.env.AI_MODEL_CATALOG ? "up" : "off" },
    { name: "Email", what: "Invitations and notifications", state: process.env.RESEND_API_KEY ? "up" : "off" },
    { name: "Payments", what: "Plans and credit packs", state: process.env.STRIPE_SECRET_KEY ? "up" : "off" },
  ];
  const allUp = rows.every((r) => r.state !== "down");
  const label: Record<State, string> = { up: "Operational", down: "Having problems", off: "Not set up on this installation" };
  const tone: Record<State, string> = { up: "tile-green", down: "tile-pink", off: "bg-surface-2 text-muted" };
  return (
    <>
      <PageHero eyebrow={`Checked ${new Date().toUTCString().replace(" GMT", " UTC")}`} title={allUp ? "Everything that's set up is" : "Some services are"} accent={allUp ? "running." : "having problems."} intro="These checks run live when you open this page. Services that need the operator's own accounts show as not set up until they're configured." />
      <section className="mx-auto max-w-3xl px-4 pb-20" aria-label="Services">
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.name} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-surface p-5">
              <span><span className="block font-semibold">{r.name}</span><span className="block text-sm text-muted">{r.what}</span></span>
              <span className={`pill ${tone[r.state]}`}><span aria-hidden className={`h-2 w-2 rounded-full ${r.state === "up" ? "kw-live bg-success" : r.state === "down" ? "bg-danger" : "bg-muted/40"}`} />{label[r.state]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-sm text-muted">Machine-readable checks: <a className="font-semibold text-accent" href="/api/health">/api/health</a> and <a className="font-semibold text-accent" href="/api/ready">/api/ready</a>.</p>
      </section>
    </>
  );
}
