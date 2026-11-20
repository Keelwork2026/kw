"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ConnectorView } from "@/lib/integrations/hub";
import type { Integration } from "@/lib/integrations/catalog";
import { Icon } from "@/components/icons";

type Props = {
  views: ConnectorView[];
  categories: string[];
  projects: { id: string; name: string }[];
  recent: { id: string; name: string; project: string; projectId: string; since: string }[];
  canManage: boolean;
};
type Filter = "all" | "connected" | "setup" | "available";
const STATE_LABEL = { connected: "Connected", setup: "Needs setup", available: "Available" } as const;
const STATE_CLASS = { connected: "bg-[#e6fbf1] text-[#0b7a4b]", setup: "bg-[#fff4e0] text-[#8a4b00]", available: "bg-surface-2 text-muted" } as const;

export function Monogram({ i, size = 44 }: { i: Pick<Integration, "name" | "color">; size?: number }) {
  const letters = i.name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return <span aria-hidden className="grid shrink-0 place-items-center rounded-xl font-bold text-white" style={{ width: size, height: size, background: i.color, fontSize: size * 0.38 }}>{letters}</span>;
}

/** The service's own logo, served same-origin by /api/connectors/logo; the monogram stands in while it loads or if there is none. */
export function ConnectorLogo({ i, size = 44 }: { i: Pick<Integration, "id" | "name" | "color" | "logo">; size?: number }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!i.logo || failed) return <Monogram i={i} size={size} />;
  const pad = Math.round(size * 0.18);
  return (
    <span aria-hidden className="relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-white" style={{ width: size, height: size }}>
      {loaded ? null : <span className="absolute inset-0"><Monogram i={i} size={size} /></span>}
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny same-origin icons; next/image adds nothing here */}
      <img src={`/api/connectors/logo/${i.id}`} alt="" width={size - pad * 2} height={size - pad * 2} loading="lazy" decoding="async"
        onLoad={(e) => { if (e.currentTarget.naturalWidth < 2) setFailed(true); else setLoaded(true); }} onError={() => setFailed(true)}
        className={`relative object-contain transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`} style={{ width: size - pad * 2, height: size - pad * 2 }} />
    </span>
  );
}

