import { loadProject } from "@/lib/project";
import { brokerConfig, createBrokerClient, sandboxIdFor } from "@/lib/sandbox/client";
import { isMediaPath, sniffImage } from "@/lib/media/media";

/** Serves one of the project's own images to people who can read the project (for the Media tab). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!isMediaPath(path)) return new Response("Not found", { status: 404 });
  const { project, can } = await loadProject(id);
  if (!can("project.read")) return new Response("Not found", { status: 404 });
  const cfg = brokerConfig();
  if (!cfg) return new Response("Unavailable", { status: 503 });
  const bytes = await createBrokerClient(cfg).readFileBytes(sandboxIdFor(project.id), path).catch(() => null);
  const type = bytes ? sniffImage(bytes) : null;
  if (!bytes || !type) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": `image/${type}`, "Cache-Control": "private, max-age=60", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" },
  });
}
