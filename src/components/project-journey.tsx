import Link from "next/link";
import type { Stage } from "@/lib/journey";

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

/** Shown once after a project is created: what happened and what comes next. */
export function Created({ name, hasIdea, aiReady, copied = null, installFailed = false }: { name: string; hasIdea: boolean; aiReady: boolean; copied?: number | null; installFailed?: boolean }) {
  return (
    <div role="status" className="kw-fade flex items-start gap-4 rounded-2xl border border-border bg-surface p-5">
      <span className="kw-pop grid h-11 w-11 shrink-0 place-items-center rounded-full bg-soft-accent text-soft-accent-ink">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="kw-draw" aria-hidden><path d="M5 12.5l4.5 4.5L19 7" /></svg>
      </span>
      <div>
        <p className="font-display text-lg font-bold">{copied !== null ? `${name} is ready` : `${name} is ready to plan`}</p>
        <p className="mt-1 text-sm text-muted">
          {copied !== null ? `${copied} files were copied and committed. Secrets weren't copied — add the ones this app needs under Secrets.${installFailed ? " Installing packages didn't finish, so the preview may not start until they're installed." : " Its preview is starting."}`
            : !aiReady ? "Your idea is saved. The planner will answer once AI is configured on this installation."
            : hasIdea ? "Your idea is with the Software Architect. Answer its questions in the chat, then approve the plan — nothing is built before that."
            : "Describe what it should do in the chat; the Software Architect turns it into a plan for you to approve."}
        </p>
        <a href={copied !== null ? "#preview" : "#chat"} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">{copied !== null ? "Go to the preview" : "Go to the chat"} <span aria-hidden>→</span></a>
      </div>
    </div>
  );
}
