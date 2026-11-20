import { Logo } from "@/components/logo";
import { SimpleToggle } from "@/components/simple/toggle";
import { SimpleGuide } from "@/components/simple/guide";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-12">
      <div aria-hidden className="kw-blob-a pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      <div aria-hidden className="kw-blob-b pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-accent-2/20 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-between gap-3"><Logo /><SimpleToggle compact /></div>
        <SimpleGuide />
        <div className="card shadow-[0_30px_80px_-40px_rgba(11,31,58,0.35)]">{children}</div>
      </div>
    </main>
  );
}
