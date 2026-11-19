import Link from "next/link";
import { siteBySlug } from "@/lib/sites";
import { SiteThumb } from "@/components/sites/site-card";

/**
 * The homepage's product shot: Keelwork's website editor, drawn with a real
 * template inside it. Decorative — every control it shows exists in the app.
 */
export function HeroInterface() {
  const site = siteBySlug("harbour-kitchen")!;
  const sections = ["Hero — Today's catch, cooked simply", "What to expect", "Our kitchen", "This week's menu", "Inside the dining room", "Join us this week"];
  return (
    <div className="relative mx-auto mt-14 max-w-6xl text-left" aria-label="The Keelwork website editor">
      <div className="rounded-[28px] border border-border bg-surface p-2 shadow-[0_60px_120px_-60px_rgba(28,27,25,0.55)]">
        <div className="flex items-center gap-2 rounded-t-[22px] border-b border-border px-4 py-2.5" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 truncate rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">Websites / {site.name}</span>
          <span className="ml-auto hidden gap-1 text-[11px] sm:flex"><span className="rounded-full bg-brand px-2.5 py-1 font-semibold text-brand-contrast">Desktop</span><span className="rounded-full px-2.5 py-1 text-muted">Tablet</span><span className="rounded-full px-2.5 py-1 text-muted">Mobile</span></span>
          <span className="rounded-full bg-[color:var(--success)]/15 px-2.5 py-1 text-[11px] font-semibold text-success">Saved</span>
        </div>
        <div className="grid gap-2 p-2 md:grid-cols-[200px_1fr_230px]" aria-hidden>
          <div className="hidden rounded-2xl bg-bg p-3 md:block">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Home · sections</p>
            <ol className="mt-2 grid gap-1 text-xs">{sections.map((s, i) => <li key={s} className={`truncate rounded-lg px-2 py-1.5 ${i === 0 ? "bg-soft-accent font-semibold" : ""}`}>{s}</li>)}</ol>
          </div>
          <SiteThumb site={site} className="rounded-2xl border border-border" />
          <div className="hidden rounded-2xl bg-bg p-3 md:block">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Hero</p>
            <p className="mt-2 text-[11px] font-semibold text-muted">Headline ideas</p>
            <div className="mt-1 flex flex-wrap gap-1">{["Today's catch, cooked simply", "Seafood by the harbour", "Dinner, the way the sea intended"].map((h) => <span key={h} className="rounded-full border border-border px-2 py-0.5 text-[10px]">{h}</span>)}</div>
            <p className="mt-3 text-[11px] font-semibold text-muted">Supporting text</p>
            <div className="mt-1 rounded-lg border border-border p-2 text-[10px] leading-snug">A small dining room on the quay serving what the boats bring in each morning.</div>
            <div className="mt-1.5 flex flex-wrap gap-1">{["Shorten", "Simplify", "More persuasive"].map((o) => <span key={o} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold">{o}</span>)}</div>
            <div className="mt-3 rounded-lg px-2 py-1.5 text-center text-[11px] font-semibold text-white" style={{ background: "var(--grad-button)" }}>↻ Regenerate section</div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-muted">That&apos;s a real template. <Link href={`/demo/${site.slug}`} className="font-semibold text-accent hover:underline">Click through all {site.pages.length} pages →</Link></p>
    </div>
  );
}
