import Link from "next/link";
import { loadProject } from "@/lib/project";
import { brokerConfig, createBrokerClient, sandboxIdFor } from "@/lib/sandbox/client";
import { buildTree, parseEntries, languageFor, isMigrationPath, type TreeNode } from "@/lib/code/tree";
import { lsFilesArgs, logArgs, showArgs, fileAtArgs, parseLog, parseDiff, sha256, SHA_RE } from "@/lib/code/git";
import { checkPath } from "@/lib/agents/policy";
import { ActionForm } from "@/components/action-form";
import { StatusPill, timeAgo } from "@/components/page-header";
import { saveFile } from "./actions";
import { CodeEditor } from "@/components/code-editor";

export const metadata = { title: "Code" };

export default async function CodePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ path?: string; commit?: string; at?: string; new?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, project, can } = await loadProject(id);
  const cfg = brokerConfig();
  const { data: sandbox } = await supabase.from("sandboxes").select("status").eq("project_id", project.id).maybeSingle();
  if (!cfg || sandbox?.status !== "running") {
    return (
      <div className="card max-w-xl">
        <p className="font-semibold">{!cfg ? "The sandbox service isn't connected to this installation." : "This project's sandbox isn't running."}</p>
        <p className="mt-1 text-sm text-muted">The Code view reads files from the sandbox. {cfg ? "Start it from the builder." : ""}</p>
        <Link href={`/projects/${project.id}`} className="btn btn-secondary mt-4">Back to the builder</Link>
      </div>
    );
  }
  const broker = createBrokerClient(cfg);
  const sb = sandboxIdFor(project.id);
  const path = sp.path && checkPath(sp.path) === null ? sp.path : null;
  const commit = sp.commit && SHA_RE.test(sp.commit) ? sp.commit : null;
  const at = sp.at && SHA_RE.test(sp.at) ? sp.at : null;
  const newPath = sp.new && checkPath(sp.new, { write: true }) === null ? sp.new : null;
  const editingPath = newPath ?? path;

  const [ls, log, edits] = await Promise.all([
    broker.exec(sb, lsFilesArgs()).catch(() => null),
    broker.exec(sb, logArgs(path)).catch(() => null),
    supabase.from("code_edits").select("id, path, status, created_at, commit_sha").eq("project_id", project.id).order("created_at", { ascending: false }).limit(8),
  ]);
  const tree = buildTree(parseEntries(ls?.stdout ?? ""), editingPath);
  const history = parseLog(log?.stdout ?? "");

  let content: string | null = null, currentSha = "", diff: ReturnType<typeof parseDiff> | null = null;
  if (commit) {
    const out = await broker.exec(sb, showArgs(commit, path)).catch(() => null);
    diff = out ? parseDiff(out.stdout) : null;
  } else if (newPath) {
    content = "";
  } else if (path) {
    const current = await broker.readFile(sb, path).catch(() => null);
    currentSha = current === null ? "" : sha256(current);
    content = at ? (await broker.exec(sb, fileAtArgs(at, path)).catch(() => null))?.stdout ?? null : current;
  }
  const writable = can("project.write");

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
      <nav aria-label="Files" className="panel max-h-[75vh] overflow-auto p-3 text-sm">
        {writable ? (
          <form className="mb-3 flex gap-1.5" action={`/projects/${project.id}/code`}>
            <label htmlFor="new" className="sr-only">New file path</label>
            <input id="new" name="new" placeholder="app/about/page.tsx" className="input min-h-9 flex-1 py-0 text-xs" pattern="[A-Za-z0-9_.@()\[\]\-]+(/[A-Za-z0-9_.@()\[\]\-]+)*" />
            <button className="btn btn-secondary min-h-9 px-3 text-xs">New</button>
          </form>
        ) : null}
        <Tree nodes={tree} projectId={project.id} current={editingPath} />
      </nav>

      <section className="panel min-w-0 p-4" aria-label="Editor">
        {diff ? (
          <>
            <p className="mb-2 text-sm"><strong>{diff.header?.subject ?? commit}</strong> <span className="text-muted">· {diff.header?.author} · {diff.header ? timeAgo(new Date(diff.header.time).toISOString()) : ""}</span></p>
            <pre className="max-h-[70vh] overflow-auto rounded-xl border border-border font-mono text-xs leading-5">
              {diff.lines.map((l, i) => <div key={i} className={`px-3 ${l.kind === "add" ? "diff-add" : l.kind === "del" ? "diff-del" : l.kind === "hunk" ? "diff-hunk" : l.kind === "meta" ? "text-muted" : ""}`}>{l.text || " "}</div>)}
            </pre>
            {diff.truncated ? <p className="mt-2 text-xs text-muted">The diff is larger than 200 KB; it&apos;s cut off here.</p> : null}
          </>
        ) : editingPath && content !== null ? (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <code className="font-mono">{editingPath}</code><span className="pill bg-surface-2">{languageFor(editingPath)}</span>
              {isMigrationPath(editingPath) ? <span className="pill bg-[#fff6d6] text-[#8a6100]">Migration — apply it from the Database tab</span> : null}
            </div>
            {at ? <p className="notice mb-2">You&apos;re looking at {editingPath} as it was in commit {at.slice(0, 7)}. Saving restores this version as a new commit.</p> : null}
            {writable ? (
              <ActionForm action={saveFile} submitLabel={at ? "Restore this version" : newPath ? "Create file" : "Save and commit"} pendingLabel="Saving…">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="path" value={editingPath} />
                <input type="hidden" name="baseSha" value={currentSha} />
                {at ? <input type="hidden" name="restoring" value={at} /> : null}
                <CodeEditor key={`${editingPath}@${at ?? currentSha}`} id="content" name="content" value={content} language={languageFor(editingPath)} label={`Contents of ${editingPath}`} />
              </ActionForm>
            ) : (
              <CodeEditor key={`${editingPath}@${at ?? "ro"}`} id="content" value={content} language={languageFor(editingPath)} label={`Contents of ${editingPath} (read only)`} readOnly />
            )}
          </>
        ) : <p className="text-sm text-muted">{path ? "That file couldn't be read." : "Choose a file, or create one with New."}</p>}
      </section>

      <aside className="grid content-start gap-4" aria-label="History">
        <section className="panel p-4">
          <h2 className="text-base">History{path ? ` of ${path.split("/").pop()}` : ""}</h2>
          <ul className="mt-2 grid gap-2 text-sm">
            {history.length ? history.map((h) => (
              <li key={h.sha}>
                <p className="truncate font-medium" title={h.subject}>{h.subject}</p>
                <p className="text-xs text-muted">{h.author} · {timeAgo(new Date(h.time).toISOString())} · <code>{h.sha.slice(0, 7)}</code></p>
                <p className="text-xs"><Link className="font-semibold text-accent" href={`/projects/${project.id}/code?commit=${h.sha}${path ? `&path=${encodeURIComponent(path)}` : ""}`}>Changes</Link>{path ? <> · <Link className="font-semibold text-accent" href={`/projects/${project.id}/code?path=${encodeURIComponent(path)}&at=${h.sha}`}>Open this version</Link></> : null}</p>
              </li>
            )) : <li className="text-muted">No commits yet.</li>}
          </ul>
        </section>
        <section className="panel p-4">
          <h2 className="text-base">Recent hand edits</h2>
          <ul className="mt-2 grid gap-2 text-sm">
            {edits.data?.length ? edits.data.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2"><span className="truncate font-mono text-xs" title={e.path}>{e.path}</span><StatusPill status={e.status} /></li>
            )) : <li className="text-muted">None yet.</li>}
          </ul>
        </section>
      </aside>
    </div>
  );
}

function Tree({ nodes, projectId, current }: { nodes: TreeNode[]; projectId: string; current: string | null }) {
  return (
    <ul className="grid gap-0.5">
      {nodes.map((n) => n.type === "dir" ? (
        <li key={n.path}>
          <details open={n.open}>
            <summary className="flex min-h-8 cursor-pointer items-center rounded-lg px-1.5 font-medium hover:bg-surface-2">{n.name}/</summary>
            <div className="ml-3 border-l border-border pl-2"><Tree nodes={n.children ?? []} projectId={projectId} current={current} /></div>
          </details>
        </li>
      ) : (
        <li key={n.path}>
          <Link href={`/projects/${projectId}/code?path=${encodeURIComponent(n.path)}`} aria-current={current === n.path ? "page" : undefined} className={`flex min-h-8 items-center truncate rounded-lg px-1.5 font-mono text-xs hover:bg-surface-2 ${current === n.path ? "bg-soft-accent text-soft-accent-ink" : ""}`}>{n.name}</Link>
        </li>
      ))}
    </ul>
  );
}
