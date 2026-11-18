import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { MfaPanel } from "./mfa-panel";
import { changePassword, signOutOthers } from "../actions";

export const metadata = { title: "Security" };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  await requireOrg();
  const { reset } = await searchParams;
  return (
    <>
      <PageHeader title="Security" description="Protect your account." />
      {reset ? <p className="notice mb-6" role="status">You&apos;re signed in from your reset link. Choose a new password below.</p> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6" aria-labelledby="pw">
          <h2 id="pw" className="text-xl">Change password</h2>
          <ActionForm action={changePassword} submitLabel="Change password" className="mt-4 grid gap-3">
            <div><label className="label" htmlFor="password">New password</label><input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" className="input" /></div>
            <div><label className="label" htmlFor="confirm">Repeat it</label><input id="confirm" name="confirm" type="password" minLength={10} required autoComplete="new-password" className="input" /></div>
          </ActionForm>
        </section>
        <MfaPanel />
        <section className="panel p-6" aria-labelledby="sessions">
          <h2 id="sessions" className="text-xl">Sessions</h2>
          <p className="mt-1 text-sm text-muted">Signs out every other browser and device. This one stays signed in.</p>
          <ActionForm action={signOutOthers} submitLabel="Sign out other sessions" submitClassName="btn btn-secondary" />
        </section>
      </div>
    </>
  );
}
