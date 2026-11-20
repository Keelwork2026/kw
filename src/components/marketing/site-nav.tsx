"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MENUS, type Menu } from "./menu-data";
import { Icon } from "./icon";
import { Logo } from "../logo";
import { SimpleToggle } from "../simple/toggle";

export function SiteNav() {
  const [open, setOpen] = useState<Menu["id"] | null>(null);
  const [mobile, setMobile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(null); setMobile(false); } };
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, []);

  return (
    <div ref={ref} className="sticky top-0 z-40">
      <Link href="/starters" className="block px-4 py-2 text-center text-sm font-semibold text-white" style={{ background: "var(--grad-button)" }}>
        New · 17 complete website templates — preview every page, no sign-in →
      </Link>
      <nav aria-label="Primary" className="border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Logo />
          <ul className="hidden items-center gap-1 lg:flex">
            {MENUS.map((m) => (
              <li key={m.id} className="relative" onMouseEnter={() => setOpen(m.id)} onMouseLeave={() => setOpen(null)}>
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold hover:bg-surface-2"
                  aria-expanded={open === m.id}
                  aria-controls={`menu-${m.id}`}
                  onClick={() => setOpen(open === m.id ? null : m.id)}
                  onFocus={() => setOpen(m.id)}
                >
                  {m.label}<span aria-hidden>▾</span>
                </button>
                {open === m.id ? <MegaPanel menu={m} /> : null}
              </li>
            ))}
            <li><Link href="/starters" className="flex min-h-11 items-center rounded-full px-3 text-sm font-semibold hover:bg-surface-2">Templates</Link></li>
            <li><Link href="/pricing" className="flex min-h-11 items-center rounded-full px-3 text-sm font-semibold hover:bg-surface-2">Pricing</Link></li>
            <li><Link href="/solutions/enterprise" className="flex min-h-11 items-center rounded-full px-3 text-sm font-semibold hover:bg-surface-2">Enterprise</Link></li>
          </ul>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <SimpleToggle compact className="xl:hidden" />
            <SimpleToggle className="hidden xl:inline-flex" />
            <Link href="/sign-in" className="btn btn-secondary whitespace-nowrap">Log in</Link>
            <Link href="/sign-up" className="btn btn-primary">Get started</Link>
          </div>
          <SimpleToggle compact className="ml-auto lg:hidden" />
          <button type="button" className="btn btn-secondary min-h-12 lg:hidden" aria-expanded={mobile} aria-controls="mobile-menu" onClick={() => setMobile(!mobile)}>
            {mobile ? "Close" : "Menu"}
          </button>
        </div>
        {mobile ? (
          <div id="mobile-menu" className="kw-fade max-h-[80vh] overflow-y-auto border-t border-border px-4 pb-6 lg:hidden">
            {MENUS.map((m) => (
              <details key={m.id} className="border-b border-border py-2">
                <summary className="flex min-h-12 cursor-pointer items-center font-semibold">{m.label}</summary>
                <ul className="grid gap-1 pb-2">
                  {m.items.map((i) => (
                    <li key={i.title}><Link href={i.href} className="flex min-h-12 items-center gap-3 rounded-xl px-2 hover:bg-surface-2"><span className={`tile-${i.tint} grid h-9 w-9 place-items-center rounded-xl`}><Icon name={i.icon} /></span>{i.title}</Link></li>
                  ))}
                </ul>
              </details>
            ))}
            <Link href="/starters" className="flex min-h-12 items-center font-semibold">Templates</Link>
            <Link href="/pricing" className="flex min-h-12 items-center font-semibold">Pricing</Link>
            <Link href="/solutions/enterprise" className="flex min-h-12 items-center font-semibold">Enterprise</Link>
            <div className="mt-4 grid gap-2">
              <Link href="/sign-in" className="btn btn-secondary">Log in</Link>
              <Link href="/sign-up" className="btn btn-primary">Get started</Link>
            </div>
          </div>
        ) : null}
      </nav>
    </div>
  );
}

function MegaPanel({ menu }: { menu: Menu }) {
  return (
    <div id={`menu-${menu.id}`} className="kw-fade absolute left-0 top-full w-[min(92vw,880px)] pt-2">
      <div className="grid grid-cols-[1fr_240px] gap-4 rounded-[28px] border border-border bg-surface p-4 shadow-[0_40px_80px_-40px_rgba(11,31,58,0.45)]">
        <div>
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">{menu.kicker}</p>
          <ul className="grid grid-cols-2 gap-1">
            {menu.items.map((i) => (
              <li key={i.title}>
                <Link href={i.href} className="flex gap-3 rounded-2xl p-2.5 hover:bg-surface-2">
                  <span className={`tile-${i.tint} grid h-10 w-10 shrink-0 place-items-center rounded-xl`}><Icon name={i.icon} /></span>
                  <span>
                    <span className="flex items-center gap-2 text-sm font-semibold">{i.title}{i.badge ? <span className="pill bg-highlight px-2 py-0.5 text-[10px] text-highlight-ink">{i.badge}</span> : null}</span>
                    <span className="block text-xs text-muted">{i.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-border px-2 pt-3 text-sm text-muted">{menu.footnote.text} <Link className="font-semibold text-accent hover:underline" href={menu.footnote.href}>{menu.footnote.link} →</Link></p>
        </div>
        <Link href={menu.feature.href} className="flex flex-col justify-end rounded-3xl p-5 text-white" style={{ background: `linear-gradient(150deg, ${menu.feature.from}, ${menu.feature.to})` }}>
          <span className="pill w-fit bg-white/20 text-white">{menu.feature.eyebrow}</span>
          <span className="mt-3 font-display text-xl font-bold leading-tight">{menu.feature.title}</span>
          <span className="mt-2 text-sm font-semibold">Learn more →</span>
        </Link>
      </div>
    </div>
  );
}
