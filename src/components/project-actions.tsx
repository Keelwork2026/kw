"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ActionForm, type FormAction } from "./action-form";
import { Icon } from "./icons";

/**
 * "More actions" for a project card: rename, start a similar project (same
 * brief, new project), and archive for owners/admins. Closes on Escape or a
 * click outside; focus returns to the button.
 */
export function ProjectActions({ project, canWrite, canManage, rename, archive, duplicate }: {
  project: { id: string; name: string; description: string | null };
  canWrite: boolean; canManage: boolean; rename: FormAction; archive: FormAction; duplicate: FormAction;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "rename" | "archive" | "duplicate">("menu");
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!canWrite && !canManage) return null;
  const similar = `/new-project?name=${encodeURIComponent(`${project.name} (copy)`.slice(0, 80))}${project.description ? `&prompt=${encodeURIComponent(project.description)}` : ""}`;

  return (
    <div ref={box} className="relative">
      <button ref={btn} type="button" className="kw-icon-btn" aria-label={`More actions for ${project.name}`} data-tip="More actions"
        aria-expanded={open} aria-controls={id} onClick={() => { setOpen(!open); setMode("menu"); }}>
        <Icon name="more" />
      </button>
      {open ? (
        <div id={id} className="kw-fade absolute right-0 top-full z-30 mt-1 w-72 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          {mode === "menu" ? (
            <ul className="grid text-sm">
              {canWrite ? <li><button type="button" className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left hover:bg-surface-2" onClick={() => setMode("rename")}><Icon name="edit" size={18} />Rename</button></li> : null}
              {canWrite ? <li><button type="button" className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left hover:bg-surface-2" onClick={() => setMode("duplicate")}><Icon name="copy" size={18} />Duplicate with code</button></li> : null}
              {canWrite ? <li><Link href={similar} className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 hover:bg-surface-2"><Icon name="sparkles" size={18} />Start a similar project</Link></li> : null}
              {canManage ? <li><button type="button" className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-danger hover:bg-surface-2" onClick={() => setMode("archive")}><Icon name="archive" size={18} />Archive…</button></li> : null}
            </ul>
          ) : mode === "rename" ? (
            <ActionForm action={rename} submitLabel="Rename" submitClassName="btn btn-primary" className="grid gap-2 p-2">
              <input type="hidden" name="projectId" value={project.id} />
              <label className="label" htmlFor={`${id}-name`}>New name</label>
              <input id={`${id}-name`} name="name" required maxLength={80} defaultValue={project.name} className="input" autoFocus onFocus={(e) => e.currentTarget.select()} />
            </ActionForm>
          ) : mode === "duplicate" ? (
            <ActionForm action={duplicate} submitLabel="Duplicate" pendingLabel="Copying… this can take a minute" submitClassName="btn btn-primary" className="grid gap-2 p-2 text-sm">
              <input type="hidden" name="projectId" value={project.id} />
              <p className="font-semibold">Duplicate “{project.name}”</p>
              <p className="text-muted">Copies the brief, the stack and every source file into a new project, then installs its packages. Secrets aren&apos;t copied. The original&apos;s sandbox needs to be running.</p>
            </ActionForm>
          ) : (
            <ActionForm action={archive} submitLabel="Archive project" submitClassName="btn btn-secondary" className="grid gap-2 p-2 text-sm">
              <input type="hidden" name="projectId" value={project.id} />
              <p className="text-muted">Archiving makes it read-only and frees a slot in your plan. Code, history and deployments are kept.</p>
              <label className="label" htmlFor={`${id}-confirm`}>Type <strong>{project.name}</strong> to confirm</label>
              <input id={`${id}-confirm`} name="confirmName" required className="input" autoComplete="off" autoFocus />
            </ActionForm>
          )}
        </div>
      ) : null}
    </div>
  );
}
