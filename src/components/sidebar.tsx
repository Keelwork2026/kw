import { NavMenu } from "./nav-menu";
import { CommandPalette } from "./command-palette";
import { ThemeSwitch } from "./theme-switch";
import { Logo } from "./logo";
import { ProjectPicker } from "./project-picker";
import { Notifications } from "./notifications";
import type { OrgSummary } from "@/lib/org";
import { signOut } from "@/app/(auth)/actions";

export function Sidebar({ orgs, current, email, isAdmin, projects, staffQueue, waiting }: { orgs: OrgSummary[]; current: OrgSummary; email: string; isAdmin: boolean; projects: { id: string; name: string }[]; staffQueue: number; waiting: number }) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col gap-4 border-r border-border bg-surface px-3 py-4" aria-label="Sidebar">
      <div className="flex items-center justify-between px-2"><Logo href="/dashboard" /><Notifications waiting={waiting} /></div>
      <ProjectPicker orgs={orgs} current={current} />
      <CommandPalette projects={projects} isAdmin={isAdmin} />
      <div className="flex-1 overflow-y-auto pr-1">
        <NavMenu isAdmin={isAdmin} staffQueue={staffQueue} />
      </div>
      <div className="grid gap-2 border-t border-border px-2 pt-3 text-xs text-muted">
        <ThemeSwitch />
        <div className="flex items-center justify-between gap-2">
          <p className="truncate" title={email}>{email}</p>
          <form action={signOut}><button className="font-semibold text-text hover:underline">Sign out</button></form>
        </div>
      </div>
    </aside>
  );
}
