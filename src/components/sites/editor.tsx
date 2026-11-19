"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Section, Site } from "@/lib/sites/types";
import { setAt, textFields, plain } from "@/lib/sites/text";
import { regenerateSection } from "@/lib/sites/engine/generate";
import { ctaAlternatives, editText, headlines, type TextOp } from "@/lib/sites/engine/copy";
import { qaSite } from "@/lib/sites/qa";
import { aiRewriteSection, saveSiteDraft, shareSiteDraft, type AiEdit } from "@/app/(app)/sites/actions";

const DEVICES = [{ k: "desktop", w: 1280, label: "Desktop" }, { k: "tablet", w: 820, label: "Tablet" }, { k: "mobile", w: 390, label: "Mobile" }] as const;
const OPS: [TextOp, string][] = [["shorten", "Shorten"], ["expand", "Expand"], ["simplify", "Simplify"], ["professional", "More professional"], ["persuasive", "More persuasive"]];
const NAMES: Partial<Record<Section["t"], string>> = { hero: "Hero", features: "Features", split: "Image and text", cards: "Cards", menu: "Menu", gallery: "Gallery", testimonials: "Reviews", pricing: "Pricing", faq: "FAQ", cta: "Call to action", newsletter: "Newsletter", contact: "Contact", steps: "Steps", timeline: "Timeline", team: "Team", schedule: "Schedule", detail: "Detail", article: "Article", rates: "Table", booking: "Booking form", donate: "Donations", stats: "Figures", logos: "Logos", cart: "Basket", checkout: "Checkout", account: "Account" };

function sectionTitle(s: Section): string {
  const t = "title" in s && typeof s.title === "string" ? plain(s.title) : "";
  return `${NAMES[s.t] ?? s.t}${t ? ` — ${t}` : ""}`;
}

/**
 * The website editor: pages and sections on the left, the live preview in
 * the middle, and the selected section's text and tools on the right.
 * Autosaves after every pause; undo/redo with ⌘Z / ⇧⌘Z.
 */
