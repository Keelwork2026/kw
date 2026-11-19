"use client";
import { useRef } from "react";
import { NavMenu } from "./nav-menu";
import { CommandPalette } from "./command-palette";
import { ThemeSwitch } from "./theme-switch";
import { signOut } from "@/app/(auth)/actions";

/** Phone menu: the same groups, submenus and hints as the sidebar, in a dropdown that closes after you pick. */
export function MobileMenu({ isAdmin, projects, staffQueue }: { isAdmin: boolean; projects: { id: string; name: string }[]; staffQueue: number }) {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={ref} className="relative">
      <summary className="btn btn-secondary min-h-11 cursor-pointer list-none">Menu</summary>
      <div className="absolute right-0 z-40 mt-2 max-h-[75vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-xl">
        <div className="mb-3 px-1"><CommandPalette projects={projects} isAdmin={isAdmin} /></div>
        <NavMenu isAdmin={isAdmin} staffQueue={staffQueue} onNavigate={() => { if (ref.current) ref.current.open = false; }} />
        <div className="mt-2 px-3"><ThemeSwitch /></div>
        <form action={signOut} className="mt-2 border-t border-border px-3 pt-2"><button className="min-h-10 text-sm font-semibold hover:underline">Sign out</button></form>
      </div>
    </details>
  );
}
