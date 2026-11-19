import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { OAuthButtons } from "@/components/oauth-buttons";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { signIn } from "../actions";

export const metadata = { title: "Log in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeRedirectPath(sp.next);
  return (
    <>
      <h1 className="text-3xl">Welcome back</h1>
      <p className="mt-1 text-muted">Log in to keep building.</p>
      {sp.error ? <p role="alert" className="notice mt-4">Sign-in with that provider didn&apos;t complete. Try again or use your email.</p> : null}
      <OAuthButtons next={next} />
      <AuthForm
        action={signIn}
        submitLabel="Log in"
        hidden={{ next }}
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />
      <div className="mt-6 flex justify-between text-sm">
        <Link className="font-semibold text-accent underline-offset-4 hover:underline" href="/forgot-password">Forgot password?</Link>
        <Link className="font-semibold text-accent underline-offset-4 hover:underline" href="/sign-up">Create an account</Link>
      </div>
    </>
  );
}
