"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Entry } from "@/lib/catalog";
import { SEARCH_EXAMPLES, searchCatalog } from "@/lib/catalog/search";
import { Icon } from "@/components/icons";

export type GalleryEntry = Omit<Entry, "brief">;
type Props = {
  entries: GalleryEntry[];
  thumbs: Record<string, React.ReactNode>;
  categories: readonly string[];
  types: readonly string[];
  styles: readonly string[];
  /** Real counts of projects started from each template (omitted when there are none). */
  usage?: Record<string, number>;
  signedIn: boolean;
};
type Kind = "all" | "website" | "app";
const DEVICES = [{ id: "desktop", label: "Desktop", w: "100%" }, { id: "tablet", label: "Tablet", w: "820px" }, { id: "mobile", label: "Phone", w: "390px" }] as const;
const STATES = [{ id: "normal", label: "Filled" }, { id: "empty", label: "Empty" }, { id: "loading", label: "Loading" }, { id: "error", label: "Error" }] as const;

const hrefFor = (e: GalleryEntry, signedIn: boolean) => `${signedIn ? "/new-project" : "/sign-up"}?template=${encodeURIComponent(e.slug)}`;
const kindLabel = (e: GalleryEntry) => (e.kind === "website" ? "Website" : e.kind === "app" ? "Interactive app" : "App starter");

/**
 * Template gallery with natural-language search and filters. Opening a
 * template shows a preview panel over the gallery (the URL gets ?t=slug, so
 * it can be shared and Back closes it); filters, search and scroll position
 * stay as they were.
 */
export function TemplateGallery({ entries, thumbs, categories, types, styles, usage, signedIn }: Props) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [cat, setCat] = useState("");
  const [type, setType] = useState("");
  const [style, setStyle] = useState("");
  const [level, setLevel] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const filtered = useMemo(() => {
    const base = entries.filter((e) => (kind === "all" || (kind === "website" ? e.kind === "website" : e.kind !== "website")) && (!cat || e.category === cat) && (!type || e.type === type) && (!style || e.styles.includes(style as never)) && (!level || e.level === level));
    return searchCatalog(base as Entry[], q) as GalleryEntry[];
  }, [entries, q, kind, cat, type, style, level]);
  const browsing = !q && kind === "all" && !cat && !type && !style && !level;

  // Open from / write to ?t= without navigating.
  useEffect(() => {
    const sync = () => setOpen(new URLSearchParams(window.location.search).get("t"));
    sync();
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) setQ(initial.slice(0, 120));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const show = useCallback((slug: string | null, push = false) => {
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set("t", slug); else url.searchParams.delete("t");
    if (push) window.history.pushState(null, "", url); else window.history.replaceState(null, "", url);
    setOpen(slug);
  }, []);
  const openCard = (slug: string, el: HTMLElement) => { lastFocus.current = el; show(slug, !open); };
  const close = () => { show(null); setTimeout(() => lastFocus.current?.focus(), 0); };

  const clear = () => { setQ(""); setKind("all"); setCat(""); setType(""); setStyle(""); setLevel(""); };
  const featured = entries.filter((e) => e.featured);
  const recent = entries.filter((e) => e.added).sort((a, b) => b.added!.localeCompare(a.added!)).slice(0, 6);
  const popular = usage ? entries.filter((e) => (usage[e.slug] ?? 0) > 0).sort((a, b) => usage[b.slug]! - usage[a.slug]!).slice(0, 6) : [];
  const current = open ? entries.find((e) => e.slug === open) ?? null : null;
  const list = current && filtered.some((e) => e.slug === current.slug) ? filtered : entries;

  const card = (e: GalleryEntry) => (
    <article className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-border bg-surface transition hover:-translate-y-0.5 hover:shadow-[0_30px_60px_-40px_rgba(28,27,25,0.45)]">
      <button type="button" onClick={(ev) => openCard(e.slug, ev.currentTarget)} className="block p-3 pb-0 text-left" aria-label={`Preview ${e.name}`} aria-haspopup="dialog">
        <div className="overflow-hidden rounded-[14px] border border-border transition group-hover:scale-[1.01]">{thumbs[e.slug]}</div>
      </button>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold"><button type="button" onClick={(ev) => openCard(e.slug, ev.currentTarget)} className="text-left hover:underline">{e.name}</button></h3>
          <span className="pill shrink-0 bg-surface-2 text-[11px]">{kindLabel(e)}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{e.tagline}</p>
        <p className="mt-2 text-xs text-muted">{e.category} · {e.type} · {e.parts.length} {e.kind === "website" ? "pages" : "screens"}{usage?.[e.slug] ? ` · used ${usage[e.slug]}×` : ""}</p>
        <div className="mt-auto flex gap-2 pt-3">
          <a href={hrefFor(e, signedIn)} className="btn btn-primary min-h-10 flex-1 px-3 text-sm">Use template</a>
          <button type="button" onClick={(ev) => openCard(e.slug, ev.currentTarget)} className="btn btn-secondary min-h-10 px-3 text-sm">Preview</button>
        </div>
      </div>
    </article>
  );
  const row = (id: string, title: string, items: GalleryEntry[]) => items.length ? (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="text-xl">{title}</h2>
      <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((e) => <li key={e.slug}>{card(e)}</li>)}</ul>
    </section>
  ) : null;
  const select = (label: string, value: string, set: (v: string) => void, options: readonly string[]) => (
    <label key={label} className="grid gap-1 text-xs font-semibold text-muted">{label}
      <select value={value} onChange={(e) => set(e.target.value)} className="input min-h-10 py-1.5 text-sm font-normal text-text"><option value="">Any</option>{options.map((o) => <option key={o}>{o}</option>)}</select>
    </label>
  );

  return (
    <div id="gallery" className="scroll-mt-24">
      <div className="rounded-[24px] border border-border bg-surface p-4 sm:p-5">
        <label htmlFor="tq" className="sr-only">Describe what you want to build</label>
        <div className="relative">
          <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input id="tq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Describe it: “a website for my restaurant”, “dashboard for my sales team”…" className="input min-h-12 pl-11 text-base" autoComplete="off" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Example searches">{SEARCH_EXAMPLES.map((x) => <button key={x} type="button" onClick={() => setQ(x)} className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:bg-surface-2 hover:text-text">{x}</button>)}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[auto_repeat(4,minmax(0,1fr))]">
          <div className="grid gap-1 text-xs font-semibold text-muted">Kind
            <div role="group" aria-label="Kind" className="flex rounded-lg border border-border p-0.5">{([["all", "All"], ["website", "Websites"], ["app", "Apps"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`min-h-9 rounded-md px-3 text-sm font-semibold ${kind === k ? "bg-accent text-accent-contrast" : "text-muted hover:text-text"}`}>{l}</button>)}</div>
          </div>
          {select("Category", cat, setCat, categories)}
          {select("Project type", type, setType, types)}
          {select("Style", style, setStyle, styles)}
          {select("Complexity", level, setLevel, ["Beginner-friendly", "Advanced"])}
        </div>
      </div>

      {browsing ? (
        <>
          {row("g-featured", "Featured", featured)}
          {row("g-recent", "Recently added", recent)}
          {row("g-popular", "Most used in your workspace", popular)}
          {categories.map((c) => <div key={c}>{row(`g-${c.replace(/\W+/g, "-")}`, c, entries.filter((e) => e.category === c))}</div>)}
        </>
      ) : (
        <section aria-live="polite" className="mt-8">
          <p className="text-sm text-muted">{filtered.length ? `${filtered.length} template${filtered.length === 1 ? "" : "s"}${q ? " — best matches first" : ""}` : "No templates match."} <button type="button" onClick={clear} className="font-semibold text-accent">Clear</button></p>
          {filtered.length ? <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((e) => <li key={e.slug}>{card(e)}</li>)}</ul>
            : <div className="mt-4 rounded-[22px] border border-dashed border-border p-8 text-center"><p className="font-semibold">Nothing close to that yet.</p><p className="mt-1 text-sm text-muted">Describe it in your own words and the agents will plan it from scratch.</p><a href={`${signedIn ? "/new-project" : "/sign-up"}?prompt=${encodeURIComponent(q)}`} className="btn btn-primary mt-4">Start from my description</a></div>}
        </section>
      )}

      {current ? <PreviewPanel e={current} list={list} thumbs={thumbs} entries={entries} signedIn={signedIn} onClose={close} onGo={(s) => show(s)} /> : null}
    </div>
  );
}

