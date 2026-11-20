import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState, timeAgo } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { appealPolicy } from "../actions";

export const metadata = { title: "Policy reviews" };

const STATUS: Record<string, string> = { recorded: "Decision", appealed: "Review requested", upheld: "Upheld after review", overturned: "Overturned — allowed" };

export default async function PolicyReviewsPage() {
  const { supabase, org, user, can } = await requireOrg();
  const { data } = await supabase.from("policy_events").select("id, user_id, source, level, summary, excerpt, status, appeal_note, decision_note, created_at, decided_at").eq("org_id", org.id).order("created_at", { ascending: false }).limit(50);
  const rows = data ?? [];
  return (
    <>
      <PageHeader title="Policy reviews" description="When Keelwork declines to build something, it's listed here. If it got it wrong, ask for a review." />
      <p className="mb-6 max-w-2xl text-sm text-muted">Keelwork builds by default — including controversial opinions, criticism, allegations and strong claims. It only declines software that does something harmful, like phishing or stealing credentials. <Link href="/acceptable-use" className="font-semibold text-accent hover:underline">Read the policy</Link></p>
      {rows.length ? (
        <ul className="grid gap-4">
          {rows.map((e) => {
            const mine = e.user_id === user.id || can("org.manage");
            return (
              <li key={e.id} className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="pill bg-surface-2">{STATUS[e.status as string] ?? e.status}</span>
                  <span className="text-xs text-muted">{e.source === "chat" ? "Builder chat" : "New project"} · {timeAgo(e.created_at as string)}</span>
                </div>
                <p className="mt-3 font-semibold">{e.summary}</p>
                <p className="mt-1 text-sm text-muted">Request: “{e.excerpt}{(e.excerpt as string).length >= 300 ? "…" : ""}”</p>
                {e.appeal_note ? <p className="mt-2 text-sm"><span className="font-semibold">Your reason:</span> {e.appeal_note}</p> : null}
                {e.decision_note ? <p className="mt-2 text-sm"><span className="font-semibold">Reviewer:</span> {e.decision_note}</p> : null}
                {e.status === "overturned" ? <p className="mt-2 text-sm text-success">This exact request now goes through — try it again.</p> : null}
                {e.status === "recorded" && mine ? (
                  <ActionForm action={appealPolicy} submitLabel="Ask for a review" submitClassName="btn btn-secondary" className="mt-4 grid max-w-xl gap-2">
                    <input type="hidden" name="eventId" value={e.id} />
                    <label className="label" htmlFor={`note-${e.id}`}>What is it for?</label>
                    <textarea id={`note-${e.id}`} name="note" required minLength={10} maxLength={1000} rows={2} className="input" placeholder="e.g. It's phishing-awareness training for our own staff, using our own branding." />
                  </ActionForm>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon="shield" title="Nothing declined">Keelwork hasn't declined anything in this organization. If it ever does, you'll see exactly what and why here, and can ask for a review.</EmptyState>
      )}
    </>
  );
}
