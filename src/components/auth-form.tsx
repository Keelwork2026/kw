"use client";
import { ActionForm, type FormAction } from "./action-form";

export function AuthForm({
  action,
  fields,
  submitLabel,
  hidden,
}: {
  action: FormAction;
  fields: { name: string; label: string; type: string; autoComplete?: string; minLength?: number }[];
  submitLabel: string;
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} submitClassName="btn btn-gradient w-full" className="grid gap-4">
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {fields.map((f) => (
        <div key={f.name}>
          <label className="label" htmlFor={f.name}>{f.label}</label>
          <input
            id={f.name}
            name={f.name}
            type={f.type}
            required
            minLength={f.minLength}
            autoComplete={f.autoComplete}
            className="input"
          />
        </div>
      ))}
    </ActionForm>
  );
}
