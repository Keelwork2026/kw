"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { MENU, PROJECT_PATH_RE, TAB_TO_MENU, hrefFor, itemForPath, type MenuItem, type ProjectTab } from "@/lib/menu";

const HINTS_KEY = "kw.menu.hints";

/** Reads a saved on/off preference; storage can be unavailable, so failures fall back to the default. */
function useStoredFlag(key: string, initial: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try { const v = window.localStorage.getItem(key); if (v !== null) setValue(v === "1"); } catch { /* keep default */ }
  }, [key]);
  return [value, (v: boolean) => { setValue(v); try { window.localStorage.setItem(key, v ? "1" : "0"); } catch { /* not persisted */ } }];
}

/**
 * The main menu: groups of pages, each with an optional submenu. Hints (a
 * line under each entry) are on by default and can be switched off. Inside a
 * project, project submenus open that project directly; elsewhere they go
 * through the section's project picker.
 */
export function NavMenu({ isAdmin, staffQueue = 0, onNavigate }: { isAdmin: boolean; staffQueue?: number; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/";
  const projectMatch = PROJECT_PATH_RE.exec(pathname);
  const projectId = projectMatch?.[1] ?? null;
  const projectTab = (projectMatch?.[2] ?? "") as ProjectTab;
  const current = projectId ? TAB_TO_MENU[projectTab] ?? "builder" : itemForPath(pathname)?.item.slug ?? null;
  const [hints, setHints] = useStoredFlag(HINTS_KEY, true);
  const hintsId = useId();

  return (
    <nav aria-label="Main" className="grid gap-4">
      <div className="flex items-center justify-between px-3">
        <span className="text-xs text-muted" id={hintsId}>Menu hints</span>
        <button
          type="button"
          role="switch"
          aria-checked={hints}
          aria-labelledby={hintsId}
          onClick={() => setHints(!hints)}
          className={`relative h-6 w-10 rounded-full border border-border transition-colors ${hints ? "bg-accent" : "bg-surface-2"}`}
        >
          <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-[left] ${hints ? "left-[1.1rem]" : "left-0.5"}`} aria-hidden />
        </button>
      </div>
      {MENU.map((group) => (
        <section key={group.id} aria-labelledby={`menu-${group.id}`}>
          <h2 id={`menu-${group.id}`} className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{group.label}</h2>
          <ul className="grid gap-0.5">
            {group.items.map((item) => (
              <Entry key={item.slug} item={item} active={current === item.slug} hints={hints} projectId={projectId} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </ul>
        </section>
      ))}
      {isAdmin ? (
        <section aria-labelledby="menu-staff">
          <h2 id="menu-staff" className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Staff</h2>
          <ul><li>
            <Link href="/admin" onClick={onNavigate} aria-current={pathname.startsWith("/admin") ? "page" : undefined} className={`flex min-h-10 items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-sm hover:bg-surface-2 ${pathname.startsWith("/admin") ? "bg-surface-2 font-semibold" : "font-medium text-muted hover:text-text"}`}>
              <span><span className="block">Back office</span><span className={hints ? "block text-[11px] font-normal leading-4 text-muted" : "sr-only"}>Staff: overview, workspaces, safety and reviews</span></span>
              {staffQueue ? <span className="pill bg-soft-accent text-soft-accent-ink" aria-label={`${staffQueue} waiting for review`}>{staffQueue}</span> : null}
            </Link>
          </li></ul>
        </section>
      ) : null}
    </nav>
  );
}

function Entry({ item, active, hints, projectId, pathname, onNavigate }: { item: MenuItem; active: boolean; hints: boolean; projectId: string | null; pathname: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState(active);
  useEffect(() => { if (active) setOpen(true); }, [active]);
  const subId = useId();
  const hintId = useId();
  const href = `/${item.slug}`;
  return (
    <li>
      <div className={`group flex items-stretch rounded-xl ${active ? "bg-surface-2" : "hover:bg-surface-2"}`}>
        <Link
          href={href}
          onClick={onNavigate}
          aria-current={active && pathname === href ? "page" : undefined}
          aria-describedby={hintId}
          title={item.hint}
          className={`flex min-h-10 flex-1 flex-col justify-center rounded-xl px-3 py-1.5 text-sm ${active ? "font-semibold text-text" : "font-medium text-muted group-hover:text-text"}`}
        >
          <span>{item.label}</span>
          <span id={hintId} className={hints ? "text-[11px] font-normal leading-4 text-muted" : "sr-only"}>{item.hint}</span>
        </Link>
        {item.children?.length ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={subId}
            aria-label={`${open ? "Hide" : "Show"} ${item.label} sections`}
            onClick={() => setOpen(!open)}
            className="flex w-9 shrink-0 items-center justify-center rounded-xl text-muted hover:text-text"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden className={`transition-transform ${open ? "rotate-90" : ""}`}><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        ) : null}
      </div>
      {item.children?.length ? (
        <ul id={subId} hidden={!open} className="kw-submenu mb-1 ml-4 mt-0.5 grid gap-0.5 border-l border-border pl-2">
          {item.children.map((c) => {
            const to = hrefFor(c.to, { projectId, pickerSlug: item.slug });
            return (
              <li key={c.label}>
                <Link href={to} onClick={onNavigate} title={c.hint} className="flex min-h-8 flex-col justify-center rounded-lg px-2.5 py-1 text-[13px] text-muted hover:bg-surface-2 hover:text-text">
                  <span>{c.label}</span>
                  {hints ? <span className="text-[11px] leading-4 opacity-80">{c.hint}</span> : <span className="sr-only">{c.hint}</span>}
                </Link>
              </li>
            );
          })}
          {"tab" in (item.children[0]?.to ?? {}) && !projectId ? (
            <li className="px-2.5 py-1 text-[11px] text-muted">You&apos;ll pick a project first.</li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}
