import type { Definition } from "@/lib/automation/definition";
import { diagram, type DiagramNode } from "@/lib/automation/describe";
import { Icon, type IconName } from "@/components/icons";

const ICON: Record<DiagramNode["kind"], IconName> = { trigger: "bolt", http: "globe", email: "inbox", slack: "chat", transform: "code", delay: "clock" };

/** The workflow as a left-to-right flow: trigger, then each step with its conditions and retries. */
export function WorkflowDiagram({ trigger, schedule, definition, compact = false }: { trigger: string; schedule?: string | null; definition: Definition | null | undefined; compact?: boolean }) {
  const nodes = diagram(trigger, schedule, definition);
  return (
    <ol className="flex flex-wrap items-stretch gap-y-2" aria-label="Workflow steps">
      {nodes.map((n, i) => {
        const prev = nodes[i - 1];
        const branch = n.after.length && prev && !n.after.includes(prev.id) ? `after ${n.after.join(", ")}` : null;
        return (
          <li key={n.id} className="flex items-center">
            {i > 0 ? <span aria-hidden className="mx-1.5 text-muted">→</span> : null}
            <span className={`flex items-start gap-2 rounded-xl border px-2.5 py-2 ${n.kind === "trigger" ? "border-accent/40 bg-accent/5" : "border-border bg-surface"} ${compact ? "max-w-[11rem]" : "max-w-[15rem]"}`}>
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md ${n.kind === "trigger" ? "bg-accent text-accent-contrast" : "bg-surface-2 text-text"}`}><Icon name={ICON[n.kind]} size={14} /></span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold">{n.title}</span>
                <span className="block truncate text-[11px] text-muted" title={n.detail}>{n.detail}</span>
                {!compact && (n.condition || n.retries || branch) ? <span className="mt-0.5 block text-[10px] text-muted">{[n.condition, branch, n.retries].filter(Boolean).join(" · ")}</span> : null}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
