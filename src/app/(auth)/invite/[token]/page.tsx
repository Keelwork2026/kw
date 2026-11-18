import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { ActionForm } from "@/components/action-form";
import { acceptInvitation } from "./actions";

export const metadata = { title: "Join an organization" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) redirect("/invite/invalid");
  const { user } = await getUser();
  if (!user) {
    return (
      <>
        <h1 className="text-3xl">You&apos;ve been invited</h1>
        <p className="mt-2 text-muted">Log in or create an account with the email address the invitation was sent to.</p>
        <div className="mt-6 grid gap-2">
          <Link className="btn btn-gradient" href={`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`}>Log in to accept</Link>
          <Link className="btn btn-secondary" href="/sign-up">Create an account</Link>
        </div>
      </>
    );
  }
  return (
    <>
      <h1 className="text-3xl">Join the organization</h1>
      <p className="mt-2 text-muted">You&apos;re signed in as <strong>{user.email}</strong>. Accepting adds you with the role you were invited with.</p>
      <ActionForm action={acceptInvitation} submitLabel="Accept invitation" submitClassName="btn btn-gradient w-full" className="mt-6">
        <input type="hidden" name="token" value={token} />
      </ActionForm>
    </>
  );
}
