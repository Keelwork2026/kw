import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { sectionBySlug } from "@/lib/nav";
import { MENU, pickerTarget } from "@/lib/menu";
import { PageHeader, EmptyState, StatusPill } from "@/components/page-header";

type PickerParams = { to?: string; at?: string; q?: string };

/**
 * Org-level section pages list the organization's projects and link to that
 * project's tab. A submenu can name a different tab and a section on it
 * (?to=database&at=migrations); with a single project, it goes straight there.
 */
export async function SectionPicker({ slug, extra, searchParams }: { slug: string; extra?: React.ReactNode; searchParams?: PickerParams }) {
  const section = sectionBySlug(slug)!;
  const { supabase, org } = await requireOrg();
  const { data } = await supabase.from("projects").select("id, name, status, backend, deploy_target").eq("org_id", org.id).neq("status", "archived").order("updated_at", { ascending: false });
  const target = pickerTarget(searchParams ?? {});
  const tab = target ? target.tab : section.projectTab ?? "";
  const suffix = `${tab ? `/${tab}` : ""}${target?.query ? `?${target.query}` : ""}${target?.at ? `#${target.at}` : ""}`;
  const sub = target ? MENU.flatMap((g) => g.items).find((i) => i.slug === slug)?.children?.find((c) => "tab" in c.to && (c.to.tab || "") === tab && (c.to.at ?? null) === target.at) : undefined;
  if (target && data?.length === 1) redirect(`/projects/${data[0]!.id}${suffix}`);
  return (
    <>
      <PageHeader title={section.label} description={sub ? `${sub.label}: ${sub.hint}. Choose a project.` : `${section.description} Choose a project.`} />
      {extra}
      {data?.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}${suffix}`} className="panel flex items-center justify-between gap-3 p-5 hover:border-accent">
                <span><span className="block font-semibold">{p.name}</span><span className="font-mono text-xs text-muted">{p.backend} · {p.deploy_target}</span></span>
                <StatusPill status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No projects yet"><Link className="font-semibold text-accent" href="/new-project">Create a project</Link> to use {section.label}.</EmptyState>}
    </>
  );
}
