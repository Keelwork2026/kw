export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl md:text-4xl" style={{ letterSpacing: "-0.045em" }}>{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-muted">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="panel p-8 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="notice" role="note">{children}</div>;
}

const STATUS_TONE: Record<string, string> = {
  live: "bg-[#e6fbf1] text-[#0b7a4b]", succeeded: "bg-[#e6fbf1] text-[#0b7a4b]", passed: "bg-[#e6fbf1] text-[#0b7a4b]",
  done: "bg-[#e6fbf1] text-[#0b7a4b]", resolved: "bg-[#e6fbf1] text-[#0b7a4b]", approved: "bg-[#e6fbf1] text-[#0b7a4b]", saved: "bg-[#e6fbf1] text-[#0b7a4b]",
  failed: "bg-[#fde8e4] text-[#a3281a]", error: "bg-[#fde8e4] text-[#a3281a]", rejected: "bg-[#fde8e4] text-[#a3281a]", open: "bg-[#fde8e4] text-[#a3281a]", conflict: "bg-[#fde8e4] text-[#a3281a]",
  building: "tile-accent", running: "tile-accent", planning: "tile-accent",
  queued: "bg-[#fff6d6] text-[#8a6100]", pending: "bg-[#fff6d6] text-[#8a6100]", waiting_approval: "bg-[#fff6d6] text-[#8a6100]", paused: "bg-[#fff6d6] text-[#8a6100]",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill ${STATUS_TONE[status] ?? "bg-surface-2 text-text"}`}>{status.replace(/_/g, " ")}</span>;
}

export function formatMicros(micros: number | string | null | undefined): string {
  const n = Number(micros ?? 0);
  return `$${(n / 1_000_000).toFixed(2)}`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
