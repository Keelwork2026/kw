import { NavMenu } from "./nav-menu";
import { Logo } from "./logo";
import { ProjectPicker } from "./project-picker";
import type { OrgSummary } from "@/lib/org";
import { signOut } from "@/app/(auth)/actions";

export function Sidebar({ orgs, current, email, isAdmin }: { orgs: OrgSummary[]; current: OrgSummary; email: string; isAdmin: boolean }) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col gap-4 border-r border-border bg-surface px-3 py-4" aria-label="Sidebar">
      <div className="px-2"><Logo href="/dashboard" /></div>
      <ProjectPicker orgs={orgs} current={current} />
      <div className="flex-1 overflow-y-auto pr-1">
        <NavMenu isAdmin={isAdmin} />
      </div>
      <div className="border-t border-border px-2 pt-3 text-xs text-muted">
        <p className="truncate" title={email}>{email}</p>
        <form action={signOut}><button className="mt-1 font-semibold text-text hover:underline">Sign out</button></form>
      </div>
    </aside>
  );
}
