import { loadProject } from "@/lib/project";
import { brokerConfig, createBrokerClient, sandboxIdFor } from "@/lib/sandbox/client";
import { MANIFEST, MAX_UPLOAD_BYTES, parseManifest, type MediaEntry } from "@/lib/media/media";
import { ActionForm } from "@/components/action-form";
import { Notice, EmptyState } from "@/components/page-header";
import { captureScreenshots, removeImage, uploadImage } from "./actions";

export const metadata = { title: "Media" };

export default async function MediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, project, can } = await loadProject(id);
  const cfg = brokerConfig();
  const { data: sandbox } = await supabase.from("sandboxes").select("status").eq("project_id", project.id).maybeSingle();
  const running = !!cfg && sandbox?.status === "running";
  const entries: MediaEntry[] = running ? parseManifest(await createBrokerClient(cfg!).readFile(sandboxIdFor(project.id), MANIFEST).catch(() => null)) : [];
  const uploads = entries.filter((e) => e.source === "upload");
  const shots = entries.filter((e) => e.source === "screenshot");
  const write = can("project.write") && running;
  const src = (e: MediaEntry) => `/api/projects/${project.id}/media?path=${encodeURIComponent(e.file)}`;

  const Grid = ({ list }: { list: MediaEntry[] }) => (
    <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((e) => (
        <li key={e.file} className="panel overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- served from the project's sandbox, sizes vary */}
          <img src={src(e)} alt={e.alt} loading="lazy" className="aspect-[4/3] w-full bg-surface-2 object-cover object-top" />
          <div className="p-3 text-sm">
            <p className="font-mono text-xs">{e.file.replace(/^public/, "")}</p>
            <p className="mt-1 text-muted">{e.alt}</p>
            {write ? (
              <ActionForm action={removeImage} submitLabel="Remove" pendingLabel="Removing…" submitClassName="btn btn-secondary min-h-9 px-3 text-sm" className="mt-1 [&>div]:mt-1">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="path" value={e.file} />
              </ActionForm>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid gap-8">
      <p className="max-w-3xl text-muted">Real images for your app: photos you own, and screenshots of the app itself for your landing page, app-store listing or docs. The agents use these files (with their descriptions) and never hotlink or invent stock photos.</p>
      {!running ? <Notice>{cfg ? "Start the project's sandbox (Build tab → Preview) to add or view images — they're stored in the app's code under public/." : "The sandbox service isn't connected to this installation."}</Notice> : null}

      <section aria-labelledby="photos" className="card">
        <h2 id="photos" className="text-xl">Your photos</h2>
        <p className="mt-1 text-sm text-muted">PNG, JPEG, WebP or GIF up to {MAX_UPLOAD_BYTES / 1_000_000} MB. Saved to <code>public/images</code> and committed.</p>
        {write ? (
          <ActionForm action={uploadImage} submitLabel="Upload photo" pendingLabel="Uploading…" className="mt-4 grid max-w-xl gap-3">
            <input type="hidden" name="projectId" value={project.id} />
            <div><label className="label" htmlFor="file">Image</label><input id="file" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className="input" /></div>
            <div><label className="label" htmlFor="alt">What does it show?</label><input id="alt" name="alt" required minLength={3} maxLength={200} placeholder="e.g. Our studio's main room with mats laid out" className="input" /><p className="mt-1 text-xs text-muted">Used as alt text for screen readers and search engines.</p></div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="rights" value="yes" required className="mt-1" /><span>I own this image or have permission to use it, and it shows no one who hasn&apos;t agreed to appear.</span></label>
          </ActionForm>
        ) : null}
        {uploads.length ? <Grid list={uploads} /> : running ? <div className="mt-4"><EmptyState icon="upload" title="No photos yet">Add photos of your place, products or team. Until then, pages show clearly marked placeholders.</EmptyState></div> : null}
      </section>

      <section aria-labelledby="shots" className="card">
        <h2 id="shots" className="text-xl">Product screenshots</h2>
        <p className="mt-1 text-sm text-muted">Keelwork opens your running preview in a headless browser and saves real PNG screenshots to <code>public/screenshots</code>. Re-capture after big changes so they stay accurate.</p>
        {write ? (
          <ActionForm action={captureScreenshots} submitLabel="Capture screenshots" pendingLabel="Capturing… (up to a minute)" className="mt-4 grid max-w-xl gap-3">
            <input type="hidden" name="projectId" value={project.id} />
            <div><label className="label" htmlFor="paths">Pages</label><input id="paths" name="paths" defaultValue="/" placeholder="/ /pricing /book" className="input font-mono" /><p className="mt-1 text-xs text-muted">Up to 6 paths, separated by spaces.</p></div>
            <fieldset><legend className="label">Screen sizes</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" name="desktop" defaultChecked /> Desktop (1440 px)</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="tablet" /> Tablet (820 px)</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="mobile" defaultChecked /> Phone (390 px)</label>
              </div>
            </fieldset>
          </ActionForm>
        ) : null}
        {shots.length ? <Grid list={shots} /> : running ? <div className="mt-4"><EmptyState icon="layout" title="No screenshots yet">Capture the pages you want to show off. Pages that need sign-in show their signed-out state.</EmptyState></div> : null}
      </section>
    </div>
  );
}
