import Link from "next/link";
import { Icon, type IconName } from "./icons";
import { Simple, StatusWords } from "./simple/simple";
import { SIMPLE_TITLES } from "@/lib/simple/content";
export function PageHeader({ title, description, actions, simple }: { title: string; description?: string; actions?: React.ReactNode; simple?: { title?: string; description?: string } }) {
  const plain = { ...SIMPLE_TITLES[title], ...simple };
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl md:text-4xl" style={{ letterSpacing: "-0.045em" }}><Simple simple={plain.title}>{title}</Simple></h1>
        {description || plain.description ? <p className="mt-1 max-w-2xl text-muted"><Simple simple={plain.description}>{description}</Simple></p> : null}
      </div>
      {actions}
    </header>
  );
}

/**
 * An empty section is an introduction, not missing content: an icon, what
 * will appear here and why, and what to do first (plus an optional second
 * route, like a template). Actions only link to things that work.
 */
export function EmptyState({ title, children, icon = "inbox", action, secondary }: {
  title: string; children?: React.ReactNode; icon?: IconName;
  action?: { label: string; href: string }; secondary?: { label: string; href: string };
}) {
  return (
    <div className="panel kw-empty relative grid justify-items-center gap-1 overflow-hidden px-6 py-10 text-center">
      <span aria-hidden className="kw-empty-glow" />
      <span className="kw-empty-icon" aria-hidden><Icon name={icon} size={26} /></span>
      <p className="mt-3 font-display text-lg font-bold">{title}</p>
      {children ? <div className="max-w-md text-sm text-muted">{children}</div> : null}
      {action || secondary ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {action ? <Link href={action.href} className="btn btn-gradient">{action.label}</Link> : null}
          {secondary ? <Link href={secondary.href} className="btn btn-secondary">{secondary.label}</Link> : null}
        </div>
      ) : null}
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
  // Keyed by status, so a change (queued → running → done) re-plays the entrance and is noticed.
  const working = ["building", "running", "planning", "deploying", "queued"].includes(status);
  return <span key={status} className={`pill kw-status ${STATUS_TONE[status] ?? "bg-surface-2 text-text"}`}>{working ? <span aria-hidden className="kw-live h-1.5 w-1.5 rounded-full bg-current" /> : null}<StatusWords status={status} /></span>;
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
