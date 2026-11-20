import type { ReleaseStatus, Severity, Status, Method } from "@/lib/qa/types";
import { RELEASE_LABEL, METHOD_LABEL } from "@/lib/qa/types";

/** Small, shared pieces for the QA Center. Colour is never the only signal: every chip also has text. */

const SEV: Record<Severity, string> = { critical: "bg-[#9b1c1c] text-white", high: "bg-[#c2410c] text-white", medium: "bg-[#f59e0b] text-[#3b2604]", low: "bg-surface-2 text-text", info: "bg-surface-2 text-muted" };
export function SeverityChip({ s }: { s: Severity | string }) {
  return <span className={`pill ${SEV[s as Severity] ?? "bg-surface-2"}`}>{s}</span>;
}

const ST: Record<Status, [string, string]> = {
  passed: ["bg-success/15 text-success", "✓ Passed"], failed: ["bg-danger/15 text-danger", "✕ Failed"], blocked: ["bg-surface-2 text-muted", "⦸ Blocked"],
  skipped: ["bg-surface-2 text-muted", "– Skipped"], not_run: ["bg-surface-2 text-muted", "○ Not run"], in_progress: ["bg-accent/15 text-accent", "… Running"],
};
export function ResultChip({ s }: { s: Status | string }) {
  const [cls, label] = ST[s as Status] ?? ["bg-surface-2", s];
  return <span className={`pill ${cls}`}>{label}</span>;
}

const MET: Record<Method, string> = { automated: "Executed", browser: "Browser", static: "Code analysis", ai: "AI-assisted", simulated: "AI-simulated", human: "Human", monitoring: "Monitoring" };
export function MethodTag({ m }: { m: Method | string }) {
  return <span title={METHOD_LABEL[m as Method] ?? m} className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${m === "simulated" || m === "ai" ? "border-[#a855f7] text-[#7e22ce]" : "border-border text-muted"}`}>{MET[m as Method] ?? m}</span>;
}

const REL: Record<ReleaseStatus, string> = {
  not_tested: "bg-surface-2 text-muted", in_progress: "bg-accent/15 text-accent", failed: "bg-danger text-white", critical: "bg-[#9b1c1c] text-white",
  needs_review: "bg-[#f59e0b] text-[#3b2604]", conditional: "bg-[#fde68a] text-[#3b2604]", ready: "bg-success text-white", approved: "bg-success text-white",
};
export function ReleaseBadge({ s, large = false }: { s: ReleaseStatus; large?: boolean }) {
  return <span className={`inline-flex items-center rounded-full font-bold ${large ? "px-4 py-1.5 text-base" : "px-3 py-1 text-xs"} ${REL[s]}`}>{s === "approved" || s === "ready" ? "✓ " : s === "critical" || s === "failed" ? "✕ " : ""}{RELEASE_LABEL[s]}</span>;
}

/** A score ring drawn in SVG. null shows as "not measured", never as zero. */
export function ScoreRing({ value, label, basis, size = 120 }: { value: number | null; label: string; basis: string; size?: number }) {
  const r = 46, c = 2 * Math.PI * r;
  const colour = value === null ? "var(--border)" : value >= 85 ? "var(--success)" : value >= 65 ? "#f59e0b" : "var(--danger)";
  return (
    <figure className="m-0 grid justify-items-center gap-1 text-center">
      <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${label}: ${value === null ? "not measured" : `${value} out of 100`} (${basis})`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
        {value !== null && <circle cx="60" cy="60" r={r} fill="none" stroke={colour} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 60 60)" />}
        <text x="60" y="64" textAnchor="middle" fontSize={value === null ? 15 : 30} fontWeight="700" fill="currentColor">{value === null ? "Not run" : value}</text>
      </svg>
      <figcaption className="text-sm font-semibold">{label}</figcaption>
      <span className="text-[11px] uppercase tracking-wider text-muted">{basis}</span>
    </figure>
  );
}

export function Bar({ value, max, colour = "var(--accent)", label }: { value: number; max: number; colour?: string; label: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2" role="img" aria-label={label}>
      <div className="h-full rounded-full" style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%`, background: colour }} />
    </div>
  );
}

/** Score history as a small line chart. */
export function Sparkline({ points }: { points: (number | null)[] }) {
  const vals = points.map((p, i) => ({ i, v: p })).filter((p): p is { i: number; v: number } => p.v !== null);
  if (vals.length < 2) return <p className="text-xs text-muted">Run QA twice to see the trend.</p>;
  const w = 220, h = 48, n = points.length - 1 || 1;
  const d = vals.map((p, k) => `${k ? "L" : "M"}${(p.i / n) * w},${h - (p.v / 100) * h}`).join(" ");
  return <svg width={w} height={h + 4} viewBox={`0 -2 ${w} ${h + 4}`} role="img" aria-label={`Overall score over the last ${points.length} runs: ${vals.map((v) => v.v).join(", ")}`}><path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />{vals.map((p) => <circle key={p.i} cx={(p.i / n) * w} cy={h - (p.v / 100) * h} r="3" fill="var(--accent)" />)}</svg>;
}
