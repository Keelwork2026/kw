import { oauthSignIn } from "@/app/(auth)/actions";
import { enabledProviders, type OAuthProvider } from "@/lib/auth/providers";

const LABELS: Record<OAuthProvider, string> = {
  google: "Continue with Google",
  azure: "Continue with Microsoft",
  github: "Continue with GitHub",
};

/**
 * OAuth buttons (only the providers AUTH_PROVIDERS enables), followed by the
 * "or" divider before the email form. Renders nothing when none are enabled.
 * Each button posts to a server action that starts the provider flow.
 */
export function OAuthButtons({ next }: { next?: string }) {
  const providers = enabledProviders(process.env.AUTH_PROVIDERS);
  if (!providers.length) return null;
  return (
    <>
      <div className="mt-6 grid gap-2">
        {providers.map((id) => (
          <form key={id} action={oauthSignIn}>
            <input type="hidden" name="provider" value={id} />
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <button type="submit" className="btn btn-secondary w-full">{LABELS[id]}</button>
          </form>
        ))}
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
    </>
  );
}
