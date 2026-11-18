import Link from "next/link";
import { SECTIONS } from "@/lib/nav";
import { Logo } from "./logo";
import { ProjectPicker } from "./project-picker";
import type { OrgSummary } from "@/lib/org";
import { signOut } from "@/app/(auth)/actions";

export function Sidebar({ orgs, current, email, isAdmin }: { orgs: OrgSummary[]; current: OrgSummary; email: string; isAdmin: boolean }) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col gap-4 border-r border-border bg-surface px-3 py-4" aria-label="Main">
      <div className="px-2"><Logo href="/dashboard" /></div>
      <ProjectPicker orgs={orgs} current={current} />
      <nav className="flex-1 overflow-y-auto">
        <ul className="grid gap-0.5">
          {SECTIONS.map((s) => (
            <li key={s.slug}>
              <Link href={`/${s.slug}`} className="flex min-h-10 items-center rounded-xl px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text">
                {s.label}
              </Link>
            </li>
          ))}
          {isAdmin ? (
            <li><Link href="/admin" className="flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-accent hover:bg-surface-2">Platform admin</Link></li>
          ) : null}
        </ul>
      </nav>
      <div className="border-t border-border px-2 pt-3 text-xs text-muted">
        <p className="truncate" title={email}>{email}</p>
        <form action={signOut}><button className="mt-1 font-semibold text-text hover:underline">Sign out</button></form>
      </div>
    </aside>
  );
}
