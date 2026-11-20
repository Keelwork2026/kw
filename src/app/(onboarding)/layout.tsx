import { Logo } from "@/components/logo";

/** A focused layout for the welcome flow: no sidebar, nothing else competing for attention. */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-8 sm:py-12">
      <div aria-hidden className="kw-blob-a pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
      <div aria-hidden className="kw-blob-b pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-accent-2/15 blur-3xl" />
      <div className="relative mx-auto w-full max-w-3xl">
        <div className="mb-8"><Logo /></div>
        {children}
      </div>
    </main>
  );
}
