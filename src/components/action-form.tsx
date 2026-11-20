"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { SIMPLE_ACTIONS, simplifyConfirm, simplifyMessage } from "@/lib/simple/content";
import { Simple } from "@/components/simple/simple";
import { isSimpleOn } from "@/components/simple/toggle";

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
  pendingHint,
}: {
  action: FormAction;
  children?: React.ReactNode;
  className?: string;
  submitLabel: string;
  pendingLabel?: string;
  submitClassName?: string;
  confirm?: string;
  /** For long jobs: what's happening and roughly how long it takes, shown while it runs. */
  pendingHint?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(isSimpleOn() ? simplifyConfirm(confirm) : confirm)) e.preventDefault();
      }}
    >
      {children}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Submit label={submitLabel} pendingLabel={pendingLabel} className={submitClassName} hint={pendingHint} />
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function Submit({ label, pendingLabel, className, hint }: { label: string; pendingLabel: string; className: string; hint?: string }) {
  const { pending } = useFormStatus();
  const [since, setSince] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!pending) { setSince(null); return; }
    const start = Date.now();
    setSince(start); setNow(start);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pending]);
  const secs = since ? Math.floor((now - since) / 1000) : 0;
  return (
    <>
      <button type="submit" className={`${className} ${pending ? "kw-working" : ""}`} disabled={pending} aria-busy={pending}>
        {pending ? <><span aria-hidden className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" /><Simple simple={pendingLabel === "Working…" ? "Working on it…" : undefined}>{pendingLabel}</Simple></> : <Simple simple={SIMPLE_ACTIONS[label]}>{label}</Simple>}
      </button>
      {pending && (hint || secs >= 3) ? <span className="kw-fade text-xs text-muted" aria-live="polite">{hint}{hint && secs >= 3 ? " · " : ""}{secs >= 3 ? `${secs}s` : ""}</span> : null}
    </>
  );
}

export function FormMessage({ state }: { state: ActionResult }) {
  if (!state) return null;
  // Keyed by message so a repeated save replays the acknowledgment.
  return state.ok ? (
    <p key={state.message} role="status" className="kw-fade inline-flex items-center gap-1.5 text-sm font-medium text-success">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="kw-pop kw-draw shrink-0" aria-hidden><path d="M5 12.5l4.5 4.5L19 7" /></svg>
      {state.message}
    </p>
  ) : (
    <p key={state.message} role="alert" className="kw-shake inline-flex items-start gap-1.5 text-sm font-medium text-danger">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0" aria-hidden><path d="M12 21a9 9 0 100-18 9 9 0 000 18z M12 8v5 M12 16h.01" /></svg>
      <Simple simple={simplifyMessage(state.message)}>{state.message}</Simple>
    </p>
  );
}
