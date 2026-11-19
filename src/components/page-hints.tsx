"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hrefFor, itemForPath, PROJECT_PATH_RE } from "@/lib/menu";

/**
 * "What you can do here" for every top-level page, from the same menu data
 * as the sidebar: the page's purpose, what you can do, and links to its
 * sections. Collapsing it is remembered per page. Project pages show their
 * hints in the project tabs instead.
 */
export function PageHints() {
  const pathname = usePathname() ?? "/";
  const found = PROJECT_PATH_RE.test(pathname) ? null : itemForPath(pathname);
  const key = found ? `kw.hints.${found.item.slug}` : "";
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!key) return;
    try { setOpen(window.localStorage.getItem(key) !== "0"); } catch { setOpen(true); }
  }, [key]);
  if (!found) return null;
  const { item, group } = found;
  const toggle = (next: boolean) => { setOpen(next); try { window.localStorage.setItem(key, next ? "1" : "0"); } catch { /* not persisted */ } };

  return (
    <aside aria-label={`What you can do in ${item.label}`} className="mb-6 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0"><span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{group.label} · Hint</span> <span className="text-muted">— {item.hint}</span></p>
        <button type="button" aria-expanded={open} onClick={() => toggle(!open)} className="shrink-0 text-xs font-semibold text-accent hover:underline">
          {open ? "Hide tips" : "What can I do here?"}
        </button>
      </div>
      {open ? (
        <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
          <ul className="grid gap-1">
            {item.can.map((c) => (
              <li key={c} className="flex gap-2"><span aria-hidden className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{c}</li>
            ))}
          </ul>
          {item.children?.length ? (
            <nav aria-label={`${item.label} sections`} className="flex flex-wrap gap-1.5 md:max-w-sm md:justify-end">
              {item.children.map((c) => (
                <Link key={c.label} href={hrefFor(c.to, { projectId: null, pickerSlug: item.slug })} title={c.hint} className="pill bg-surface-2 text-text hover:ring-1 hover:ring-accent">{c.label}</Link>
              ))}
            </nav>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
