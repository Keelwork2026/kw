import { ActionForm } from "@/components/action-form";
import { createOrganization } from "@/app/(app)/settings/actions";
import { signOut } from "../actions";

export const metadata = { title: "No organization" };

export default function NoOrganizationPage() {
  return (
    <>
      <h1 className="text-3xl">You&apos;re not in an organization</h1>
      <p className="mt-2 text-muted">Your membership may have been removed or suspended. Create a new organization, or ask an owner to invite you again.</p>
      <ActionForm action={createOrganization} submitLabel="Create organization" submitClassName="btn btn-gradient w-full" className="mt-6">
        <label className="label" htmlFor="name">Organization name</label>
        <input id="name" name="name" className="input" required maxLength={80} />
      </ActionForm>
      <form action={signOut} className="mt-4"><button className="text-sm font-semibold text-muted hover:underline">Sign out</button></form>
    </>
  );
}
