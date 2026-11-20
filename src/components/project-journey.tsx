import Link from "next/link";
import type { Stage, Suggestion } from "@/lib/journey";

/** Describe → Plan → Build → Preview → Test → Deploy, from the project's real state. */
export function JourneySteps({ stages }: { stages: Stage[] }) {
  const done = stages.filter((s) => s.status === "done").length;
  return (
    <nav aria-label={`Project progress: ${done} of ${stages.length} stages done`} className="mt-4 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1.5 text-xs font-semibold sm:text-sm">
        {stages.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <Link href={s.href} aria-current={s.status === "current" ? "step" : undefined}
              className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 transition hover:border-accent ${
                s.status === "done" ? "border-transparent bg-soft-accent text-soft-accent-ink"
                : s.status === "current" ? "border-accent bg-surface text-text shadow-sm"
                : "border-border bg-surface text-muted"}`}>
              <span aria-hidden className={`grid h-5 w-5 place-items-center rounded-full text-[0.7rem] ${s.status === "done" ? "bg-accent text-white" : s.status === "current" ? "bg-text text-bg" : "bg-surface-2"}`}>
                {s.status === "done" ? "✓" : i + 1}
              </span>
              {s.label}
              <span className="sr-only">{s.status === "done" ? " (done)" : s.status === "current" ? " (current step)" : ""}</span>
            </Link>
            {i < stages.length - 1 ? <span aria-hidden className={`h-px w-4 ${s.status === "done" ? "bg-accent" : "bg-border"}`} /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

const KIND: Record<Suggestion["kind"], { label: string; className: string }> = {
  attention: { label: "Needs you", className: "bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-danger" },
  next: { label: "Next step", className: "bg-soft-accent text-soft-accent-ink" },
  discover: { label: "Worth trying now", className: "bg-surface-2 text-text" },
};

/** The most useful things to do next. Empty means there's nothing pressing — and we say so. */
export function NextSteps({ items, title = "What's next", compact = false }: { items: Suggestion[]; title?: string; compact?: boolean }) {
  return (
    <section aria-labelledby="next-steps" className={compact ? "" : "panel p-5"}>
      <h2 id="next-steps" className="text-lg">{title}</h2>
      {items.length ? (
        <ul className={`mt-3 grid gap-3 ${compact ? "" : "md:grid-cols-3"}`}>
          {items.map((s) => (
            <li key={s.key}>
              <Link href={s.href} className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent">
                <span className={`w-fit rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide ${KIND[s.kind].className}`}>{KIND[s.kind].label}</span>
                <span className="mt-2 font-semibold group-hover:underline">{s.title} <span aria-hidden>→</span></span>
                <span className="mt-1 text-sm text-muted">{s.why}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">Nothing needs you right now. Describe a change in the chat whenever you have the next idea.</p>
      )}
    </section>
  );
}
