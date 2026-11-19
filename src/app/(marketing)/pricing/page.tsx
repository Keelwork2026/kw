import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

type Plan = { key: string; name: string; max_seats: number | null; max_projects: number | null; monthly_credits_micros: number };

/** Seats, projects and credits come from the same billing_plans rows the database enforces. */
export default async function PricingPage() {
  let plans: Plan[] = [];
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.from("billing_plans").select("key, name, max_seats, max_projects, monthly_credits_micros").in("key", ["free", "pro", "business"]).order("sort");
    plans = (data ?? []) as Plan[];
  }
  return (
    <section className="mx-auto max-w-7xl px-4 py-20">
      <h1 className="text-center text-5xl md:text-7xl">Simple, <span className="font-serif font-normal italic">honest</span> pricing</h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-muted">Start free. Pay for the AI you use, in credits. Your code is yours on every plan.</p>
      {plans.length === 0 ? (
        <p className="notice mx-auto mt-10 max-w-xl text-center">Plans can&apos;t be loaded right now. Please try again shortly.</p>
      ) : (
        <div className="mt-14 grid gap-5 lg:grid-cols-4">
          {plans.map((p) => {
            const featured = p.key === "pro";
            return (
              <div key={p.key} className={featured ? "rounded-[28px] p-[2px]" : ""} style={featured ? { background: "var(--grad-art)" } : undefined}>
                <div className="card h-full">
                  <div className="flex items-center justify-between"><h2 className="text-2xl">{p.name}</h2>{featured ? <span className="pill bg-highlight text-highlight-ink">Popular</span> : null}</div>
                  <p className="mt-4 font-display text-4xl font-bold">{p.key === "free" ? "$0" : "[PRICE]"}</p>
                  <ul className="mt-6 grid gap-2 text-sm">
                    <li>{p.max_seats ?? "Unlimited"} seats</li>
                    <li>{p.max_projects ?? "Unlimited"} projects</li>
                    <li>${(p.monthly_credits_micros / 1_000_000).toFixed(0)} of AI credits each month</li>
                  </ul>
                  <Link href="/sign-up" className={`btn mt-8 w-full ${featured ? "btn-gradient" : "btn-secondary"}`}>{p.key === "free" ? "Start free" : `Choose ${p.name}`}</Link>
                </div>
              </div>
            );
          })}
          <div className="card">
            <h2 className="text-2xl">Enterprise</h2>
            <p className="mt-4 font-display text-4xl font-bold">Custom</p>
            <ul className="mt-6 grid gap-2 text-sm"><li>Unlimited seats and projects</li><li>Support access you approve</li><li>Dedicated sandbox hosts</li></ul>
            <a href="mailto:[SALES EMAIL]" className="btn btn-primary mt-8 w-full">Talk to sales</a>
          </div>
        </div>
      )}
      <p className="mt-6 text-center text-sm text-muted">Prices in [CURRENCY]. [DISCOUNT]</p>
      <div className="mx-auto mt-16 grid max-w-3xl gap-3">
        <h2 className="text-3xl">Questions</h2>
        {[
          ["What is a credit?", "Credits pay for AI and web search. They're metered in millionths of a dollar at the provider's price for each model, and every charge appears in your usage history."],
          ["What happens if I run out?", "Agents pause before the next AI call and tell you why. Nothing you've built is lost. Buy a credit pack or wait for next month's allowance."],
          ["Do I own what I build?", "Yes. Every line. Export the full source any time, and deploy to your own cloud account."],
          ["Can I cancel any time?", "Yes. Your plan stays active until the end of the billing period, and your projects stay exportable."],
        ].map(([q, a]) => (
          <details key={q} className="panel p-5"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-muted">{a}</p></details>
        ))}
      </div>
    </section>
  );
}
