"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./icons";
import { timeAgo } from "./page-header";
import type { ActivityItem } from "@/lib/activity";

const SEEN_KEY = "kw:activity-seen";
const ICON: Record<ActivityItem["kind"], IconName> = { approval: "warning", plan: "layers", incident: "error", build: "bolt", qa: "flask", deploy: "rocket" };
const TONE: Record<ActivityItem["tone"], string> = { attention: "bg-soft-accent text-soft-accent-ink", success: "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-success", failure: "bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-danger", info: "bg-surface-2 text-text" };

/**
 * The notification centre: a bell whose badge counts only what's waiting on
 * you, and a panel with that list plus recent builds, QA runs and
 * deployments. Read state is kept per browser. No pop-ups, no emails.
 */
export function Notifications({ waiting, placement = "side" }: { waiting: number; placement?: "side" | "top" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const r = await fetch("/api/activity", { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      setItems(((await r.json()) as { items: ActivityItem[] }).items);
    } catch { setFailed(true); }
  }, []);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    let last: string | null = null;
    try { last = localStorage.getItem(SEEN_KEY); } catch { /* storage unavailable */ }
    setSeen(last);
    setOpen(true);
    void load();
    try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch { /* storage unavailable */ }
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const needs = items?.filter((i) => i.needsYou) ?? [];
  const recent = items?.filter((i) => !i.needsYou) ?? [];
  const label = waiting ? `Notifications: ${waiting} waiting on you` : "Notifications";

  return (
    <div ref={box} className="relative">
      <button ref={btn} type="button" onClick={toggle} className="kw-icon-btn" aria-label={label} data-tip="Notifications" aria-expanded={open} aria-haspopup="dialog">
        <Icon name="bell" />
        {waiting ? <span aria-hidden className="absolute right-1 top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white">{waiting > 9 ? "9+" : waiting}</span> : null}
      </button>
      {open ? (
        <div role="dialog" aria-label="Notifications" className={`kw-fade z-50 flex max-h-[min(36rem,80dvh)] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl ${placement === "side" ? "fixed left-[17.5rem] top-4" : "fixed right-3 top-14"}`}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-display font-bold">Notifications</p>
            <button type="button" className="kw-icon-btn !h-8 !w-8" aria-label="Close notifications" onClick={() => { setOpen(false); btn.current?.focus(); }}><Icon name="close" size={16} /></button>
          </div>
          <div className="overflow-y-auto p-2" aria-live="polite">
            {failed ? (
              <div className="p-4 text-sm"><p className="text-danger">Couldn&apos;t load notifications.</p><button type="button" onClick={() => void load()} className="mt-2 font-semibold text-accent hover:underline">Try again</button></div>
            ) : items === null ? (
              <ul aria-label="Loading" className="grid gap-2 p-2">{[0, 1, 2].map((k) => <li key={k} className="h-14 animate-pulse rounded-xl bg-surface-2" />)}</ul>
            ) : !items.length ? (
              <div className="grid justify-items-center gap-1 px-4 py-8 text-center">
                <span className="kw-empty-icon" aria-hidden><Icon name="bell" size={24} /></span>
                <p className="mt-2 font-semibold">You&apos;re all caught up</p>
                <p className="text-sm text-muted">Approvals, plans to review and incidents appear here, along with finished builds, QA runs and deployments from the last two weeks.</p>
              </div>
            ) : (
              <>
                {needs.length ? <Group title="Waiting on you" items={needs} seen={seen} onPick={() => setOpen(false)} /> : null}
                {recent.length ? <Group title="Recent activity" items={recent} seen={seen} onPick={() => setOpen(false)} /> : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Group({ title, items, seen, onPick }: { title: string; items: ActivityItem[]; seen: string | null; onPick: () => void }) {
  return (
    <section className="mb-2">
      <h2 className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{title}</h2>
      <ul className="grid">
        {items.map((i) => {
          const fresh = !seen || i.at > seen;
          return (
            <li key={i.id}>
              <Link href={i.href} onClick={onPick} className="flex gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
                <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TONE[i.tone]}`}><Icon name={ICON[i.kind]} size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{i.title}{fresh ? <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-accent align-middle" aria-label="new" /> : null}</span>
                  <span className="block truncate text-xs text-muted">{i.detail}</span>
                  <span className="block text-[11px] text-muted">{timeAgo(i.at)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
