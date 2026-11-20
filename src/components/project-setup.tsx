"use client";
import { useState } from "react";
import { parseQuery } from "@/lib/catalog/search";
import { Check } from "@/components/motion";

/**
 * Create Project fields with a live card that takes shape as you type: the
 * name, what kind of project it reads as, and which setup steps are done.
 * Everything shown comes from what you typed — nothing is generated here.
 */
export function ProjectSetupFields({ name: initialName, prompt: initialPrompt, template }: { name: string; prompt: string; template?: string }) {
  const [name, setName] = useState(initialName);
  const [prompt, setPrompt] = useState(initialPrompt);
  const kinds = prompt.trim().length > 8 ? parseQuery(prompt).types.slice(0, 2) : [];
  const steps = [
    { label: "Name it", done: name.trim().length > 1 },
    { label: "Describe what it should do", done: prompt.trim().length >= 20 },
    { label: "Plan it with the Software Architect", done: false, next: true },
  ];
  const ready = steps.filter((s) => s.done).length;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  const firstLine = prompt.trim().split(/(?<=[.!?])\s|\n/)[0] ?? "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid content-start gap-4">
        <div>
          <label className="label" htmlFor="name">Project name</label>
          <input id="name" name="name" required maxLength={80} className="input" placeholder="e.g. Class booking app" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="prompt">What should it do?</label>
          <textarea id="prompt" name="prompt" rows={6} maxLength={2000} className="input" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A booking app for my yoga studio with class passes and card payments" />
          <p className="mt-1 flex justify-between text-xs text-muted"><span>You&apos;ll choose the backend and hosting before the first build.</span><span aria-live="polite">{prompt.length}/2000</span></p>
        </div>
      </div>

      <aside aria-label="Your project so far" className="grid content-start gap-3">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-[var(--kw-shadow-1)] transition-shadow duration-300">
          <div aria-hidden className="kw-blob-a pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl" style={{ background: "var(--grad-art)" }} />
          <div className="relative flex items-center gap-3">
            <span key={initials} className="kw-status grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold text-white" style={{ background: "var(--grad-button)" }} aria-hidden>{initials}</span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">{name.trim() || "Your project"}</p>
              <p className="text-xs text-muted">Draft · {template ? "from a template" : "from your description"}</p>
            </div>
          </div>
          <p className="relative mt-3 line-clamp-3 min-h-[3.75rem] text-sm text-muted">{firstLine || "Describe it on the left and it shows up here."}</p>
          {kinds.length ? <div className="relative mt-2 flex flex-wrap gap-1.5">{kinds.map((k) => <span key={k} className="kw-status pill bg-soft-accent text-accent">{k}</span>)}</div> : null}
        </div>
        <ol className="grid gap-2 rounded-2xl border border-border p-4 text-sm" aria-label="Setup steps">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-2.5">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors duration-200 ${s.done ? "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-success" : s.next ? "border border-dashed border-border text-muted" : "border border-border"}`} aria-hidden>{s.done ? <Check size={14} /> : null}</span>
              <span className={s.done ? "font-semibold" : "text-muted"}>{s.label}</span>
              <span className="sr-only">{s.done ? "done" : "to do"}</span>
            </li>
          ))}
          <li className="mt-1"><div className="kw-progress h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={ready} aria-valuemin={0} aria-valuemax={2} aria-label="Ready to create"><div className="h-full rounded-full" style={{ width: `${(ready / 2) * 100}%`, background: "var(--grad-art)" }} /></div></li>
        </ol>
      </aside>
    </div>
  );
}
