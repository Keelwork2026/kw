"use client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MENU, PROJECT_PATH_RE, PROJECT_TAB_HINTS, hrefFor, matches } from "@/lib/menu";
import { PROJECT_TABS } from "@/lib/nav";
import { STARTERS, starterHref } from "@/lib/site/starters";

const RECENT_KEY = "kw:recent-search";
function readRecent(): string[] {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 5) : []; } catch { return []; }
}

/** Wraps the query's words where they appear in the label. */
function Highlight({ text, query }: { text: string; query: string }) {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return <>{text.split(re).map((part, i) => (i % 2 ? <mark key={i} className="rounded bg-transparent font-bold text-inherit underline decoration-2 underline-offset-2">{part}</mark> : part))}</>;
}

type Entry = { key: string; label: string; hint: string; group: string; href: string };

/**
 * Quick search (⌘K / Ctrl+K, or the Search button): jump to any page, any
 * section from the menus, any project, or a tab of the project you're in.
 * Arrow keys move, Enter opens, Esc closes.
 */
export function CommandPalette({ projects, isAdmin }: { projects: { id: string; name: string }[]; isAdmin: boolean }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const projectId = PROJECT_PATH_RE.exec(pathname)?.[1] ?? null;
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    if (projectId) {
      const name = projects.find((p) => p.id === projectId)?.name ?? "This project";
      for (const t of PROJECT_TABS) out.push({ key: `tab-${t.slug}`, label: `${name} › ${t.label}`, hint: PROJECT_TAB_HINTS[t.slug].hint, group: "This project", href: `/projects/${projectId}${t.slug ? `/${t.slug}` : ""}` });
    }
    for (const g of MENU) for (const item of g.items) {
      out.push({ key: item.slug, label: item.label, hint: item.hint, group: g.label, href: `/${item.slug}` });
      for (const c of item.children ?? []) out.push({ key: `${item.slug}-${c.label}`, label: `${item.label} › ${c.label}`, hint: c.hint, group: g.label, href: hrefFor(c.to, { projectId, pickerSlug: item.slug }) });
    }
    for (const p of projects) out.push({ key: `p-${p.id}`, label: p.name, hint: "Open project", group: "Projects", href: `/projects/${p.id}` });
    for (const t of STARTERS) out.push({ key: `t-${t.slug}`, label: `${t.name} template`, hint: t.tagline, group: "Templates", href: starterHref(t, true) });
    if (isAdmin) out.push({ key: "admin", label: "Platform admin", hint: "Organizations, support access, reviews", group: "Staff", href: "/admin" });
    return out;
  }, [projects, projectId, isAdmin]);

  const [recent, setRecent] = useState<string[]>([]);
  const results = useMemo(() => {
    if (query.trim()) return entries.filter((e) => matches(e, query)).slice(0, 40);
    // No query: where you went recently first, then everything else (templates only when searched for).
    const byKey = new Map(entries.map((e) => [e.key, e]));
    const recents = recent.map((k) => byKey.get(k)).filter((e): e is Entry => !!e).map((e) => ({ ...e, group: "Recent" }));
    return [...recents, ...entries.filter((e) => !recent.includes(e.key) && e.group !== "Templates")].slice(0, 40);
  }, [entries, query, recent]);

  const open = () => { setQuery(""); setActive(0); setRecent(readRecent()); dialog.current?.showModal(); input.current?.focus(); };
  const close = () => dialog.current?.close();
  const go = (e: Entry | undefined) => {
    if (!e) return;
    try { localStorage.setItem(RECENT_KEY, JSON.stringify([e.key, ...readRecent().filter((k) => k !== e.key)].slice(0, 5))); } catch { /* storage unavailable */ }
    close(); router.push(e.href);
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") { ev.preventDefault(); if (dialog.current?.open) close(); else open(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, listId]);

  return (
    <>
      <button type="button" onClick={open} className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 text-left text-sm text-muted hover:text-text" aria-keyshortcuts="Meta+K Control+K">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <span className="flex-1">Search or jump to…</span>
        <kbd className="rounded-md border border-border bg-surface px-1.5 font-sans text-[11px]">⌘K</kbd>
      </button>
      <dialog ref={dialog} aria-label="Search Keelwork" onClick={(e) => { if (e.target === dialog.current) close(); }} className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-3xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm">
        <div className="border-b border-border p-3">
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            aria-label="Search pages, sections, projects and templates"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
            }}
            placeholder="Search pages, sections, projects and templates…"
            className="w-full bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted"
          />
        </div>
        <ul id={listId} role="listbox" aria-label="Results" className="max-h-[60vh] overflow-y-auto p-2">
          {results.length ? results.map((r, i) => (
            <li
              key={r.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => setActive(i)}
              onClick={() => go(r)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 ${i === active ? "bg-soft-accent text-soft-accent-ink" : ""}`}
            >
              <span className="min-w-0"><span className="block truncate text-sm font-semibold"><Highlight text={r.label} query={query} /></span><span className={`block truncate text-xs ${i === active ? "" : "text-muted"}`}>{r.hint}</span></span>
              <span className="shrink-0 text-[11px] uppercase tracking-wide opacity-70">{r.group}</span>
            </li>
          )) : <li className="px-3 py-6 text-center text-sm text-muted">Nothing matches “{query}”. Try a page name like “deploy”, a project, or a template like “restaurant”.</li>}
        </ul>
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted">↑↓ to move · Enter to open · Esc to close</p>
      </dialog>
    </>
  );
}