/** Connector marketplace: search, status and category filters, suggestions, and a detail panel per connector. */
export function ConnectorHub({ views, categories, projects, recent, canManage }: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return views.filter((v) => (filter === "all" || v.state === filter) && (!cat || v.integration.category === cat)
      && (!t || [v.integration.name, v.integration.category, v.integration.description, v.integration.usedBy, ...v.integration.secrets.map((s) => s.name)].join(" ").toLowerCase().includes(t)));
  }, [views, q, filter, cat]);
  const counts = { connected: views.filter((v) => v.state === "connected").length, setup: views.filter((v) => v.state === "setup").length, available: views.filter((v) => v.state === "available").length };
  const browsing = !q && filter === "all" && !cat;
  const suggested = views.filter((v) => v.reasons.length);
  const current = views.find((v) => v.integration.id === open) ?? null;

  const show = (id: string | null, el?: HTMLElement) => {
    if (el) opener.current = el;
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("c", id); else url.searchParams.delete("c");
    window.history.replaceState(null, "", url);
    setOpen(id);
    if (!id) setTimeout(() => opener.current?.focus(), 0);
  };
  useEffect(() => { setOpen(new URLSearchParams(window.location.search).get("c")); }, []);

  const card = (v: ConnectorView) => (
    <li key={v.integration.id}>
      <button type="button" onClick={(e) => show(v.integration.id, e.currentTarget)} aria-haspopup="dialog" className="panel flex h-full w-full flex-col p-4 text-left transition hover:-translate-y-0.5 hover:border-accent">
        <span className="flex items-start gap-3">
          <ConnectorLogo i={v.integration} />
          <span className="min-w-0 flex-1"><span className="block font-semibold">{v.integration.name}</span><span className="block text-xs text-muted">{v.integration.category}</span></span>
          <span className={`pill shrink-0 text-[11px] ${STATE_CLASS[v.state]}`}>{STATE_LABEL[v.state]}</span>
        </span>
        <span className="mt-2 block text-sm">{v.integration.description}</span>
        <span className="mt-auto block pt-2 text-xs text-muted">
          {v.connected.length ? `Connected in ${v.connected.map((c) => c.name).slice(0, 2).join(", ")}${v.connected.length > 2 ? ` +${v.connected.length - 2}` : ""}` : v.reasons[0] ?? v.integration.usedBy}
        </span>
      </button>
    </li>
  );
  const grid = (list: ConnectorView[]) => <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map(card)}</ul>;
  const section = (id: string, title: string, sub: string, list: ConnectorView[]) => list.length ? (
    <section aria-labelledby={id} className="mt-8"><h2 id={id} className="text-xl">{title}</h2><p className="text-sm text-muted">{sub}</p>{grid(list)}</section>
  ) : null;

  return (
    <div>
      <div className="rounded-[22px] border border-border bg-surface p-4">
        <div className="relative"><Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <label htmlFor="cq" className="sr-only">Search connectors</label>
          <input id="cq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${views.length} connectors: payments, email, Shopify, Notion…`} className="input min-h-12 pl-11" autoComplete="off" /></div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Status" className="flex flex-wrap gap-1.5">
            {([["all", `All · ${views.length}`], ["connected", `Connected · ${counts.connected}`], ["setup", `Needs setup · ${counts.setup}`], ["available", `Available · ${counts.available}`]] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={`min-h-9 rounded-full border px-3 text-sm font-semibold ${filter === k ? "border-accent bg-accent text-accent-contrast" : "border-border text-muted hover:text-text"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div role="group" aria-label="Category" className="mt-2 flex flex-wrap gap-1.5">
          {["", ...categories].map((c) => (
            <button key={c || "all"} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={`min-h-8 rounded-full border px-3 text-xs font-semibold ${cat === c ? "border-text bg-text text-surface" : "border-border text-muted hover:text-text"}`}>
              {c || "Every category"} <span className="font-normal opacity-70">{c ? views.filter((v) => v.integration.category === c).length : ""}</span>
            </button>
          ))}
        </div>
      </div>

      {browsing ? (
        <>
          {section("c-suggested", "Suggested for your workspace", "Based on the backends, hosts and automation steps your projects already use.", suggested)}
          {section("c-connected", "Connected", "Working in at least one project.", views.filter((v) => v.state === "connected"))}
          {section("c-setup", "Needs setup", "Some keys are in place; the rest are missing.", views.filter((v) => v.state === "setup"))}
          {recent.length ? (
            <section aria-labelledby="c-recent" className="mt-8"><h2 id="c-recent" className="text-xl">Recently connected</h2>
              <ul className="mt-3 grid gap-2">{recent.map((r) => <li key={r.id + r.projectId} className="flex items-center gap-3 text-sm"><ConnectorLogo i={views.find((v) => v.integration.id === r.id)!.integration} size={28} /><span><strong>{r.name}</strong> in {r.project}</span><time className="ml-auto text-xs text-muted" dateTime={r.since}>{r.since.slice(0, 10)}</time></li>)}</ul>
            </section>
          ) : null}
          {categories.map((c) => { const list = views.filter((v) => v.integration.category === c); return <div key={c}>{section(`c-${c.replace(/\W+/g, "-")}`, c, `${list.length} connector${list.length === 1 ? "" : "s"}`, list)}</div>; })}
        </>
      ) : (
        <section aria-live="polite" className="mt-6">
          <p className="text-sm text-muted">{shown.length} connector{shown.length === 1 ? "" : "s"} <button type="button" className="font-semibold text-accent" onClick={() => { setQ(""); setFilter("all"); setCat(""); }}>Clear</button></p>
          {shown.length ? grid(shown) : <p className="mt-6 rounded-[22px] border border-dashed border-border p-8 text-center text-sm text-muted">No connector matches. Any service with an API can still be used: add its key on a project&apos;s Secrets tab and ask the agents to integrate it.</p>}
        </section>
      )}

      {current ? <ConnectorPanel v={current} projects={projects} canManage={canManage} onClose={() => show(null)} /> : null}
    </div>
  );
}

function ConnectorPanel({ v, projects, canManage, onClose }: { v: ConnectorView; projects: { id: string; name: string }[]; canManage: boolean; onClose: () => void }) {
  const i = v.integration;
  const ref = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState(projects.find((p) => !v.connected.some((c) => c.id === p.id))?.id ?? projects[0]?.id ?? "");
  useEffect(() => { ref.current?.focus(); }, [i.id]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="cp-title" tabIndex={-1} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} className="h-full w-[min(30rem,100%)] overflow-y-auto bg-surface p-6 shadow-2xl outline-none">
        <div className="flex items-start gap-3">
          <ConnectorLogo key={i.id} i={i} size={52} />
          <div className="min-w-0 flex-1"><h2 id="cp-title" className="text-2xl">{i.name}</h2><p className="text-sm text-muted">{i.category} · {STATE_LABEL[v.state]}</p></div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface-2"><Icon name="close" size={18} /></button>
        </div>
        <p className="mt-4">{i.description}</p>
        <p className="mt-1 text-sm text-muted">Used by: {i.usedBy}.{i.native ? "" : " The agents write the integration in your app when you ask for the feature."}</p>
        {v.reasons.length ? <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">Suggested: {v.reasons.join("; ")}.</p> : null}

        <h3 className="mt-6 font-semibold">Connect</h3>
        {projects.length ? (canManage ? (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="grid flex-1 gap-1 text-sm">Project<select value={target} onChange={(e) => setTarget(e.target.value)} className="input">{projects.map((p) => <option key={p.id} value={p.id}>{p.name}{v.connected.some((c) => c.id === p.id) ? " (connected)" : ""}</option>)}</select></label>
            <a href={i.secrets.length ? `/projects/${target}/secrets?connect=${i.id}#set-secret` : `/projects/${target}/secrets#set-secret`} className="btn btn-primary min-h-11">Add keys</a>
          </div>
        ) : <p className="mt-1 text-sm text-muted">Only owners and admins can add keys.</p>) : <p className="mt-1 text-sm text-muted">Create a project first — connectors belong to a project.</p>}
        <p className="mt-2 text-xs text-muted">Keys are encrypted with a fresh key per value and never shown again — not to you, the agents or Keelwork staff.</p>

        <h3 className="mt-6 font-semibold">What access this gives</h3>
        <p className="mt-1 text-sm">{i.access}</p>
        <h3 className="mt-5 font-semibold">Keys it needs</h3>
        {i.secrets.length ? null : <p className="mt-1 text-sm">None fixed — you choose the names. Use capitals and underscores, for example <code className="text-xs">ACME_API_KEY</code>.</p>}
        <ul className="mt-1 grid gap-1 text-sm">{i.secrets.map((s) => <li key={s.name}><code className="text-xs">{s.name}</code> <span className="text-muted">— {s.hint}{s.name.startsWith("NEXT_PUBLIC_") ? " (visible in the browser by design)" : " (server only)"}</span></li>)}</ul>
        <h3 className="mt-5 font-semibold">Where to get them</h3>
        <p className="mt-1 text-sm">{i.setup}</p>
        {i.custom ? null : <p className="mt-2 flex flex-wrap gap-4">
          {i.docs !== i.site ? <a href={i.docs} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-accent">{i.name} docs <Icon name="external" size={14} /></a> : null}
          <a href={i.site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-accent">Visit {i.name} <Icon name="external" size={14} /></a>
        </p>}

        {v.connected.length || v.partial.length ? <>
          <h3 className="mt-6 font-semibold">In your projects</h3>
          <ul className="mt-2 grid gap-2 text-sm">
            {v.connected.map((c) => <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"><span><strong>{c.name}</strong> · connected {c.since.slice(0, 10)}</span><a href={`/projects/${c.id}/secrets`} className="text-xs font-semibold text-accent">Manage or disconnect</a></li>)}
            {v.partial.map((c) => <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"><span><strong>{c.name}</strong> · missing {c.missing.join(", ")}</span><a href={`/projects/${c.id}/secrets?connect=${i.id}#set-secret`} className="text-xs font-semibold text-accent">Finish setup</a></li>)}
          </ul>
          <p className="mt-2 text-xs text-muted">To disconnect, delete its keys on the project&apos;s Secrets tab. Features that use it stop working until you add them again.</p>
        </> : null}
      </div>
    </div>
  );
}
