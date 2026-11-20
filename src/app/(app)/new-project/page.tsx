import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { onboardingParams } from "@/lib/auth/redirect";
import { createProject } from "./actions";
import Link from "next/link";
import { STARTERS, starterHref } from "@/lib/site/starters";
import { TemplatePreview } from "@/components/site/template-preview";
import { entryBySlug } from "@/lib/catalog";
import { ProjectSetupFields } from "@/components/project-setup";

export const metadata = { title: "Create Project" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { org, can } = await requireOrg();
  const carry = onboardingParams(await searchParams);
  // A template link may carry only its slug; the brief comes from the catalogue.
  const entry = carry.template ? entryBySlug(carry.template) : undefined;
  if (entry) { carry.name ??= entry.name_for_project; carry.prompt ??= entry.brief; }
  if (!can("project.write")) {
    return (<><PageHeader title="Create Project" /><EmptyState icon="users" title="You can't create projects here">Your role in {org.name} is read-only. Ask an owner or admin for the member role.</EmptyState></>);
  }
  return (
    <>
      <PageHeader title="Create Project" description="Describe what you want. The Software Architect plans it with you before anything is built." />
      <ActionForm action={createProject} submitLabel="Create and start planning" pendingLabel="Creating your project…" submitClassName="btn btn-gradient" className="card grid max-w-5xl gap-4">
        {carry.template ? <input type="hidden" name="template" value={carry.template} /> : null}
        <ProjectSetupFields name={carry.name ?? ""} prompt={carry.prompt ?? ""} template={carry.template} />
        {carry.template ? <p className="text-sm text-muted">Starting from the <strong>{entry?.name ?? carry.template}</strong> template.</p> : null}
      </ActionForm>
      <section aria-labelledby="start-from" className="mt-10">
        <div className="flex items-end justify-between gap-3"><h2 id="start-from" className="text-xl">Or start from a template</h2><Link href="/templates#starters" className="text-sm font-semibold text-accent">See details →</Link></div>
        <p className="mt-1 text-sm text-muted">Fills in the name and a detailed brief. You can still change everything.</p>
        <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {STARTERS.map((s) => (
            <li key={s.slug}>
              <Link href={starterHref(s, true)} className="group block" title={s.tagline}>
                <TemplatePreview starter={s} className="rounded-xl border border-border transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[var(--kw-shadow-2)]" />
                <span className="mt-2 block truncate text-sm font-semibold group-hover:underline">{s.name}</span>
                <span className="block truncate text-xs text-muted">{s.tagline}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
