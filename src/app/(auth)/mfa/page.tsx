import { AuthForm } from "@/components/auth-form";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { verifyMfa, signOut } from "../actions";

export const metadata = { title: "Two-step verification" };

export default async function MfaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = safeRedirectPath((await searchParams).next);
  return (
    <>
      <h1 className="text-3xl">Two-step verification</h1>
      <p className="mt-1 text-muted">Enter the 6-digit code from your authenticator app.</p>
      <div className="mt-6">
        <AuthForm action={verifyMfa} submitLabel="Verify" hidden={{ next }} fields={[{ name: "code", label: "Code", type: "text", autoComplete: "one-time-code" }]} />
      </div>
      <form action={signOut} className="mt-4"><button className="text-sm font-semibold text-muted hover:underline">Use a different account</button></form>
    </>
  );
}