function PreviewPanel({ e, list, thumbs, entries, signedIn, onClose, onGo }: { e: GalleryEntry; list: GalleryEntry[]; thumbs: Record<string, React.ReactNode>; entries: GalleryEntry[]; signedIn: boolean; onClose: () => void; onGo: (slug: string) => void }) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [state, setState] = useState<(typeof STATES)[number]["id"]>("normal");
  const [loaded, setLoaded] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const i = list.findIndex((x) => x.slug === e.slug);
  const prev = i > 0 ? list[i - 1] : null;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  const words = new Set(e.keywords);
  const related = entries.filter((x) => x.slug !== e.slug).map((x) => ({ x, s: (x.category === e.category ? 4 : 0) + (x.type === e.type ? 1 : 0) + x.keywords.filter((k) => words.has(k)).length })).filter((r) => r.s > 1).sort((a, b) => b.s - a.s).slice(0, 4).map((r) => r.x);
  const src = e.demo ? `${e.demo}${e.kind === "app" && state !== "normal" ? `?state=${state}` : ""}` : null;

  useEffect(() => { setLoaded(false); setState("normal"); dialog.current?.focus(); }, [e.slug]);
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);
  const onKey = (ev: React.KeyboardEvent) => {
    if (ev.key === "Escape") { ev.stopPropagation(); onClose(); }
    if (ev.key === "Tab" && dialog.current) {
      const f = dialog.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), select, iframe, [tabindex]:not([tabindex='-1'])");
      const first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last?.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first?.focus(); }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/45 p-0 sm:p-4" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="tp-title" tabIndex={-1} onKeyDown={onKey} className="flex w-full max-w-[1400px] flex-col overflow-hidden bg-bg shadow-2xl outline-none sm:rounded-[24px]">
        <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
          <button type="button" onClick={onClose} className="btn btn-secondary min-h-9 px-3 text-sm"><Icon name="chevronRight" size={16} className="rotate-180" />Continue exploring</button>
          <div className="mx-auto flex items-center gap-1">
            <button type="button" disabled={!prev} onClick={() => prev && onGo(prev.slug)} aria-label={prev ? `Previous: ${prev.name}` : "No previous template"} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-40"><Icon name="chevronRight" size={18} className="rotate-180" /></button>
            {src ? <div role="group" aria-label="Device" className="flex rounded-lg border border-border p-0.5">{DEVICES.map((d) => <button key={d.id} type="button" aria-pressed={device === d.id} onClick={() => setDevice(d.id)} className={`min-h-8 rounded-md px-3 text-xs font-semibold ${device === d.id ? "bg-accent text-accent-contrast" : "text-muted"}`}>{d.label}</button>)}</div> : null}
            {e.kind === "app" ? <label className="ml-1 flex items-center gap-1 text-xs text-muted">State<select value={state} onChange={(ev) => { setLoaded(false); setState(ev.target.value as typeof state); }} className="input min-h-8 py-0.5 text-xs">{STATES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label> : null}
            <button type="button" disabled={!next} onClick={() => next && onGo(next.slug)} aria-label={next ? `Next: ${next.name}` : "No next template"} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-40"><Icon name="chevronRight" size={18} /></button>
          </div>
          <button type="button" onClick={onClose} aria-label="Close preview" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface-2"><Icon name="close" size={18} /></button>
        </header>
        <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_22rem]">
          <div className="relative min-h-[50vh] overflow-auto bg-surface-2 p-3">
            {src ? (
              <div className="mx-auto h-full overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-[width]" style={{ width: DEVICES.find((d) => d.id === device)!.w, maxWidth: "100%", minHeight: "60vh" }}>
                {!loaded ? <div className="absolute inset-0 grid place-items-center text-sm text-muted" aria-hidden>Loading preview…</div> : null}
                <iframe key={src} src={src} title={`${e.name} — live preview`} onLoad={() => setLoaded(true)} className="h-full min-h-[60vh] w-full" />
              </div>
            ) : <div className="mx-auto max-w-2xl">{thumbs[e.slug]}<p className="mt-3 text-center text-sm text-muted">App starters are briefs: the preview shows the intended layout. The agents build it with you after you approve the plan.</p></div>}
          </div>
          <aside className="overflow-y-auto border-t border-border bg-surface p-5 lg:border-l lg:border-t-0" aria-label="Template details">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{kindLabel(e)} · {e.category}</p>
            <h2 id="tp-title" className="mt-1 text-2xl">{e.name}</h2>
            <p className="mt-1 text-muted">{e.tagline}</p>
            <div className="mt-4 grid gap-2">
              <a href={hrefFor(e, signedIn)} className="btn btn-primary min-h-11">Use this template</a>
              {e.demo ? <a href={e.demo} target="_blank" rel="noopener" className="btn btn-secondary min-h-10 text-sm"><Icon name="external" size={16} />Open full screen</a> : null}
            </div>
            {e.kind === "app" ? <p className="mt-3 rounded-lg bg-surface-2 p-3 text-xs text-muted">Interactive preview with sample data — click around, filter, submit forms. Using it gives the agents this design and a brief; you approve the plan before anything is built, and your real data replaces the samples.</p> : null}
            <p className="mt-4 text-sm">{e.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted">Type</dt><dd className="font-semibold">{e.type}</dd></div>
              <div><dt className="text-xs text-muted">Complexity</dt><dd className="font-semibold">{e.level}</dd></div>
              <div><dt className="text-xs text-muted">Style</dt><dd className="font-semibold">{e.styles.join(", ")}</dd></div>
              <div><dt className="text-xs text-muted">Industry</dt><dd className="font-semibold">{e.industry}</dd></div>
            </dl>
            <h3 className="mt-5 text-sm font-semibold">Features</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">{e.features.map((f) => <li key={f} className="rounded-full border border-border px-2.5 py-0.5 text-xs">{f}</li>)}</ul>
            <h3 className="mt-5 text-sm font-semibold">{e.kind === "website" ? "Pages" : "Screens"}</h3>
            <p className="mt-1 text-sm text-muted">{e.parts.join(" · ")}</p>
            {related.length ? <>
              <h3 className="mt-6 text-sm font-semibold">Similar templates</h3>
              <ul className="mt-2 grid grid-cols-2 gap-2">{related.map((r) => <li key={r.slug}><button type="button" onClick={() => onGo(r.slug)} className="block w-full text-left"><div className="overflow-hidden rounded-lg border border-border">{thumbs[r.slug]}</div><span className="mt-1 block truncate text-xs font-semibold">{r.name}</span></button></li>)}</ul>
            </> : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
