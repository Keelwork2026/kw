import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { forgotPassword } from "../actions";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-3xl">Reset your password</h1>
      <p className="mt-1 text-muted">We&apos;ll email you a link to choose a new one.</p>
      <div className="mt-6">
        <AuthForm action={forgotPassword} submitLabel="Send reset link" fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]} />
      </div>
      <p className="mt-6 text-sm"><Link className="font-semibold text-accent hover:underline" href="/sign-in">Back to log in</Link></p>
    </>
  );
}
