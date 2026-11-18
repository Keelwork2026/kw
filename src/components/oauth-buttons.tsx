import { oauthSignIn } from "@/app/(auth)/actions";

const PROVIDERS = [
  { id: "google", label: "Continue with Google" },
  { id: "azure", label: "Continue with Microsoft" },
  { id: "github", label: "Continue with GitHub" },
] as const;

/** OAuth buttons. Each posts to a server action that starts the provider flow. */
export function OAuthButtons({ next }: { next?: string }) {
  return (
    <div className="grid gap-2">
      {PROVIDERS.map((p) => (
        <form key={p.id} action={oauthSignIn}>
          <input type="hidden" name="provider" value={p.id} />
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <button type="submit" className="btn btn-secondary w-full">{p.label}</button>
        </form>
      ))}
    </div>
  );
}
