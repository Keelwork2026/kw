import type { Plan } from "@/lib/ai/plan";

export function PlanView({ plan }: { plan: Plan }) {
  const lists: [string, string[]][] = [
    ["Pages", plan.pages], ["Roles", plan.roles], ["Automations", plan.automations], ["Integrations", plan.integrations],
    ["Needs your approval", plan.needsApproval], ["Risks", plan.risks], ["Questions", plan.questions],
  ];
  return (
    <div className="grid gap-4">
      <p className="text-base">{plan.summary}</p>
      {plan.data.length ? (
        <div>
          <h4 className="text-sm font-semibold">Data</h4>
          <ul className="mt-1 grid gap-1 text-sm">
            {plan.data.map((d) => (<li key={d.table}><code className="font-mono text-xs">{d.table}</code> <span className="text-muted">— {d.fields.join(", ") || "fields decided by the database agent"}</span></li>))}
          </ul>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {lists.filter(([, v]) => v.length).map(([title, items]) => (
          <div key={title}>
            <h4 className="text-sm font-semibold">{title}</h4>
            <ul className="mt-1 list-disc pl-5 text-sm text-muted">{items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </div>
      {plan.declined?.length ? (
        <div className="rounded-2xl border border-border bg-surface-2 p-4" role="note">
          <h4 className="text-sm font-semibold">Not included</h4>
          <p className="mt-0.5 text-xs text-muted">Keelwork builds the rest of the plan; these parts fall under its content and safety policy. If one is a misunderstanding, describe its purpose in the chat — or ask for a review under Settings → Policy reviews.</p>
          <ul className="mt-2 grid gap-2 text-sm">
            {plan.declined.map((d) => (
              <li key={d.feature}><strong>{d.feature}</strong>{d.reason ? <span className="text-muted"> — {d.reason}</span> : null}{d.alternative ? <span className="block text-muted">Instead: {d.alternative}</span> : null}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
