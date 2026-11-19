import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { onboardingParams } from "@/lib/auth/redirect";
import { createProject } from "./actions";
import Link from "next/link";
import { STARTERS, starterHref } from "@/lib/site/starters";
import { TemplatePreview } from "@/components/site/template-preview";

export const metadata = { title: "Create Project" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { org, can } = await requireOrg();
  const carry = onboardingParams(await searchParams);
  if (!can("project.write")) {
    return (<><PageHeader title="Create Project" /><EmptyState title="You can't create projects here">Your role in {org.name} is read-only. Ask an owner or admin for the member role.</EmptyState></>);
  }
  return (
    <>
      <PageHeader title="Create Project" description="Describe what you want. The Software Architect plans it with you before anything is built." />
      <ActionForm action={createProject} submitLabel="Create and start planning" submitClassName="btn btn-gradient" className="card grid max-w-2xl gap-4">
        {carry.template ? <input type="hidden" name="template" value={carry.template} /> : null}
        <div>
          <label className="label" htmlFor="name">Project name</label>
          <input id="name" name="name" required maxLength={80} className="input" placeholder="Studio Bookings" defaultValue={carry.name ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="prompt">What should it do?</label>
          <textarea id="prompt" name="prompt" rows={6} maxLength={2000} className="input" defaultValue={carry.prompt ?? ""} placeholder="A booking app for my yoga studio with class passes and card payments" />
          <p className="mt-1 text-xs text-muted">Up to 2000 characters. You&apos;ll choose the backend and hosting before the first build.</p>
        </div>
        {carry.template ? <p className="text-sm text-muted">Starting from the <strong>{carry.template}</strong> template.</p> : null}
      </ActionForm>
      <section aria-labelledby="start-from" className="mt-10">
        <div className="flex items-end justify-between gap-3"><h2 id="start-from" className="text-xl">Or start from a template</h2><Link href="/templates#starters" className="text-sm font-semibold text-accent">See details →</Link></div>
        <p className="mt-1 text-sm text-muted">Fills in the name and a detailed brief. You can still change everything.</p>
        <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {STARTERS.map((s) => (
            <li key={s.slug}>
              <Link href={starterHref(s, true)} className="group block" title={s.tagline}>
                <TemplatePreview starter={s} className="rounded-xl border border-border transition group-hover:-translate-y-0.5" />
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