export function SiteEditor({ id, initial, version: initialVersion, shareToken, canEdit, aiReady }: { id: string; initial: Site; version: number; shareToken: string | null; canEdit: boolean; aiReady: boolean }) {
  const [site, setSite] = useState(initial);
  const [past, setPast] = useState<Site[]>([]);
  const [future, setFuture] = useState<Site[]>([]);
  const [pageSlug, setPageSlug] = useState("");
  const [sel, setSel] = useState<number | null>(0);
  const [panel, setPanel] = useState<"section" | "seo" | "checks">("section");
  const [device, setDevice] = useState<(typeof DEVICES)[number]["k"]>("desktop");
  const [status, setStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(initialVersion);
  const [variant, setVariant] = useState(1);
  const [token, setToken] = useState(shareToken);
  const [aiOp, setAiOp] = useState<AiEdit>("tone");
  const [aiValue, setAiValue] = useState("friendly");
  const [pending, startTransition] = useTransition();
  const [frameLoading, setFrameLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const page = site.pages.find((p) => p.slug === pageSlug) ?? site.pages[0]!;
  const section = sel !== null ? page.sections[sel] : undefined;
  const issues = useMemo(() => qaSite(site), [site]);

  const change = useCallback((next: Site) => {
    if (!canEdit) return;
    setPast((p) => [...p.slice(-49), site]);
    setFuture([]);
    setSite(next);
    setStatus("dirty");
  }, [site, canEdit]);

  const updatePage = (fn: (sections: Section[]) => Section[]) => change({ ...site, pages: site.pages.map((p) => (p.slug === page.slug ? { ...p, sections: fn(p.sections) } : p)) });

  // Autosave 1.2s after the last change.
  useEffect(() => {
    if (status !== "dirty") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStatus("saving");
      const r = await saveSiteDraft(id, site);
      if (r.ok) { setVersion(r.version); setStatus("saved"); setMessage(null); setFrameLoading(true); }
      else { setStatus("error"); setMessage(r.message); }
    }, 1200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [site, status, id]);

  const undo = useCallback(() => { const prev = past.at(-1); if (!prev) return; setPast(past.slice(0, -1)); setFuture([site, ...future]); setSite(prev); setStatus("dirty"); }, [past, future, site]);
  const redo = useCallback(() => { const next = future[0]; if (!next) return; setFuture(future.slice(1)); setPast([...past, site]); setSite(next); setStatus("dirty"); }, [past, future, site]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault(); if (e.shiftKey) redo(); else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (status === "dirty" || status === "saving") e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  const setField = (path: (string | number)[], value: string) => sel !== null && updatePage((secs) => secs.map((s, i) => (i === sel ? setAt(s, path, value) : s)));
  const move = (i: number, d: -1 | 1) => updatePage((secs) => { const a = [...secs]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j]!, a[i]!]; setSel(j); return a; });
  const remove = (i: number) => { updatePage((secs) => secs.filter((_, k) => k !== i)); setSel(null); };
  const regen = () => { if (sel === null) return; change(regenerateSection(site, page.slug, sel, variant)); setVariant((v) => v + 1); };
  const ai = () => {
    if (!section) return;
    startTransition(async () => {
      setMessage(null);
      const r = await aiRewriteSection({ section, site: { name: site.name, profile: site.profile }, op: aiOp, value: aiValue });
      if (r.ok) updatePage((secs) => secs.map((s, i) => (i === sel ? r.section : s)));
      else setMessage(r.message);
    });
  };
  const toggleShare = () => startTransition(async () => { const r = await shareSiteDraft(id, !token); if (r.ok) setToken(r.token); else setMessage(r.message); });
  const shareUrl = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/s/${token}` : null;
  const d = DEVICES.find((x) => x.k === device)!;
  const fields = section ? textFields(section) : [];
  const profile = site.profile;

  return (
    <div className="grid gap-4">
      <div className="panel flex flex-wrap items-center gap-2 p-3">
        <input aria-label="Website name" className="input min-h-10 max-w-xs font-semibold" value={site.name} maxLength={80} disabled={!canEdit} onChange={(e) => change({ ...site, name: e.target.value })} />
        <span role="status" className={`text-xs ${status === "error" ? "text-danger" : "text-muted"}`}>{{ saved: `Saved · v${version}`, saving: "Saving…", dirty: "Unsaved changes", error: "Not saved" }[status]}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-secondary min-h-9 px-3" onClick={undo} disabled={!past.length} title="Undo (⌘Z)">↶ Undo</button>
          <button type="button" className="btn btn-secondary min-h-9 px-3" onClick={redo} disabled={!future.length} title="Redo (⇧⌘Z)">↷ Redo</button>
          <div role="group" aria-label="Preview size" className="flex rounded-full border border-border p-0.5">{DEVICES.map((x) => <button key={x.k} type="button" aria-pressed={device === x.k} onClick={() => { setDevice(x.k); setFrameLoading(true); }} className={`rounded-full px-3 py-1 text-xs font-semibold ${device === x.k ? "bg-brand text-brand-contrast" : "text-muted"}`}>{x.label}</button>)}</div>
          <a className="btn btn-secondary min-h-9 px-3" href={`/sites/${id}/export`} title="Static HTML, one folder per page">Export HTML</a>
          {canEdit && <button type="button" className="btn btn-secondary min-h-9 px-3" onClick={toggleShare} disabled={pending}>{token ? "Stop sharing" : "Share link"}</button>}
          <a className="btn btn-primary min-h-9 px-3" href={`/new-project?${new URLSearchParams({ name: site.name, template: initial.slug.slice(0, 48), prompt: `Build the website "${site.name}" exactly as designed in my Keelwork website draft (${site.pages.length} pages: ${site.pages.map((p) => p.title).join(", ")}). Keep the copy, layout, palette and SEO; make it a production Next.js site with working forms connected to email, and keep every [[placeholder]] visible until I fill it in.`.slice(0, 2000) })}`}>Send to builder</a>
        </div>
        {shareUrl && <p className="w-full text-xs text-muted">Anyone with this link can view (not edit): <a className="font-mono text-accent underline" href={shareUrl} target="_blank" rel="noopener">{shareUrl}</a> <button type="button" className="ml-1 underline" onClick={() => navigator.clipboard?.writeText(shareUrl)}>Copy</button></p>}
        {message && <p role="alert" className="w-full text-sm text-danger">{message}</p>}
        {site.lang && site.lang !== "en" && <p className="w-full text-xs text-muted">The parts written from your answers are in your chosen language. Example sections from the template are still in English — use <b>Change language</b> with AI on each section, or edit the text directly.</p>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_1fr_340px]">
        <aside className="panel max-h-[78vh] overflow-auto p-3" aria-label="Pages and sections">
          <label className="label" htmlFor="page-pick">Page</label>
          <select id="page-pick" className="input mb-3" value={page.slug} onChange={(e) => { setPageSlug(e.target.value); setSel(0); setFrameLoading(true); }}>{site.pages.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}</select>
          <div className="mb-2 flex gap-1 text-xs">{(["section", "seo", "checks"] as const).map((k) => <button key={k} type="button" onClick={() => setPanel(k)} aria-pressed={panel === k} className={`rounded-full px-2.5 py-1 font-semibold ${panel === k ? "bg-surface-2" : "text-muted"}`}>{k === "section" ? "Sections" : k === "seo" ? "SEO" : `Checks${issues.length ? ` (${issues.length})` : ""}`}</button>)}</div>
          <ol className="grid gap-1">
            {page.sections.map((s, i) => (
              <li key={i} className={`group flex items-center gap-1 rounded-xl border px-2 py-1.5 text-sm ${sel === i ? "border-accent bg-soft-accent" : "border-transparent hover:bg-surface-2"}`}>
                <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => { setSel(i); setPanel("section"); }} title={sectionTitle(s)}>{sectionTitle(s)}</button>
                {canEdit && <span className="flex shrink-0 opacity-60 group-hover:opacity-100"><button type="button" aria-label="Move up" className="px-1" onClick={() => move(i, -1)}>↑</button><button type="button" aria-label="Move down" className="px-1" onClick={() => move(i, 1)}>↓</button><button type="button" aria-label="Remove section" className="px-1" onClick={() => remove(i)}>✕</button></span>}
              </li>
            ))}
          </ol>
        </aside>

        <div className="panel relative overflow-hidden p-2">
          <div className="relative mx-auto h-[78vh] overflow-hidden rounded-xl border border-border bg-bg transition-[max-width] duration-300" style={{ maxWidth: d.w }}>
            {frameLoading && <div className="absolute inset-0 grid place-items-center text-sm text-muted" role="status"><span className="animate-pulse">Updating preview…</span></div>}
            <iframe key={`${page.slug}-${version}-${device}`} title={`${site.name} preview`} src={`/sites/${id}/preview${page.slug ? `/${page.slug}` : ""}`} className="h-full w-full" onLoad={() => setFrameLoading(false)} />
          </div>
          <p className="mt-2 text-center text-xs text-muted">The preview shows the last saved version. Changes save automatically.</p>
        </div>

        <aside className="panel max-h-[78vh] overflow-auto p-4" aria-label="Edit">
          {panel === "seo" && (
            <div className="grid gap-3">
              <h2 className="font-display text-lg font-bold">SEO for “{page.title}”</h2>
              <label className="grid gap-1 text-sm font-semibold">Search title <span className="text-xs font-normal text-muted">{(page.seo?.title ?? "").length}/60</span><input className="input" value={page.seo?.title ?? ""} disabled={!canEdit} onChange={(e) => change({ ...site, pages: site.pages.map((p) => (p.slug === page.slug ? { ...p, seo: { ...p.seo, title: e.target.value } } : p)) })} /></label>
              <label className="grid gap-1 text-sm font-semibold">Meta description <span className="text-xs font-normal text-muted">{(page.seo?.description ?? page.description).length}/160</span><textarea rows={4} className="input" value={page.seo?.description ?? page.description} disabled={!canEdit} onChange={(e) => change({ ...site, pages: site.pages.map((p) => (p.slug === page.slug ? { ...p, seo: { ...p.seo, description: e.target.value } } : p)) })} /></label>
              <label className="grid gap-1 text-sm font-semibold">Keyword themes <span className="text-xs font-normal text-muted">comma-separated</span><input className="input" value={(page.seo?.keywords ?? []).join(", ")} disabled={!canEdit} onChange={(e) => change({ ...site, pages: site.pages.map((p) => (p.slug === page.slug ? { ...p, seo: { ...p.seo, keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) } } : p)) })} /></label>
              <label className="grid gap-1 text-sm font-semibold">Social share title<input className="input" value={page.seo?.ogTitle ?? ""} disabled={!canEdit} onChange={(e) => change({ ...site, pages: site.pages.map((p) => (p.slug === page.slug ? { ...p, seo: { ...p.seo, ogTitle: e.target.value } } : p)) })} /></label>
              <div className="rounded-xl border border-border p-3 text-sm"><p className="text-xs text-muted">Search result preview</p><p className="mt-1 truncate font-semibold text-[#1a0dab]">{plain(page.seo?.title ?? page.title)}</p><p className="line-clamp-2 text-muted">{plain(page.seo?.description ?? page.description)}</p></div>
            </div>
          )}
          {panel === "checks" && (
            <div>
              <h2 className="font-display text-lg font-bold">Checks</h2>
              {issues.length ? <ul className="mt-3 grid gap-2 text-sm">{issues.map((i, k) => <li key={k} className="rounded-xl bg-surface-2 p-2"><b>{i.page}</b> · {i.rule}: {i.detail}</li>)}</ul> : <p className="mt-2 text-sm text-muted">No broken links, missing SEO, missing alt text or unsupported claims found.</p>}
              <p className="mt-4 text-xs text-muted">Highlighted “Add your …” spaces and anything marked as a sample still need your real details before you publish.</p>
            </div>
          )}
          {panel === "section" && !section && <p className="text-sm text-muted">Choose a section on the left to edit its text.</p>}
          {panel === "section" && section && (
            <div className="grid gap-4">
              <div className="flex items-center justify-between gap-2"><h2 className="font-display text-lg font-bold">{NAMES[section.t] ?? section.t}</h2>{canEdit && profile && <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" onClick={regen} title="A fresh version of this section only">↻ Regenerate</button>}</div>
              {canEdit && profile && section.t === "hero" && <div><p className="text-xs font-semibold text-muted">Headline ideas</p><div className="mt-1 flex flex-wrap gap-1.5">{headlines(profile).map((h) => <button key={h} type="button" className="rounded-full border border-border px-2.5 py-1 text-left text-xs hover:border-accent" onClick={() => setField(["title"], h)}>{h}</button>)}</div></div>}
              {canEdit && profile && "ctas" in section && Array.isArray(section.ctas) && section.ctas.length > 0 && <div><p className="text-xs font-semibold text-muted">Button ideas</p><div className="mt-1 flex flex-wrap gap-1.5">{ctaAlternatives(profile).map((c) => <button key={c} type="button" className="rounded-full border border-border px-2.5 py-1 text-xs hover:border-accent" onClick={() => setField(["ctas", 0, "label"], c)}>{c}</button>)}</div></div>}
              {fields.length === 0 && <p className="text-sm text-muted">This section has no text to edit — it works automatically.</p>}
              {fields.map((f) => (
                <div key={f.path.join(".")} className="grid gap-1">
                  <label className="text-xs font-semibold text-muted" htmlFor={`f-${f.path.join("-")}`}>{f.label}</label>
                  {f.long ? <textarea id={`f-${f.path.join("-")}`} rows={Math.min(8, Math.ceil(f.value.length / 42) + 1)} className="input text-sm" value={f.value} disabled={!canEdit} onChange={(e) => setField(f.path, e.target.value)} /> : <input id={`f-${f.path.join("-")}`} className={`input text-sm ${f.link ? "font-mono" : ""}`} value={f.value} disabled={!canEdit} onChange={(e) => setField(f.path, e.target.value)} />}
                  {canEdit && f.long && <div className="flex flex-wrap gap-1">{OPS.map(([op, label]) => <button key={op} type="button" className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold hover:bg-soft-accent" onClick={() => setField(f.path, editText(f.value, op, profile))}>{label}</button>)}</div>}
                </div>
              ))}
              {canEdit && (
                <div className="rounded-2xl border border-border p-3">
                  <p className="text-sm font-semibold">Rewrite with AI</p>
                  <div className="mt-2 grid gap-2">
                    <select className="input min-h-9 text-sm" value={aiOp} onChange={(e) => { const v = e.target.value as AiEdit; setAiOp(v); setAiValue(v === "tone" ? "friendly" : v === "language" ? "French" : v === "audience" ? "" : ""); }}>
                      <option value="tone">Change tone</option><option value="language">Change language</option><option value="audience">Rewrite for an audience</option><option value="rewrite">Clearer and more specific</option><option value="headlines">Stronger headline</option>
                    </select>
                    {(aiOp === "tone" || aiOp === "language" || aiOp === "audience") && <input className="input min-h-9 text-sm" value={aiValue} onChange={(e) => setAiValue(e.target.value)} placeholder={aiOp === "tone" ? "e.g. friendly, premium, bold" : aiOp === "language" ? "e.g. Spanish" : "e.g. first-time home buyers"} />}
                    <button type="button" className="btn btn-primary min-h-9" onClick={ai} disabled={pending || !aiReady}>{pending ? "Rewriting…" : "Rewrite this section"}</button>
                    {!aiReady && <p className="text-xs text-muted">AI rewriting isn&apos;t set up on this installation yet. Quick edits and Regenerate work without it.</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
