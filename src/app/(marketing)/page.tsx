import Link from "next/link";
import { HeroPrompt } from "@/components/marketing/hero-prompt";

const TEMPLATES = [
  { slug: "studio-bookings", name: "Studio Bookings", body: "Class schedules, passes and payments.", from: "#ff5c8a", to: "#ffb48a" },
  { slug: "folio", name: "Folio", body: "Case studies that load like magazines.", from: "#8b6cff", to: "#ff9ec0" },
  { slug: "pulse-analytics", name: "Pulse Analytics", body: "A SaaS dashboard with teams and charts.", from: "#ff8a4c", to: "#ffc46b" },
  { slug: "clay-and-co", name: "Clay & Co", body: "A small shop with a big personality.", from: "#3fb37f", to: "#c6e9a7" },
  { slug: "streaks", name: "Streaks", body: "Habits, streaks and an evening nudge.", from: "#ffb347", to: "#ffe08a" },
  { slug: "launchpad", name: "Launchpad", body: "A waitlist page that converts.", from: "#1c1b19", to: "#c7254e" },
];

const CAPTIONS = ["a booking app", "a portfolio", "a client portal", "an online shop"];

export default function HomePage() {
  return (
    <>
      {/* 1. Hero */}
      <section className="relative overflow-hidden px-4 pb-24 pt-20 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="kw-blob-a absolute -left-20 top-10 h-96 w-96 rounded-full bg-[#8b6cff]/25 blur-3xl" />
          <div className="kw-blob-b absolute right-0 top-0 h-[28rem] w-[28rem] rounded-full bg-[#ff5c8a]/25 blur-3xl" />
          <div className="kw-blob-c absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#ff8a4c]/25 blur-3xl" />
          <div className="kw-blob-a absolute bottom-10 right-1/4 h-64 w-64 rounded-full bg-[#ffc46b]/25 blur-3xl" />
          <div className="kw-blob-b absolute left-1/2 top-1/3 h-40 w-40 rounded-full bg-[#ff9ec0]/30 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl">
          <Link href="/sign-up" className="pill mx-auto border border-border bg-surface px-4 py-2 text-sm">
            <span className="rounded-full bg-highlight px-2 text-highlight-ink">New</span> Agents now test their own work
          </Link>
          <h1 className="mt-8 font-display font-bold leading-[0.92]" style={{ fontSize: "clamp(52px, 8.6vw, 128px)", letterSpacing: "-0.055em" }}>
            Build something <span className="text-gradient">gorgeous</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted md:text-xl">
            Turn ideas into real apps and websites by chatting with AI. Design it, ship it, own every line.
          </p>
          <p className="mt-3 h-6 overflow-hidden text-sm text-muted" aria-hidden>
            Today someone is building <span className="kw-rise inline-block font-serif text-base italic text-text">{CAPTIONS[0]}</span>
          </p>
          <HeroPrompt />
        </div>
      </section>

      {/* 3. Templates marquee */}
      <section id="templates" className="overflow-hidden border-y border-border bg-surface py-16" aria-labelledby="templates-h">
        <h2 id="templates-h" className="px-4 text-center text-3xl md:text-5xl">Remix a <span className="font-serif font-normal italic">starting point</span></h2>
        <div className="mt-10 flex w-max gap-5 kw-marquee">
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex gap-5" aria-hidden={copy === 1 ? true : undefined}>
              {TEMPLATES.map((t) => (
                <li key={t.slug}>
                  <Link href={`/sign-up?template=${t.slug}`} tabIndex={copy === 1 ? -1 : undefined} className="block w-72 rounded-3xl border border-border bg-bg p-3 hover:border-accent">
                    <div className="h-40 rounded-2xl" style={{ background: `linear-gradient(140deg, ${t.from}, ${t.to})` }} />
                    <p className="mt-3 px-1 font-semibold">{t.name}</p>
                    <p className="px-1 pb-1 text-sm text-muted">{t.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* 4. Bento */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24" aria-labelledby="features-h">
        <h2 id="features-h" className="max-w-3xl text-4xl md:text-6xl">Your whole product team, <span className="font-serif font-normal italic">in one chat.</span></h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Bento dark title="Chat to build" body="Describe it in your words. Keelwork plans, asks the right questions, then builds." className="md:col-span-2">
            <div aria-hidden className="mt-6 grid gap-2 text-sm">
              <div className="ml-auto w-fit rounded-2xl bg-white/10 px-4 py-2">Add a waitlist with email confirmation</div>
              <div className="w-fit rounded-2xl bg-highlight px-4 py-2 text-highlight-ink">Plan ready: 2 pages, 1 table, 1 automation</div>
            </div>
          </Bento>
          <Bento title="Click anything. Change it." body="Point at the preview and say what you want. Design mode knows which file and line." />
          <Bento title="A real backend, built in" body="Tables with row-level security, sign-in and storage — or bring Postgres, Appwrite or CloudBase." />
          <Bento title="A team, not a bot" body="Architect, database, backend, frontend, QA, security and docs agents review each other." />
          <Bento title="Live in one click" body="Deploy to your own Cloudflare account. Health-checked, with automatic rollback." />
          <Bento dark title="Every line is yours" body="Export the whole repository any time. No lock-in, no secrets in the archive." className="md:col-span-3">
            <pre aria-hidden className="mt-6 overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs text-ink-accent">{`export async function GET() {\n  return Response.json({ ok: true });\n}`}</pre>
          </Bento>
        </div>
      </section>

      {/* 5. Steps band */}
      <section className="bg-ink px-4 py-24 text-ink-text" aria-labelledby="steps-h">
        <div className="mx-auto max-w-7xl">
          <h2 id="steps-h" className="max-w-3xl text-4xl md:text-6xl">From idea to launched <span className="font-serif font-normal italic text-ink-accent">before your coffee cools.</span></h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {[["01", "Describe it", "Say what you want. Keelwork turns it into a plan you can read."], ["02", "Shape it", "Approve the plan, then click and chat until it's right."], ["03", "Ship it", "Tests run, security checks pass, and it goes live on your domain."]].map(([n, t, b]) => (
              <li key={n} className="rounded-3xl border border-white/15 p-6"><p className="font-mono text-sm text-ink-accent">{n}</p><p className="mt-3 font-display text-2xl font-bold">{t}</p><p className="mt-2 text-white/80">{b}</p></li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. Teams */}
      <section id="teams" className="mx-auto max-w-7xl px-4 py-24" aria-labelledby="teams-h">
        <h2 id="teams-h" className="text-4xl md:text-6xl">Playful to use. <span className="font-serif font-normal italic">Serious underneath.</span></h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Isolated apps", "Generated code runs in sandboxes on separate hosts, never on ours."], ["Data kept apart", "Row-level security in the database separates every organization."], ["Activity log", "Every sensitive action is recorded in an append-only audit log."], ["Approvals", "Agents ask before installing packages, deleting files or going live."]].map(([t, b]) => (
            <div key={t} className="card"><p className="font-display text-xl font-bold">{t}</p><p className="mt-2 text-muted">{b}</p></div>
          ))}
        </div>
        <Link href="/sign-up" className="mt-8 inline-block font-semibold text-accent hover:underline">Keelwork for teams →</Link>
      </section>

      {/* 7. Final CTA */}
      <section className="px-4 pb-28" aria-labelledby="cta-h">
        <div className="mx-auto max-w-4xl rounded-[36px] p-10 text-center text-white md:p-16" style={{ background: "var(--grad-button)" }}>
          <h2 id="cta-h" className="text-4xl md:text-6xl">What will you make today?</h2>
          <form action="/sign-up" method="get" className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <label htmlFor="cta-prompt" className="sr-only">Describe your idea</label>
            <input id="cta-prompt" name="prompt" maxLength={2000} placeholder="Describe your idea" className="input flex-1 border-white/30 text-[#1c1b19]" />
            <button type="submit" className="btn bg-highlight text-highlight-ink">Start free</button>
          </form>
          <p className="mt-4 text-sm text-white/90">No credit card. Your code, always.</p>
        </div>
      </section>
    </>
  );
}

function Bento({ title, body, dark, className = "", children }: { title: string; body: string; dark?: boolean; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-[28px] border p-7 ${dark ? "border-transparent bg-ink text-ink-text" : "border-border bg-surface"} ${className}`}>
      <p className="font-display text-2xl font-bold">{title}</p>
      <p className={`mt-2 ${dark ? "text-white/80" : "text-muted"}`}>{body}</p>
      {children}
    </div>
  );
}
