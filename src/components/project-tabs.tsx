"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROJECT_TABS } from "@/lib/nav";
import { PROJECT_TAB_HINTS } from "@/lib/menu";
import { SIMPLE_TABS } from "@/lib/simple/content";
import { Simple, OnlyStandard } from "@/components/simple/simple";

/**
 * Project tabs. Each tab carries a hint (tooltip and screen-reader text);
 * under the tabs, the active tab's purpose and its sections to jump to.
 */
export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname() ?? "";
  const base = `/projects/${projectId}`;
  const active = PROJECT_TABS.find((t) => (t.slug ? pathname.startsWith(`${base}/${t.slug}`) : pathname === base));
  const info = active ? PROJECT_TAB_HINTS[active.slug] : null;
  const activeHref = active?.slug ? `${base}/${active.slug}` : base;
  return (
    <>
      <nav aria-label="Project" className="mt-4 overflow-x-auto">
        <ul className="flex w-max gap-1.5">
          {PROJECT_TABS.map((t) => {
            const href = t.slug ? `${base}/${t.slug}` : base;
            const isActive = active?.slug === t.slug;
            const hint = PROJECT_TAB_HINTS[t.slug].hint;
            return (
              <li key={t.label}>
                <Link
                  href={href}
                  title={hint}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${isActive ? "bg-accent text-accent-contrast shadow-sm" : "border border-border bg-surface hover:bg-surface-2"}`}
                >
                  <Simple simple={SIMPLE_TABS[t.slug]?.label}>{t.label}</Simple><span className="sr-only"> — {hint}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {info ? (
        <OnlyStandard><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" role="note" aria-label={`${active!.label} tab hint`}>
          <p className="text-muted"><span className="font-semibold text-text">{active!.label}:</span> {info.hint}. You can {info.can.map((c) => c.charAt(0).toLowerCase() + c.slice(1)).join("; ")}.</p>
          {info.jump?.length ? (
            <nav aria-label={`${active!.label} sections`} className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">Jump to</span>
              {info.jump.map((j) => (
                <Link key={j.label} href={`${activeHref}${j.query ? `?${j.query}` : ""}${j.at ? `#${j.at}` : ""}`} className="pill bg-surface-2 text-text hover:ring-1 hover:ring-accent">{j.label}</Link>
              ))}
            </nav>
          ) : null}
        </div></OnlyStandard>
      ) : null}
    </>
  );
}
