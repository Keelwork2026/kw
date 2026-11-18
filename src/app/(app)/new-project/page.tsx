import { requireOrg } from "@/lib/org";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { onboardingParams } from "@/lib/auth/redirect";
import { createProject } from "./actions";

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
          <input id="name" name="name" required maxLength={80} className="input" placeholder="Studio Bookings" />
        </div>
        <div>
          <label className="label" htmlFor="prompt">What should it do?</label>
          <textarea id="prompt" name="prompt" rows={6} maxLength={2000} className="input" defaultValue={carry.prompt ?? ""} placeholder="A booking app for my yoga studio with class passes and card payments" />
          <p className="mt-1 text-xs text-muted">Up to 2000 characters. You&apos;ll choose the backend and hosting before the first build.</p>
        </div>
        {carry.template ? <p className="text-sm text-muted">Starting from the <strong>{carry.template}</strong> template.</p> : null}
      </ActionForm>
    </>
  );
}
