"use client";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { IDEA_KINDS } from "@/lib/idea";
import type { ActionResult, FormAction } from "./action-form";

/**
 * "What do you want to build today?" — one field to start a project. Picking
 * a kind fills in an opening phrase; Enter starts, Shift+Enter adds a line.
 * The planner talks it through before anything is built.
 */
export function QuickStart({ action, defaultIdea = "", defaultKind = "", heading = "What do you want to build today?" }: { action: FormAction; defaultIdea?: string; defaultKind?: string; heading?: string }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, null);
  const [kind, setKind] = useState<string>(defaultKind);
  const [idea, setIdea] = useState(defaultIdea || (IDEA_KINDS.find((k) => k.key === defaultKind)?.starter ?? ""));
  const area = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const pick = (key: string) => {
    const k = IDEA_KINDS.find((x) => x.key === key)!;
    const next = kind === key ? "" : key;
    setKind(next);
    // Only fill the opening phrase when the box is empty or still holds another kind's phrase.
    if (next && (!idea.trim() || IDEA_KINDS.some((x) => x.starter.trim() === idea.trim()))) setIdea(k.starter);
    if (!next && IDEA_KINDS.some((x) => x.starter.trim() === idea.trim())) setIdea("");
    // Focus now; put the caret at the end once React has written the new value.
    area.current?.focus();
    setTimeout(() => { const el = area.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0);
  };

  return (
    <section aria-labelledby="quick-start-title" className="relative mb-8 overflow-hidden rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <div aria-hidden className="kw-blob-a pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl" style={{ background: "var(--grad-art)" }} />
      <h2 id="quick-start-title" className="relative font-display text-2xl font-bold sm:text-3xl">{heading}</h2>
      <p className="relative mt-1 text-sm text-muted">Describe it in a sentence. The planner asks about the rest, and nothing is built until you approve the plan.</p>
      <form ref={formRef} action={formAction} className="relative mt-5">
        <input type="hidden" name="kind" value={kind} />
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-bg p-2 shadow-sm sm:flex-row sm:items-end focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
          <label htmlFor="quick-idea" className="sr-only">Describe your idea</label>
          <textarea
            id="quick-idea" ref={area} name="idea" rows={2} maxLength={2000} required minLength={8}
            value={idea} onChange={(e) => setIdea(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!IDEA_KINDS.some((k) => k.starter.trim() === idea.trim())) formRef.current?.requestSubmit(); } }}
            placeholder="A booking site for my yoga studio with class passes and card payments"
            className="min-h-14 flex-1 resize-none bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted"
            aria-describedby="quick-idea-hint"
          />
          <Submit />
        </div>
        <p id="quick-idea-hint" className="mt-2 text-xs text-muted">Enter to start · Shift+Enter for a new line</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="What kind of thing">
          {IDEA_KINDS.map((k) => (
            <button key={k.key} type="button" aria-pressed={kind === k.key} onClick={() => pick(k.key)}
              className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition ${kind === k.key ? "border-accent bg-soft-accent text-soft-accent-ink" : "border-border bg-surface hover:border-accent"}`}>
              {k.label}
            </button>
          ))}
        </div>
        {state && !state.ok ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{state.message}</p> : null}
      </form>
    </section>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-gradient min-h-12 w-full shrink-0 px-5 sm:w-auto" aria-label={pending ? "Creating your project" : "Start building"}>
      {pending ? "Starting…" : <>Start <span aria-hidden>→</span></>}
    </button>
  );
}
