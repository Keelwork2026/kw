import { requireStaff } from "@/lib/admin/server";
import { PageHeader, EmptyState, timeAgo } from "@/components/page-header";

export const metadata = { title: "Simple Mode feedback · back office" };

type Row = { page_key: string; helpful: boolean; note: string | null; created_at: string };

/** What people said about the Simple Mode guide, page by page: where plain words still aren't plain enough. */
export default async function AdminSimpleFeedback() {
  const { supabase } = await requireStaff("simple");
  const { data } = await supabase.from("simple_feedback").select("page_key, helpful, note, created_at").gte("created_at", new Date(Date.now() - 90 * 86_400_000).toISOString()).order("created_at", { ascending: false }).limit(2000);
  const rows = (data ?? []) as Row[];
  const pages = [...rows.reduce((m, r) => {
    const p = m.get(r.page_key) ?? { yes: 0, no: 0, notes: [] as Row[] };
    if (r.helpful) p.yes++; else p.no++;
    if (r.note && p.notes.length < 5) p.notes.push(r);
    return m.set(r.page_key, p);
  }, new Map<string, { yes: number; no: number; notes: Row[] }>())].sort((a, b) => b[1].no - a[1].no || (b[1].yes + b[1].no) - (a[1].yes + a[1].no));

  return (
    <>
      <PageHeader title="Simple Mode feedback" description="Answers to “Did this page make sense?” from the last 90 days. Pages with the most “not really” come first. Notes are shown without names." />
      {pages.length ? (
        <ul className="grid gap-4">
          {pages.map(([key, p]) => {
            const total = p.yes + p.no;
            return (
              <li key={key} className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm font-semibold">{key}</p>
                  <p className="text-sm"><strong>{Math.round((p.yes / total) * 100)}%</strong> said yes · {p.yes} yes, {p.no} not really</p>
                </div>
                <div aria-hidden className="mt-2 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--danger)_25%,transparent)]"><div className="h-full bg-success" style={{ width: `${(p.yes / total) * 100}%` }} /></div>
                {p.notes.length ? <ul className="mt-3 grid gap-1.5 text-sm">{p.notes.map((n, i) => <li key={i} className="rounded-lg bg-surface-2 px-3 py-2">“{n.note}” <span className="text-xs text-muted">· {timeAgo(n.created_at)}</span></li>)}</ul> : null}
              </li>
            );
          })}
        </ul>
      ) : <EmptyState icon="chart" title="No feedback yet">When people use Simple Mode, their answers to “Did this page make sense?” show up here.</EmptyState>}
    </>
  );
}
