"use server";
import { revalidatePath } from "next/cache";
import { loadProject } from "@/lib/project";
import { parseSelection, visualEditInstruction, VISUAL_REQUEST_MAX } from "@/lib/design/bridge";
import { sendMessage } from "./actions";
import type { ActionResult } from "@/components/action-form";

/** Re-validates the Design-mode selection on the server and posts a scoped instruction to the thread. */
export async function requestVisualEdit(prev: ActionResult, form: FormData): Promise<ActionResult> {
  const projectId = String(form.get("projectId") ?? "");
  const request = String(form.get("request") ?? "").trim();
  if (!request || request.length > VISUAL_REQUEST_MAX) return { ok: false, message: `Describe the change in 1–${VISUAL_REQUEST_MAX} characters.` };
  let raw: unknown;
  try { raw = JSON.parse(String(form.get("selection") ?? "")); } catch { return { ok: false, message: "Select an element in the preview first." }; }
  const selection = parseSelection(raw);
  if (!selection) return { ok: false, message: "That selection isn't valid. Select the element again." };
  const { can, project } = await loadProject(projectId);
  if (!can("project.write")) return { ok: false, message: "You can't change this project." };
  const next = new FormData();
  next.set("projectId", project.id);
  next.set("content", visualEditInstruction(selection, request));
  const result = await sendMessage(prev, next);
  revalidatePath(`/projects/${project.id}`);
  return result;
}
