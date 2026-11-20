import { requireStaff } from "@/lib/admin/server";
import { PageHeader, EmptyState, timeAgo } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { decidePolicy } from "../actions";

export const metadata = { title: "Policy appeals" };

export default async function PolicyAppealsPage() {
  const { supabase } = await requireStaff("policy");
  const { data } = await supabase.from("policy_events").select("id, org_id, level, rules, summary, excerpt, appeal_note, appealed_at, created_at").eq("status", "appealed").order("appealed_at").limit(100);
  return (
    <>
      <PageHeader title="Policy appeals" description="People asking for a second look at a refusal. Judge what the software would do — not its topic, opinions or claims." />
      {data?.length ? (
        <ul className="grid gap-4">
          {data.map((e) => (
            <li key={e.id} className="panel p-5">
              <p className="text-xs text-muted">Level {e.level} · {(e.rules as string[]).join(", ")} · appealed {timeAgo(e.appealed_at as string)}</p>
              <p className="mt-2 font-semibold">{e.summary}</p>
              <p className="mt-1 text-sm text-muted">Request: “{e.excerpt}”</p>
              <p className="mt-2 text-sm"><span className="font-semibold">Their reason:</span> {e.appeal_note}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(["overturned", "upheld"] as const).map((d) => (
                  <ActionForm key={d} action={decidePolicy} submitLabel={d === "overturned" ? "Overturn — allow" : "Uphold"} submitClassName={d === "overturned" ? "btn btn-primary" : "btn btn-secondary"} className="grid gap-2">
                    <input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="decision" value={d} />
                    <label className="label" htmlFor={`n-${e.id}-${d}`}>Note for them</label>
                    <input id={`n-${e.id}-${d}`} name="note" required minLength={5} maxLength={1000} className="input" />
                  </ActionForm>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon="success" title="No appeals waiting">Appeals from Settings → Policy reviews appear here.</EmptyState>}
    </>
  );
}
