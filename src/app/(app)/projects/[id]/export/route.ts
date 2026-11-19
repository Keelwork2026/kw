import { createHash } from "node:crypto";
import { loadProject } from "@/lib/project";
import { createServiceClient } from "@/lib/supabase/server";
import { brokerConfig, createBrokerClient, sandboxIdFor } from "@/lib/sandbox/client";
import { lsFilesArgs } from "@/lib/code/git";
import { parseEntries } from "@/lib/code/tree";
import { collectForExport, shouldInclude, envReadme } from "@/lib/export/collect";
import { createZip } from "@/lib/export/zip";
import { loadMasterKeys } from "@/lib/secrets/vault";
import { decryptProjectSecrets } from "@/lib/secrets/load";

export const dynamic = "force-dynamic";

function page(status: number, title: string, body: string) {
  const html = `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font-family:system-ui;max-width:640px;margin:4rem auto;padding:0 1rem;color:#1c1b19;background:#fbf8f4"><h1>${title}</h1>${body}<p><a href="javascript:history.back()">Back</a></p></body>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Exports the full source as a ZIP. Any credential in any file blocks the export. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, project, can } = await loadProject(id);
  if (!can("project.read")) return page(403, "Not allowed", "<p>You can't export this project.</p>");
  const cfg = brokerConfig();
  if (!cfg) return page(503, "Export isn't available", "<p>The sandbox service isn't connected to this installation, so the source can't be read.</p>");
  const broker = createBrokerClient(cfg);
  const sb = sandboxIdFor(project.id);
  const ls = await broker.exec(sb, lsFilesArgs()).catch(() => null);
  if (!ls) return page(503, "Export isn't available", "<p>The project's sandbox isn't running. Start it from the builder, then export again.</p>");
  const paths = parseEntries(ls.stdout).filter(shouldInclude);
  const files = await Promise.all(paths.map(async (p) => ({ path: p, content: await broker.readFileBytes(sb, p).catch(() => Buffer.alloc(0)) })));

  let known: string[] = [];
  const names: string[] = [];
  try {
    const keys = loadMasterKeys(process.env.SECRETS_MASTER_KEYS);
    if (keys) for (const env of ["development", "preview", "production"] as const) {
      const s = await decryptProjectSecrets(createServiceClient(), project.id, env, keys);
      known = known.concat(Object.values(s));
      names.push(...Object.keys(s).filter((n) => !/^(CLOUDFLARE_|VERCEL_TOKEN$)/.test(n)));
    }
  } catch { /* scanning still runs with the pattern rules */ }

  const collected = collectForExport(files, known);
  if (!collected.ok) {
    if (collected.reason === "limits") return page(413, "The project is too large to export", `<p>${esc(collected.message)}.</p>`);
    return page(409, "Export blocked: credentials found", `<p>Remove these from the code (and rotate them), then export again. Values are masked.</p><ul>${collected.findings.map((f) => `<li><strong>${esc(f.title)}</strong> in <code>${esc(f.file)}:${f.line}</code> — <code>${esc(f.masked)}</code></li>`).join("")}</ul>`);
  }
  const zip = createZip([...collected.files.map((f) => ({ name: f.path, data: f.content })), { name: "KEELWORK_EXPORT.md", data: envReadme(project.name, names) }]);
  const sha = createHash("sha256").update(zip).digest("hex");
  const { error } = await supabase.rpc("record_export", { p_project: project.id, p_files: collected.files.length, p_bytes: zip.length, p_sha256: sha });
  if (error) return page(403, "Not allowed", "<p>Exports are available to the organization's members.</p>");
  const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project"}-source.zip`;
  return new Response(new Uint8Array(zip), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store", "X-Content-SHA256": sha } });
}
