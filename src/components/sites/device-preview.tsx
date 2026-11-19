"use client";

import { useState } from "react";

const DEVICES = [
  { key: "desktop", label: "Desktop", width: 1280, icon: "M3 5h18v11H3z M8 20h8 M12 16v4" },
  { key: "tablet", label: "Tablet", width: 820, icon: "M6 3h12v18H6z M11 18h2" },
  { key: "mobile", label: "Mobile", width: 390, icon: "M8 3h8v18H8z M11 18h2" },
] as const;

/**
 * The template's real pages in a frame, switchable between desktop, tablet
 * and mobile widths, with page navigation. The frame scales to fit.
 */
export function DevicePreview({ slug, pages }: { slug: string; pages: { slug: string; title: string }[] }) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]["key"]>("desktop");
  const [page, setPage] = useState("");
  const [loading, setLoading] = useState(true);
  const d = DEVICES.find((x) => x.key === device)!;
  const src = `/demo/${slug}${page ? `/${page}` : ""}?embed=1`;
  return (
    <div className="rounded-[28px] border border-border bg-surface p-3 shadow-[0_50px_100px_-60px_rgba(28,27,25,0.6)]">
      <div className="flex flex-wrap items-center gap-2 px-1 pb-3">
        <div role="group" aria-label="Device" className="flex rounded-full border border-border bg-bg p-1">
          {DEVICES.map((x) => (
            <button key={x.key} type="button" aria-pressed={device === x.key} onClick={() => { setDevice(x.key); setLoading(true); }} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${device === x.key ? "bg-brand text-brand-contrast" : "text-muted hover:text-text"}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d={x.icon} /></svg>{x.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted">Page
          <select value={page} onChange={(e) => { setPage(e.target.value); setLoading(true); }} className="input min-h-9 py-1 text-sm">
            {pages.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
          </select>
        </label>
        <a href={`/demo/${slug}${page ? `/${page}` : ""}`} target="_blank" rel="noopener" className="btn btn-secondary min-h-9 px-3 text-xs">Open full screen ↗</a>
      </div>
      <div className="relative mx-auto overflow-hidden rounded-[18px] border border-border bg-bg transition-[max-width] duration-300" style={{ maxWidth: d.width, height: device === "mobile" ? 720 : 640 }}>
        {loading && <div className="absolute inset-0 grid place-items-center text-sm text-muted" role="status"><span className="animate-pulse">Loading preview…</span></div>}
        <iframe key={src} title={`${slug} template preview (${d.label})`} src={src} className="h-full w-full" onLoad={() => setLoading(false)} loading="lazy" />
      </div>
    </div>
  );
}
