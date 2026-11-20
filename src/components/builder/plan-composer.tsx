"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkPlanRequest, planNow, postMessage } from "@/app/(app)/projects/[id]/actions";
import { Check, Dots, useElapsed } from "@/components/motion";

type StepState = "waiting" | "active" | "done" | "failed";
type Step = { key: string; label: string; state: StepState };

/**
 * The chat composer. Sending runs real steps one after another — save the
 * message, check the request, the Software Architect plans, the plan opens —
 * and each step is shown as it actually starts and finishes. Nothing is
 * marked done before its server call returns; no percentages are invented.
 */
export function PlanComposer({ projectId, canPlan, planNow: offerPlan, aiReady }: { projectId: string; canPlan: boolean; planNow: boolean; aiReady: boolean }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [showing, setShowing] = useState<{ message: string } | null>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [planningSince, setPlanningSince] = useState<number | null>(null);
  const elapsed = useElapsed(planningSince);
  const text = useRef<HTMLTextAreaElement>(null);
  const busy = steps?.some((s) => s.state === "active") ?? false;

  const set = (key: string, state: StepState) => setSteps((all) => all?.map((s) => (s.key === key ? { ...s, state } : s)) ?? null);

  async function run(withMessage: boolean) {
    const content = text.current?.value ?? "";
    if (withMessage && !content.trim()) { setResult({ ok: false, message: "Write a message first." }); return; }
    setResult(null);
    const plan = canPlan && aiReady;
    const list: Step[] = [
      ...(withMessage ? [{ key: "save", label: "Saving your message", state: "waiting" as const }] : []),
      ...(plan ? [
        { key: "check", label: "Checking what you asked for", state: "waiting" as const },
        { key: "plan", label: "The Software Architect is planning", state: "waiting" as const },
        { key: "show", label: "Opening your plan", state: "waiting" as const },
      ] : []),
    ];
    setSteps(list);
    const step = async (key: string, fn: () => Promise<{ ok: boolean; message: string } | null>) => {
      set(key, "active");
      if (key === "plan") setPlanningSince(Date.now());
      const r = await fn().catch((e: Error) => ({ ok: false, message: e.message || "Something went wrong." }));
      if (key === "plan") setPlanningSince(null);
      if (!r || !r.ok) { set(key, "failed"); setResult(r ?? { ok: false, message: "Something went wrong." }); startTransition(() => router.refresh()); return false; }
      set(key, "done");
      return r;
    };
    if (withMessage) {
      if (!(await step("save", () => postMessage(projectId, content)))) return;
      if (text.current) text.current.value = "";
      if (!plan) { setResult({ ok: true, message: aiReady ? "Message saved." : "Message saved. AI isn't configured on this installation, so no plan can be made yet." }); startTransition(() => router.refresh()); setSteps(null); return; }
    }
    if (!(await step("check", () => checkPlanRequest(projectId)))) return;
    const planned = await step("plan", () => planNow(projectId));
    if (!planned) return;
    set("show", "active");
    setShowing({ message: planned.message });
    startTransition(() => { router.refresh(); });
  }

  // "Opening your plan" finishes when the refreshed page (with the plan) has actually rendered.
  useEffect(() => {
    if (!showing || refreshing) return;
    set("show", "done");
    setResult({ ok: true, message: showing.message });
    setShowing(null);
    document.getElementById("plan")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set only updates local state
  }, [showing, refreshing]);

  return (
    <div className="border-t border-border p-4">
      {steps && steps.length ? (
        <ol className="mb-3 grid gap-1.5 rounded-2xl border border-border bg-surface-2 p-3" aria-label="Planning progress" aria-live="polite">
          {steps.map((s) => (
            <li key={s.key} className={`flex items-center gap-2.5 text-sm transition-opacity duration-200 ${s.state === "waiting" ? "opacity-50" : "opacity-100"}`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${s.state === "done" ? "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-success" : s.state === "failed" ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-danger" : s.state === "active" ? "kw-ring bg-soft-accent text-accent" : "border border-border"}`} aria-hidden>
                {s.state === "done" ? <Check size={14} /> : s.state === "failed" ? "!" : s.state === "active" ? <Dots /> : null}
              </span>
              <span className={s.state === "active" ? "font-semibold" : ""}>{s.label}{s.key === "plan" && s.state === "active" && elapsed > 2 ? <span className="font-normal text-muted"> · {elapsed}s</span> : null}</span>
              <span className="sr-only">{s.state === "done" ? "done" : s.state === "active" ? "in progress" : s.state === "failed" ? "failed" : "not started"}</span>
            </li>
          ))}
          {steps.some((s) => s.key === "plan" && s.state === "active") ? <li className="pl-8 text-xs text-muted">Usually 15–60 seconds. You can leave this page; the plan appears here when it&apos;s ready.</li> : null}
        </ol>
      ) : null}
      {result ? <p key={result.message} role={result.ok ? "status" : "alert"} className={`mb-3 flex items-start gap-1.5 text-sm font-medium ${result.ok ? "text-success" : "kw-shake text-danger"}`}>{result.ok ? <Check /> : null}{result.message}</p> : null}
      {offerPlan && aiReady ? <button type="button" onClick={() => run(false)} disabled={busy} aria-busy={busy} className="btn btn-gradient mb-3">Plan this idea</button> : null}
      <form onSubmit={(e) => { e.preventDefault(); void run(true); }}>
        <label htmlFor="content" className="sr-only">Message</label>
        <textarea ref={text} id="content" name="content" rows={3} maxLength={8000} required className="input" placeholder="Add a waitlist page with email confirmation" disabled={busy}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void run(true); } }} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy}>{busy ? <><Dots />Working</> : "Send"}</button>
          <span className="text-xs text-muted">⌘/Ctrl + Enter to send</span>
        </div>
      </form>
    </div>
  );
}
