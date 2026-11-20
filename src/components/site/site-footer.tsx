import Link from "next/link";
import { Logo } from "../logo";
import { ThemeSwitch } from "../theme-switch";
import { FEATURES, SOLUTIONS, TUTORIALS } from "@/lib/site/content";

/** The public site's footer: what Keelwork is, where everything lives, and how to start. */
export function SiteFooter() {
  const columns: { title: string; links: { label: string; href: string }[] }[] = [
    { title: "Product", links: [...FEATURES.slice(0, 9).map((f) => ({ label: f.title, href: `/product/${f.slug}` })), { label: "Pricing", href: "/pricing" }] },
    { title: "Solutions", links: SOLUTIONS.map((s) => ({ label: s.title, href: `/solutions/${s.slug}` })) },
    { title: "Templates", links: [{ label: "All templates", href: "/starters" }, { label: "Studio Bookings", href: "/starters/studio-bookings" }, { label: "Pulse Analytics", href: "/starters/pulse-analytics" }, { label: "Clay & Co shop", href: "/starters/clay-and-co" }, { label: "Folio portfolio", href: "/starters/folio" }, { label: "Deal Desk CRM", href: "/starters/deal-desk" }] },
    { title: "Learn", links: [{ label: "Tutorials", href: "/tutorials" }, ...TUTORIALS.slice(0, 3).map((t) => ({ label: t.title, href: `/tutorials/${t.slug}` })), { label: "Changelog", href: "/changelog" }, { label: "Documentation", href: "/docs" }] },
    { title: "Trust", links: [{ label: "Security", href: "/trust" }, { label: "Privacy overview", href: "/privacy" }, { label: "System status", href: "/status" }, { label: "Your code is yours", href: "/trust#ownership" }, { label: "Acceptable use", href: "/acceptable-use" }, { label: "Report abuse", href: "/report" }] },
  ];
  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface" aria-labelledby="footer-h">
      <h2 id="footer-h" className="sr-only">Site footer</h2>
      <div aria-hidden className="wash pointer-events-none absolute inset-x-0 top-0 h-64 opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-16">
        <div className="grid gap-10 rounded-[32px] border border-border bg-bg/70 p-8 backdrop-blur md:grid-cols-[1.2fr_1fr] md:items-center md:p-10">
          <div>
            <p className="font-display text-3xl font-bold md:text-4xl">What will you build <span className="font-serif font-normal italic text-gradient">today?</span></p>
            <p className="mt-2 max-w-lg text-muted">Describe an idea, approve the plan, and watch a team of AI agents build it — tested, secure, and yours to keep.</p>
          </div>
          <form action="/sign-up" method="get" className="flex flex-col gap-2 sm:flex-row" aria-label="Start building">
            <label htmlFor="footer-prompt" className="sr-only">Describe your idea</label>
            <input id="footer-prompt" name="prompt" maxLength={2000} placeholder="A booking app for my studio…" className="input flex-1" />
            <button className="btn btn-gradient shrink-0">Start building</button>
          </form>
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(5,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm text-muted">The AI software engineer that plans with you, builds in a sandbox, tests every change and deploys to your own account.</p>
            <ul className="mt-4 grid gap-1.5 text-sm">
              {["Plan first — nothing built without your yes", "Code in Git, exportable any time", "Runs in your own hosting account"].map((t) => (
                <li key={t} className="flex gap-2"><span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{t}</li>
              ))}
            </ul>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-sm font-bold">{col.title}</h3>
              <ul className="mt-3 grid gap-2 text-sm">
                {col.links.map((l) => <li key={l.href + l.label}><Link href={l.href} className="text-muted hover:text-text">{l.label}</Link></li>)}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted">
          <p>© {new Date().getFullYear()} Keelwork. Your code, always.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/sign-in" className="hover:text-text">Log in</Link>
            <Link href="/sign-up" className="font-semibold text-text hover:underline">Get started free</Link>
            <ThemeSwitch />
          </div>
        </div>
      </div>
    </footer>
  );
}
