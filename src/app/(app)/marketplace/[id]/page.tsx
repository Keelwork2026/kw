import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { isUuid } from "@/lib/nav";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { installItem } from "../actions";

export default async function MarketplaceItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase, org, can } = await requireOrg();
  const { data: item } = await supabase.from("marketplace_items").select("id, title, description, category, status, reviewed_at").eq("id", id).maybeSingle();
  if (!item) notFound();
  const { data: version } = await supabase.from("marketplace_versions").select("version, manifest").eq("item_id", id).order("version", { ascending: false }).limit(1).maybeSingle();
  const manifest = (version?.manifest ?? []) as { path: string; size: number }[];
  return (
    <>
      <PageHeader title={item.title} description={item.description} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="panel p-5"><h2 className="text-lg">Files ({manifest.length})</h2>
          <ul className="mt-2 max-h-96 overflow-auto font-mono text-xs">{manifest.map((f) => <li key={f.path} className="flex justify-between gap-2 py-0.5"><span className="truncate">{f.path}</span><span className="text-muted">{(f.size / 1024).toFixed(1)} KB</span></li>)}</ul>
        </section>
        {item.status === "approved" && can("project.write") ? (
          <section className="card" aria-labelledby="install"><h2 id="install" className="text-lg">Install into {org.name}</h2>
            <ActionForm action={installItem} submitLabel="Create project from template" submitClassName="btn btn-gradient" className="mt-3">
              <input type="hidden" name="itemId" value={item.id} />
              <label className="label" htmlFor="name">Project name</label><input id="name" name="name" defaultValue={item.title} maxLength={80} className="input" />
            </ActionForm>
          </section>
        ) : <p className="text-sm text-muted">{item.status === "approved" ? "You need write access to install templates." : `This template is ${item.status.replace("_", " ")}.`}</p>}
      </div>
    </>
  );
}
