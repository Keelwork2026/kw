import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState, formatMicros, timeAgo } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { parseCreditPacks, stripeConfigured } from "@/lib/billing/stripe";
import { buyCredits, changePlan, openPortal, setSpendLimit } from "@/lib/billing/server";

export const metadata = { title: "Billing and Usage" };

type Summary = { plan_key: string; plan_name: string; balance_micros: number; month_usage_micros: number; spend_limit_micros: number | null; monthly_credits_micros: number; seats_used: number; max_seats: number | null; projects_used: number; max_projects: number | null; subscription_status: string | null; has_customer: boolean };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ paid?: string; subscribed?: string }> }) {
  const { supabase, org, can } = await requireOrg();
  const sp = await searchParams;
  if (!can("usage.read")) return (<><PageHeader title="Billing and Usage" /><EmptyState title="You need the usage.read permission">Owners, admins and billing managers can see billing.</EmptyState></>);
  const [{ data: summaryRaw }, { data: ledger }, { data: plans }] = await Promise.all([
    supabase.rpc("billing_summary", { p_org: org.id }),
    supabase.from("credit_ledger").select("id, kind, amount_micros, reference, description, created_at").eq("org_id", org.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("billing_plans").select("key, name, max_seats, max_projects, monthly_credits_micros, stripe_price_env").order("sort"),
  ]);
  const s = summaryRaw as Summary;
  const manage = can("billing.manage");
  const online = stripeConfigured();
  let packs: ReturnType<typeof parseCreditPacks> = [];
  try { packs = parseCreditPacks(process.env.CREDIT_PACKS); } catch { packs = []; }

  return (
    <>
      <PageHeader title="Billing and Usage" description="Credits pay for AI and web search, metered at each model's price. The balance is the sum of the ledger below." />
      {sp.paid ? <p role="status" className="notice mb-6">Thanks — the credits appear here as soon as Stripe confirms the payment.</p> : null}
      {sp.subscribed ? <p role="status" className="notice mb-6">Thanks — your plan changes as soon as Stripe confirms the subscription.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Balance" value={formatMicros(s.balance_micros)} />
        <Stat label="Used this month" value={formatMicros(s.month_usage_micros)} hint={s.spend_limit_micros !== null ? `limit ${formatMicros(s.spend_limit_micros)}` : "no limit"} />
        <Stat label="Plan" value={s.plan_name} hint={s.subscription_status ?? undefined} />
        <Stat label="Seats · Projects" value={`${s.seats_used}/${s.max_seats ?? "∞"} · ${s.projects_used}/${s.max_projects ?? "∞"}`} />
      </div>

      {manage ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="card" aria-labelledby="limit">
            <h2 id="limit" className="text-lg">Monthly spending limit</h2>
            <p className="mt-1 text-sm text-muted">AI calls and searches stop when this month&apos;s usage would pass it.</p>
            <ActionForm action={setSpendLimit} submitLabel="Save limit" submitClassName="btn btn-secondary" className="mt-3">
              <label className="label" htmlFor="limit-in">Limit in dollars (empty = none)</label>
              <input id="limit-in" name="limit" inputMode="decimal" defaultValue={s.spend_limit_micros !== null ? (s.spend_limit_micros / 1e6).toFixed(2) : ""} className="input" />
            </ActionForm>
          </section>
          {online ? (
            <>
              <section className="card" aria-labelledby="packs">
                <h2 id="packs" className="text-lg">Buy credits</h2>
                {packs.length ? (
                  <ActionForm action={buyCredits} submitLabel="Continue to checkout" submitClassName="btn btn-gradient" className="mt-3 grid gap-2">
                    {packs.map((p, i) => <label key={p.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="pack" value={p.id} defaultChecked={i === 0} />{formatMicros(p.credits_micros)} of credits — {(p.price_cents / 100).toFixed(2)} {p.currency.toUpperCase()}</label>)}
                  </ActionForm>
                ) : <p className="mt-2 text-sm text-muted">No credit packs are configured (CREDIT_PACKS).</p>}
              </section>
              <section className="card" aria-labelledby="plan">
                <h2 id="plan" className="text-lg">Plan</h2>
                <ActionForm action={changePlan} submitLabel="Change plan" submitClassName="btn btn-primary" className="mt-3 grid gap-2">
                  {(plans ?? []).filter((p) => p.stripe_price_env && process.env[p.stripe_price_env]).map((p) => <label key={p.key} className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="plan" value={p.key} defaultChecked={p.key === s.plan_key} />{p.name} — {p.max_seats} seats, {p.max_projects} projects, {formatMicros(p.monthly_credits_micros)}/month</label>)}
                </ActionForm>
                {s.has_customer ? <ActionForm action={openPortal} submitLabel="Open the billing portal" submitClassName="btn btn-secondary mt-3" /> : null}
              </section>
            </>
          ) : null}
        </div>
      ) : null}

      <section className="panel mt-8 overflow-x-auto" aria-labelledby="history">
        <h2 id="history" className="px-5 pt-4 text-lg">Usage history</h2>
        {ledger?.length ? (
          <table className="mt-2 w-full min-w-[560px] text-left text-sm">
            <thead className="text-muted"><tr><th className="px-5 py-2">When</th><th className="px-5 py-2">What</th><th className="px-5 py-2 text-right">Amount</th></tr></thead>
            <tbody>{ledger.map((l) => (
              <tr key={l.id} className="border-t border-border"><td className="px-5 py-2 text-muted">{timeAgo(l.created_at)}</td><td className="px-5 py-2">{l.kind}{l.description ? ` · ${l.description}` : ""}</td>
                <td className={`px-5 py-2 text-right font-mono ${l.amount_micros < 0 ? "" : "text-success"}`}>{l.amount_micros < 0 ? "−" : "+"}{formatMicros(Math.abs(l.amount_micros))}</td></tr>
            ))}</tbody>
          </table>
        ) : <div className="p-5"><EmptyState title="No usage yet" /></div>}
      </section>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="panel p-5"><p className="text-sm text-muted">{label}</p><p className="mt-1 font-display text-2xl font-bold">{value}</p>{hint ? <p className="text-xs text-muted">{hint}</p> : null}</div>;
}
