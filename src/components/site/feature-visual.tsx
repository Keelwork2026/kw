import type { Visual } from "@/lib/site/content";

/** Designed product mock-ups for feature pages, in the site's own tokens (light and dark). */
export function FeatureVisual({ kind }: { kind: Visual }) {
  return (
    <div aria-hidden className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-4 shadow-[0_40px_90px_-50px_rgba(199,37,78,0.45)]">
      <div className="wash pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">{VISUALS[kind]()}</div>
    </div>
  );
}

const Bar = ({ w, tone = "bg-muted/25" }: { w: string; tone?: string }) => <span className={`block h-2 rounded-full ${tone}`} style={{ width: w }} />;
const Win = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-surface shadow-sm">
    <div className="flex items-center gap-1.5 border-b border-border px-3 py-2"><span className="h-2 w-2 rounded-full bg-[#ff5f57]" /><span className="h-2 w-2 rounded-full bg-[#febc2e]" /><span className="h-2 w-2 rounded-full bg-[#28c840]" /><span className="ml-2 text-[11px] font-semibold text-muted">{title}</span></div>
    <div className="p-3">{children}</div>
  </div>
);

const VISUALS: Record<Visual, () => React.ReactNode> = {
  chat: () => (
    <div className="grid gap-3 md:grid-cols-[1fr_1.1fr]">
      <Win title="Chat">
        <div className="grid gap-2 text-[12px]">
          <p className="ml-auto max-w-[85%] rounded-2xl bg-brand px-3 py-2 text-brand-contrast">A booking app for my yoga studio with class passes.</p>
          <p className="max-w-[90%] rounded-2xl bg-surface-2 px-3 py-2">Great. Should members be able to cancel? Up to how many hours before class?</p>
          <p className="ml-auto max-w-[85%] rounded-2xl bg-brand px-3 py-2 text-brand-contrast">Yes, up to 6 hours before.</p>
          <p className="max-w-[90%] rounded-2xl bg-surface-2 px-3 py-2">Here&apos;s the plan — 6 pages, 4 tables, Stripe checkout. Approve when ready.</p>
        </div>
      </Win>
      <Win title="Plan · ready for approval">
        <ul className="grid gap-1.5 text-[12px]">
          {["Timetable and class pages", "Bookings with waitlist", "Class passes (Stripe)", "Reminder emails", "Admin: classes and capacity", "Row-level security"].map((t, i) => (
            <li key={t} className="flex items-center gap-2 rounded-xl bg-surface-2 px-2.5 py-1.5"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${i < 2 ? "bg-success text-white" : "bg-soft-accent text-soft-accent-ink"}`}>{i < 2 ? "✓" : i + 1}</span>{t}</li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2"><span className="btn btn-gradient min-h-8 px-3 text-xs">Approve and build</span><span className="btn btn-secondary min-h-8 px-3 text-xs">Ask for changes</span></div>
      </Win>
    </div>
  ),
  design: () => (
    <Win title="Preview · Design mode">
      <div className="relative rounded-xl bg-surface-2 p-5">
        <p className="font-display text-2xl font-bold">Find your flow</p>
        <p className="mt-1 text-sm text-muted">Classes for every body, every day.</p>
        <span className="relative mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast outline outline-2 outline-offset-4 outline-accent-3">
          See timetable
          <span className="absolute -top-7 left-0 whitespace-nowrap rounded-md bg-accent-3 px-2 py-0.5 font-mono text-[10px] text-white">Button · app/page.tsx:42</span>
        </span>
        <div className="absolute bottom-3 right-3 w-56 rounded-2xl border border-border bg-surface p-3 text-[12px] shadow-xl">
          <p className="font-semibold">Change this button</p>
          <p className="mt-1 rounded-lg bg-surface-2 px-2 py-1.5 text-muted">Rounder, our coral, a little bigger</p>
          <span className="btn btn-primary mt-2 min-h-7 w-full text-[11px]">Plan this change</span>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <span key={i} className="h-14 rounded-xl bg-surface" />)}</div>
      </div>
    </Win>
  ),
  table: () => (
    <div className="grid gap-3 md:grid-cols-[1.3fr_1fr]">
      <Win title="Database · bookings">
        <table className="w-full text-left text-[11px]">
          <thead className="text-muted"><tr><th className="py-1">id</th><th>member</th><th>class</th><th>status</th></tr></thead>
          <tbody>{[["1042", "Amy L.", "Vinyasa 07:00", "booked"], ["1043", "Grace H.", "Yin 18:30", "waitlist"], ["1044", "Alan T.", "Power 12:15", "booked"], ["1045", "Mary S.", "Restore 19:00", "cancelled"]].map((r) => (
            <tr key={r[0]} className="border-t border-border"><td className="py-1.5 font-mono">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td><span className={`pill px-2 py-0.5 ${r[3] === "booked" ? "tile-green" : r[3] === "waitlist" ? "tile-yellow" : "bg-surface-2"}`}>{r[3]}</span></td></tr>
          ))}</tbody>
        </table>
      </Win>
      <Win title="Migration · explained">
        <pre className="rounded-lg bg-ink p-2 font-mono text-[10px] leading-4 text-ink-text">{`alter table bookings
  enable row level security;
create policy own_bookings
  on bookings for select
  using (member_id = auth.uid());`}</pre>
        <p className="mt-2 text-[12px] text-muted">Turns on row-level security, then lets each member read only their own bookings.</p>
      </Win>
    </div>
  ),
  agents: () => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[["Architect", "Planning", "tile-orange"], ["Database", "Writing migration", "tile-violet"], ["Backend", "API: /bookings", "tile-blue"], ["Frontend", "Timetable page", "tile-pink"], ["Integrations", "Stripe checkout", "tile-yellow"], ["QA", "14 tests passed", "tile-green"], ["Security", "No findings", "tile-green"], ["Docs", "README updated", "tile-navy"]].map(([n, s, t], i) => (
        <div key={n} className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${t}`}>{n![0]}</span>
          <p className="mt-2 text-sm font-semibold">{n}</p>
          <p className="text-[11px] text-muted">{s}</p>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full" style={{ width: `${[40, 70, 55, 85, 30, 100, 100, 90][i]}%`, background: "var(--grad-art)" }} /></span>
        </div>
      ))}
    </div>
  ),
  flow: () => (
    <Win title="Automation · New order → Slack">
      <ol className="grid gap-2 text-[12px]">
        {[["Webhook", "Signed · replays refused", "tile-violet"], ["Transform", "Pick total, items, customer", "tile-blue"], ["Slack", "Post to #orders", "tile-pink"], ["Delay", "Wait 1 day", "tile-yellow"], ["Email", "Ask for a review", "tile-green"]].map(([n, d, t], i) => (
          <li key={n} className="flex items-center gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${t}`}>{i + 1}</span>
            <span className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2"><span className="font-semibold">{n}</span> <span className="text-muted">— {d}</span></span>
            <span className="pill tile-green px-2 py-0.5">ok</span>
          </li>
        ))}
      </ol>
    </Win>
  ),
  code: () => (
    <Win title="app/classes/[id]/page.tsx">
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <ul className="grid content-start gap-1 font-mono text-[11px] text-muted">{["app/", "  page.tsx", "  classes/", "    [id]/page.tsx", "  api/", "lib/", "  bookings.ts", "supabase/"].map((f, i) => <li key={f + i} className={i === 3 ? "rounded bg-soft-accent px-1 text-soft-accent-ink" : ""}>{f}</li>)}</ul>
        <pre className="overflow-hidden rounded-lg bg-ink p-3 font-mono text-[11px] leading-5 text-ink-text">{`export default async function Class({ params }) {
  const cls = await getClass(params.id);
  const left = cls.capacity - cls.booked;
  return (
    <Page title={cls.name}>
      <Spots left={left} />
      <BookButton disabled={left === 0} />
    </Page>
  );
}`}</pre>
      </div>
      <p className="mt-2 text-[11px] text-muted">Saved as commit <span className="font-mono">a1b2c3d</span> · Restore any earlier version</p>
    </Win>
  ),
  checks: () => (
    <div className="grid gap-3 md:grid-cols-2">
      <Win title="Checks">
        <ul className="grid gap-1.5 text-[12px]">{[["Affected tests", "14 passed · 3.2s"], ["Type check", "0 errors"], ["Lint", "0 problems"], ["Build", "succeeded"]].map(([k, v]) => <li key={k} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"><span className="font-semibold">{k}</span><span className="pill tile-green px-2 py-0.5">{v}</span></li>)}</ul>
      </Win>
      <Win title="Security">
        <ul className="grid gap-1.5 text-[12px]">{[["Secret scan", "clean", "tile-green"], ["Security review", "1 low", "tile-yellow"], ["Dependency audit", "clean", "tile-green"]].map(([k, v, t]) => <li key={k} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"><span className="font-semibold">{k}</span><span className={`pill px-2 py-0.5 ${t}`}>{v}</span></li>)}</ul>
        <p className="mt-2 text-[11px] text-muted">Critical findings block deployments until fixed.</p>
      </Win>
    </div>
  ),
  integrations: () => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {[["Stripe", "Payments", true], ["Resend", "Email", true], ["Slack", "Messaging", false], ["Twilio", "SMS", false], ["OpenAI", "AI", true], ["Cloudflare", "Hosting", true]].map(([n, c, ok]) => (
        <div key={n as string} className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
          <div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 font-display font-bold">{(n as string)[0]}</span><span className={`pill px-2 py-0.5 ${ok ? "tile-green" : "bg-surface-2"}`}>{ok ? "Connected" : "Add key"}</span></div>
          <p className="mt-2 text-sm font-semibold">{n as string}</p><p className="text-[11px] text-muted">{c as string}</p>
        </div>
      ))}
    </div>
  ),
  deploy: () => (
    <Win title="Deployments · production">
      <ol className="grid gap-2 text-[12px]">
        {[["v14", "Live", "tile-green", "Health check passed · 2 min ago"], ["v13", "Previous", "bg-surface-2", "Roll back to this"], ["v12", "Previous", "bg-surface-2", "Roll back to this"]].map(([v, s, t, d]) => (
          <li key={v} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2"><span className="font-mono font-semibold">{v}</span><span className={`pill px-2 py-0.5 ${t}`}>{s}</span><span className="ml-auto text-muted">{d}</span></li>
        ))}
      </ol>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">{["Collect", "Build", "Upload", "Verify", "Live"].map((s, i) => <span key={s} className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-[10px] text-white">✓</span>{s}{i < 4 ? <span className="h-px w-4 bg-border" /> : null}</span>)}</div>
    </Win>
  ),
  motion: () => (
    <Win title="Preview · Motion">
      <div className="relative h-56 overflow-hidden rounded-xl" style={{ background: "var(--grad-art)" }}>
        <div className="kw-blob-a absolute -left-6 top-6 h-28 w-28 rounded-full bg-white/30 blur-xl" />
        <div className="kw-blob-b absolute right-8 top-10 h-24 w-24 rounded-[30%] bg-white/40" style={{ transform: "rotate(18deg)" }} />
        <div className="kw-bob-1 absolute bottom-8 left-1/3 h-16 w-16 rounded-2xl bg-white/50 shadow-xl" style={{ transform: "perspective(400px) rotateX(20deg) rotateY(-24deg)" }} />
        <p className="absolute bottom-4 right-4 rounded-full bg-black/30 px-3 py-1 text-[11px] font-semibold text-white">Reduce motion: still image</p>
      </div>
    </Win>
  ),
};
