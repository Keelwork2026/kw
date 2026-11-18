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
    </div>
  );
}
