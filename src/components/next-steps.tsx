"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Suggestion } from "@/lib/journey";
import { Icon } from "./icons";

const KIND: Record<Suggestion["kind"], { label: string; className: string }> = {
  attention: { label: "Needs you", className: "bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-danger" },
  next: { label: "Next step", className: "bg-soft-accent text-soft-accent-ink" },
  discover: { label: "Worth trying now", className: "bg-surface-2 text-text" },
};

/** Identity of a suggestion as shown: when its wording changes (e.g. a new issue count), it shows again. */
const sig = (s: Suggestion) => `${s.key}|${s.title}`;

function read(projectId: string): string[] {
  try { const v = JSON.parse(localStorage.getItem(`kw:hidden-steps:${projectId}`) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(-50) : []; } catch { return []; }
}
function write(projectId: string, list: string[]) {
  try { localStorage.setItem(`kw:hidden-steps:${projectId}`, JSON.stringify(list.slice(-50))); } catch { /* storage unavailable: hiding lasts until reload */ }
}

/**
 * The most useful things to do next, from lib/journey. Each can be hidden
 * (remembered per project in this browser); hidden ones can be shown again.
 * Suggestions never block anything — they're links, not steps you must take.
 */
export function NextSteps({ items, projectId, title = "What's next" }: { items: Suggestion[]; projectId: string; title?: string }) {
  const [hidden, setHidden] = useState<string[]>([]);
  useEffect(() => { setHidden(read(projectId)); }, [projectId]);
  const visible = items.filter((s) => !hidden.includes(sig(s)));
  const hiddenHere = items.length - visible.length;
  const hide = (s: Suggestion) => { const next = [...hidden, sig(s)]; setHidden(next); write(projectId, next); };
  const showAll = () => { const keep = hidden.filter((h) => !items.some((s) => sig(s) === h)); setHidden(keep); write(projectId, keep); };

  return (
    <section aria-labelledby="next-steps" className="panel p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="next-steps" className="text-lg">{title}</h2>
        {hiddenHere ? <button type="button" onClick={showAll} className="text-sm font-semibold text-accent hover:underline">Show {hiddenHere} hidden</button> : null}
      </div>
      {visible.length ? (
        <ul className="mt-3 grid gap-3 md:grid-cols-3">
          {visible.map((s) => (
            <li key={s.key} className="relative">
              <Link href={s.href} className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-4 pr-11 transition hover:-translate-y-0.5 hover:border-accent">
                <span className={`w-fit rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide ${KIND[s.kind].className}`}>{KIND[s.kind].label}</span>
                <span className="mt-2 font-semibold group-hover:underline">{s.title} <span aria-hidden>→</span></span>
                <span className="mt-1 text-sm text-muted">{s.why}</span>
              </Link>
              <button type="button" onClick={() => hide(s)} className="kw-icon-btn absolute right-1.5 top-1.5" aria-label={`Hide suggestion: ${s.title}`} data-tip="Hide">
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">{hiddenHere ? "You've hidden the suggestions for now." : "Nothing needs you right now. Describe a change in the chat whenever you have the next idea."}</p>
      )}
    </section>
  );
}
