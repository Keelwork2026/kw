"use server";
import { revalidatePath } from "next/cache";
import { loadProject } from "@/lib/project";
import { brokerConfig, createBrokerClient, sandboxIdFor, type BrokerClient } from "@/lib/sandbox/client";
import { addArgs, commitArgs } from "@/lib/code/git";
import { CAPTURE_SCRIPT } from "@/lib/media/capture-script";
import { MANIFEST, MAX_FILES, MEDIA_DIRS, VIEWPORTS, isMediaPath, parseManifest, parseShotPaths, safeName, serializeManifest, shotName, upsertEntry, validateUpload, type MediaEntry } from "@/lib/media/media";
import type { ActionResult } from "@/components/action-form";

const fail = (message: string): ActionResult => ({ ok: false, message });
const today = () => new Date().toISOString().slice(0, 10);

async function setup(form: FormData) {
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.write")) return { error: "You can't change this project's images." } as const;
  const cfg = brokerConfig();
  if (!cfg) return { error: "The sandbox service isn't connected to this installation." } as const;
  const { data: sandbox } = await supabase.from("sandboxes").select("status").eq("project_id", project.id).maybeSingle();
  if (sandbox?.status !== "running") return { error: "Start the project's sandbox first (Build tab → Preview)." } as const;
  const { data: { user } } = await supabase.auth.getUser();
  const author = { name: String(user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "Keelwork user"), email: user?.email ?? "user@keelwork.invalid" };
  return { project, broker: createBrokerClient(cfg), sb: sandboxIdFor(project.id), author } as const;
}

async function readManifest(broker: BrokerClient, sb: string): Promise<MediaEntry[]> {
  return parseManifest(await broker.readFile(sb, MANIFEST).catch(() => null));
}

async function commit(broker: BrokerClient, sb: string, author: { name: string; email: string }, message: string, paths: string[]) {
  for (const p of paths) await broker.exec(sb, addArgs(p)).catch(() => undefined);
  for (const p of paths) await broker.exec(sb, commitArgs(message, author, p)).catch(() => undefined);
}

/** Uploads one photo the owner provides, with alt text, into public/images. */
export async function uploadImage(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Choose an image to upload.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const alt = String(form.get("alt") ?? "");
  const v = validateUpload({ bytes, name: file.name, alt, rights: form.get("rights") === "yes" });
  if (!v.ok) return fail(v.error);
  const s = await setup(form);
  if ("error" in s) return fail(s.error!);
  const entries = await readManifest(s.broker, s.sb);
  if (entries.length >= MAX_FILES) return fail(`This project already has ${MAX_FILES} images. Remove some first.`);
  const name = safeName(file.name, v.type, entries.map((e) => e.file.split("/").pop()!));
  const path = `${MEDIA_DIRS.upload}/${name}`;
  try {
    await s.broker.writeFile(s.sb, path, Buffer.from(bytes));
    await s.broker.writeFile(s.sb, MANIFEST, serializeManifest(upsertEntry(entries, { file: path, alt: alt.trim(), source: "upload", added: today() })));
    await commit(s.broker, s.sb, s.author, `Add image ${name}`, [path, MANIFEST]);
  } catch (e) {
    return fail(`Couldn't save the image: ${(e as Error).message}`);
  }
  revalidatePath(`/projects/${s.project.id}/media`);
  return { ok: true, message: `Added ${name}. The agents will use it where it fits; you can also ask for it by name.` };
}

/** Takes real screenshots of the running app and saves them in public/screenshots. */
export async function captureScreenshots(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const paths = parseShotPaths(String(form.get("paths") ?? ""));
  if (!paths) return fail("List up to 6 pages of your app, like / /pricing /book.");
  const sizes = Object.entries(VIEWPORTS).filter(([k]) => form.get(k) === "on").map(([, w]) => w);
  if (!sizes.length) return fail("Choose at least one screen size.");
  const s = await setup(form);
  if ("error" in s) return fail(s.error!);
  const shots = paths.flatMap((p) => sizes.map((w) => ({ path: p, width: w, file: `${MEDIA_DIRS.screenshot}/${shotName(p, w)}` })));
  try {
    await s.broker.writeFile(s.sb, ".keelwork/media/config.json", JSON.stringify({ base: "http://127.0.0.1:3000", shots }));
    await s.broker.writeFile(s.sb, ".keelwork/media/capture.mjs", CAPTURE_SCRIPT);
    await s.broker.exec(s.sb, ["node", ".keelwork/media/capture.mjs"]);
    const out = JSON.parse(await s.broker.readFile(s.sb, ".keelwork/media/out.json")) as { available: boolean; reason: string | null; shots: { path: string; width: number; file: string; ok: boolean; status: number | null }[] };
    if (!out.available) return fail(out.reason === "no-browser" ? "This sandbox has no browser runtime, so screenshots can't be taken. Ask your administrator to run sandboxes with the keelwork/runtime-browser image." : out.reason ?? "The browser didn't start.");
    const good = out.shots.filter((x) => x.ok);
    const bad = out.shots.filter((x) => !x.ok);
    if (!good.length) return fail(`No screenshots were taken: ${bad.map((b) => `${b.path} (${b.status ?? "didn't load"})`).join(", ")}. Check the preview shows these pages.`);
    let entries = await readManifest(s.broker, s.sb);
    for (const g of good) entries = upsertEntry(entries, { file: g.file, alt: `Screenshot of the ${g.path === "/" ? "home page" : `${g.path} page`} on ${g.width < 500 ? "a phone" : g.width < 1000 ? "a tablet" : "a desktop"}`, source: "screenshot", width: g.width, added: today() });
    await s.broker.writeFile(s.sb, MANIFEST, serializeManifest(entries));
    await commit(s.broker, s.sb, s.author, `Capture ${good.length} screenshot${good.length === 1 ? "" : "s"}`, [MEDIA_DIRS.screenshot, MANIFEST]);
    revalidatePath(`/projects/${s.project.id}/media`);
    return { ok: true, message: `Saved ${good.length} screenshot${good.length === 1 ? "" : "s"}${bad.length ? `; ${bad.length} page${bad.length === 1 ? "" : "s"} didn't load (${bad.map((b) => b.path).join(", ")})` : ""}.` };
  } catch (e) {
    return fail(`Couldn't take screenshots: ${(e as Error).message}`);
  }
}

/** Removes one image Media manages (and its manifest entry). The file stays in git history. */
export async function removeImage(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const path = String(form.get("path") ?? "");
  if (!isMediaPath(path)) return fail("That file isn't managed here.");
  const s = await setup(form);
  if ("error" in s) return fail(s.error!);
  try {
    await s.broker.deleteFile(s.sb, path, true);
    const entries = (await readManifest(s.broker, s.sb)).filter((e) => e.file !== path);
    await s.broker.writeFile(s.sb, MANIFEST, serializeManifest(entries));
    await commit(s.broker, s.sb, s.author, `Remove image ${path.split("/").pop()}`, [path, MANIFEST]);
  } catch (e) {
    return fail(`Couldn't remove it: ${(e as Error).message}`);
  }
  revalidatePath(`/projects/${s.project.id}/media`);
  return { ok: true, message: "Removed. Pages that used it will need another image — check the preview." };
}
