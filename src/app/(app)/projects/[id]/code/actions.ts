"use server";
import { revalidatePath } from "next/cache";
import { loadProject } from "@/lib/project";
import { brokerConfig, createBrokerClient, sandboxIdFor } from "@/lib/sandbox/client";
import { checkPath } from "@/lib/agents/policy";
import { addArgs, commitArgs, headArgs, sha256 } from "@/lib/code/git";
import type { ActionResult } from "@/components/action-form";

/**
 * Saves a hand edit: begin_code_edit (refused while an agent holds the
 * file), an optimistic sha256 check against the current file, then a commit
 * authored by the person. Every outcome is recorded and audited.
 */
export async function saveFile(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const path = String(form.get("path") ?? "");
  const content = String(form.get("content") ?? "");
  const base = String(form.get("baseSha") ?? "");
  const restoring = String(form.get("restoring") ?? "");
  const why = checkPath(path, { write: true });
  if (why) return { ok: false, message: `That path can't be edited: ${why}.` };
  if (content.length > 1_000_000) return { ok: false, message: "Files are limited to 1 MB." };
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.write")) return { ok: false, message: "You can't edit this project." };
  const cfg = brokerConfig();
  if (!cfg) return { ok: false, message: "The sandbox service isn't connected, so files can't be saved." };

  const { data: editId, error } = await supabase.rpc("begin_code_edit", { p_project: project.id, p_path: path, p_base_sha256: /^[0-9a-f]{64}$/.test(base) ? base : null });
  if (error) return { ok: false, message: /agent is editing/.test(error.message) ? "An agent is editing this file right now. Try again when it finishes, or pause the build." : error.message };

  const broker = createBrokerClient(cfg);
  const sb = sandboxIdFor(project.id);
  const finish = (status: string, commit: string | null, err: string | null) => supabase.rpc("finish_code_edit", { p_edit: editId, p_status: status, p_commit_sha: commit, p_error: err });
  try {
    const current = await broker.readFile(sb, path).then((c) => sha256(c)).catch(() => null);
    if (current !== (base || null)) {
      await finish("conflict", null, "file changed since it was opened");
      return { ok: false, message: "This file changed since you opened it (probably an agent). Reload to see the latest version, then re-apply your change." };
    }
    await broker.writeFile(sb, path, content);
    const { data: { user } } = await supabase.auth.getUser();
    const author = { name: String(user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "Keelwork user"), email: user?.email ?? "user@keelwork.invalid" };
    await broker.exec(sb, addArgs(path));
    const message = restoring ? `Restore ${path} from ${restoring.slice(0, 7)}` : `Edit ${path} by hand`;
    const c = await broker.exec(sb, commitArgs(message, author, path));
    if (c.exitCode !== 0 && !/nothing to commit/.test(c.stdout + c.stderr)) throw new Error("git commit failed");
    const head = (await broker.exec(sb, headArgs())).stdout.trim();
    await finish("saved", /^[0-9a-f]{7,64}$/.test(head) ? head : null, null);
    revalidatePath(`/projects/${project.id}/code`);
    return { ok: true, message: `Saved and committed${head ? ` as ${head.slice(0, 7)}` : ""}.` };
  } catch (e) {
    await finish("failed", null, (e as Error).message);
    return { ok: false, message: `Couldn't save: ${(e as Error).message}` };
  }
}
