"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export type ActionResult = { ok: boolean; message: string } | null;
export type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * Every form in Keelwork goes through this: it shows a pending state while
 * the server action runs, then success (role="status") or failure
 * (role="alert"). Server actions return a message; they never throw at the user.
 */
export function ActionForm({
  action,
  children,
  className,
  submitLabel,
  pendingLabel = "Working…",
  submitClassName = "btn btn-primary",
  confirm,
}: {
  action: FormAction;
  children?: React.ReactNode;
  className?: string;
  submitLabel: string;
  pendingLabel?: string;
  submitClassName?: string;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Submit label={submitLabel} pendingLabel={pendingLabel} className={submitClassName} />
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function Submit({ label, pendingLabel, className }: { label: string; pendingLabel: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionResult }) {
  if (!state) return null;
  return state.ok ? (
    <p role="status" className="kw-fade text-sm font-medium text-success">{state.message}</p>
  ) : (
    <p role="alert" className="kw-fade text-sm font-medium text-danger">{state.message}</p>
  );
}
