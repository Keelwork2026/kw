import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { OAuthButtons } from "@/components/oauth-buttons";
import { onboardingParams } from "@/lib/auth/redirect";
import { signUp } from "../actions";

export const metadata = { title: "Get started" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const carry = onboardingParams(await searchParams);
  const next = new URLSearchParams({ ...(carry.prompt ? { prompt: carry.prompt } : {}), ...(carry.template ? { template: carry.template } : {}), ...(carry.name ? { name: carry.name } : {}) });
  return (
    <>
      <h1 className="text-3xl">Start building <span className="font-serif font-normal italic">for free</span></h1>
      <p className="mt-1 text-muted">No credit card. Your code, always.</p>
      {carry.prompt ? (
        <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm"><span className="font-semibold">{carry.name ? `${carry.name}:` : "Your idea:"}</span> {carry.prompt.length > 220 ? `${carry.prompt.slice(0, 220)}…` : carry.prompt}</p>
      ) : null}
      <OAuthButtons next={`/new-project${next.size ? `?${next}` : ""}`} />
      <AuthForm
        action={signUp}
        submitLabel="Create account"
        hidden={{ prompt: carry.prompt, template: carry.template, name: carry.name }}
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password (10+ characters)", type: "password", autoComplete: "new-password", minLength: 10 },
        ]}
      />
      <p className="mt-6 text-sm">Already have an account? <Link className="font-semibold text-accent hover:underline" href="/sign-in">Log in</Link></p>
    </>
  );
}
