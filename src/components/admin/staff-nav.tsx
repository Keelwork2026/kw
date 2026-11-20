"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function StaffNav({ sections }: { sections: { slug: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Back office" className="overflow-x-auto">
      <ul className="flex w-max gap-1.5">
        {sections.map((s) => {
          const href = s.slug ? `/admin/${s.slug}` : "/admin";
          const active = s.slug ? path.startsWith(href) : path === "/admin";
          return (
            <li key={s.slug}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${active ? "bg-accent text-accent-contrast shadow-sm" : "border border-border bg-surface hover:bg-surface-2"}`}>{s.label}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
