"use client";
import { useEffect, useMemo, useState } from "react";
import type { AppTemplate, Module, Screen, Tone } from "@/lib/apps/types";
import { Art } from "@/components/sites/art";
import { Icon } from "@/components/icons";

export type PreviewState = "normal" | "empty" | "loading" | "error";

/**
 * Draws an app template as a working preview: navigation between screens,
 * searchable and filterable tables with detail drawers, pipelines you can
 * advance, inboxes you can reply in, multi-step forms with validation and a
 * success state, calendars, catalogs with a cart. `state` shows how every
 * data module handles empty, loading and error states.
 */
export function AppPreview({ app, initialScreen, state: initialState = "normal" }: { app: AppTemplate; initialScreen?: string; state?: PreviewState }) {
  const [screenSlug, setScreen] = useState(initialScreen && app.screens.some((s) => s.slug === initialScreen) ? initialScreen : app.screens[0]!.slug);
  const [state, setState] = useState<PreviewState>(initialState);
  const [menu, setMenu] = useState(false);
  // The gallery can ask for a state (?state=empty|loading|error) to show how screens handle it.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("state");
    if (q === "empty" || q === "loading" || q === "error") setState(q);
  }, []);
  const screen = app.screens.find((s) => s.slug === screenSlug)!;
  const p = app.palette;
  const vars = { "--bg": p.bg, "--surface": p.surface, "--ink": p.ink, "--muted": p.muted, "--accent": p.accent, "--accent2": p.accent2, "--soft": p.soft, "--line": p.line, "--on": p.onAccent } as React.CSSProperties;
  const go = (s: Screen) => { setScreen(s.slug); setMenu(false); };

  const body = <ScreenBody screen={screen} app={app} state={state} retry={() => setState("normal")} />;
  return (
    <div style={vars} className="kw-app min-h-dvh bg-[var(--bg)] text-[var(--ink)] [font-family:var(--kw-grotesk),system-ui,sans-serif]">
      <style>{APP_CSS}</style>
      {app.shell === "admin" ? (
        <div className="kw-app-admin">
          <aside className="kw-app-side" aria-label={`${app.brand} navigation`}>
            <div className="flex items-center gap-2 px-3 py-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] text-sm font-bold text-[var(--on)]">{app.brand[0]}</span><span className="font-bold">{app.brand}</span></div>
            <nav><ul className="grid gap-0.5 px-2">{app.screens.map((s) => (
              <li key={s.slug}><button type="button" onClick={() => go(s)} aria-current={s.slug === screenSlug ? "page" : undefined} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium ${s.slug === screenSlug ? "bg-[var(--soft)] text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--soft)_60%,transparent)]"}`}><Icon name={s.icon} size={18} />{s.label}</button></li>
            ))}</ul></nav>
            {app.user ? <div className="mt-auto flex items-center gap-2 border-t border-[var(--line)] px-4 py-3 text-sm"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--soft)] text-xs font-bold text-[var(--accent)]">{app.user.name.split(" ").map((w) => w[0]).join("")}</span><span><span className="block font-semibold">{app.user.name}</span><span className="block text-xs text-[var(--muted)]">{app.user.role}</span></span></div> : null}
          </aside>
          <div className="min-w-0 flex-1">
            <header className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-3">
              <span className="kw-app-mobilebrand font-bold">{app.brand}</span>
              <label className="relative ml-auto hidden max-w-xs flex-1 sm:block"><span className="sr-only">Search</span><Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input placeholder={`Search ${app.brand}…`} className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]" /></label>
              <button type="button" aria-label="Notifications" className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--soft)]"><Icon name="bell" size={18} /></button>
            </header>
            <nav className="kw-app-tabs border-b border-[var(--line)] bg-[var(--surface)]" aria-label="Screens"><ul className="flex gap-1 overflow-x-auto px-3 py-2">{app.screens.map((s) => <li key={s.slug}><button type="button" onClick={() => go(s)} aria-current={s.slug === screenSlug ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${s.slug === screenSlug ? "bg-[var(--accent)] text-[var(--on)]" : "text-[var(--muted)]"}`}>{s.label}</button></li>)}</ul></nav>
            <main className="p-5 sm:p-7">{body}</main>
          </div>
        </div>
      ) : (
        <div>
          <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
              <button type="button" onClick={() => go(app.screens[0]!)} className="flex items-center gap-2 font-bold"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent)] text-sm text-[var(--on)]">{app.brand[0]}</span>{app.brand}</button>
              <nav className="kw-app-topnav ml-auto" aria-label="Main"><ul className="flex gap-1">{app.screens.map((s) => <li key={s.slug}><button type="button" onClick={() => go(s)} aria-current={s.slug === screenSlug ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-sm font-medium ${s.slug === screenSlug ? "bg-[var(--soft)] text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>{s.label}</button></li>)}</ul></nav>
              <button type="button" className="kw-app-burger ml-auto grid h-10 w-10 place-items-center rounded-lg border border-[var(--line)]" aria-expanded={menu} aria-label="Menu" onClick={() => setMenu(!menu)}><Icon name={menu ? "close" : "more"} /></button>
            </div>
            {menu ? <nav className="kw-app-sheet border-t border-[var(--line)] px-5 py-3" aria-label="Main"><ul className="grid gap-1">{app.screens.map((s) => <li key={s.slug}><button type="button" onClick={() => go(s)} className="w-full rounded-lg px-3 py-2.5 text-left font-medium hover:bg-[var(--soft)]">{s.label}</button></li>)}</ul></nav> : null}
          </header>
          <main className="mx-auto max-w-6xl px-5 py-8">{body}</main>
          <footer className="border-t border-[var(--line)] bg-[var(--surface)] px-5 py-8 text-sm text-[var(--muted)]"><div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3"><span className="font-semibold text-[var(--ink)]">{app.brand}</span><span>{app.screens.map((s) => s.label).join(" · ")}</span><span>Privacy · Terms · Contact</span></div></footer>
        </div>
      )}
    </div>
  );
}

function ScreenBody({ screen, app, state, retry }: { screen: Screen; app: AppTemplate; state: PreviewState; retry: () => void }) {
  return (
    <div className="grid gap-6">
      {screen.modules[0]?.m === "hero" ? null : (
        <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{screen.title}</h1>{screen.sub ? <p className="mt-1 text-[var(--muted)]">{screen.sub}</p> : null}</div>
      )}
      {screen.modules.map((m, i) => <ModuleView key={`${screen.slug}-${i}`} m={m} app={app} state={state} retry={retry} />)}
    </div>
  );
}

const TONE: Record<Tone, string> = { good: "#0f7a4b", warn: "#a15c00", bad: "#b42318", info: "#1d4ed8", neutral: "#5d6470" };
function Pill({ text, tone = "neutral" }: { text: string; tone?: Tone }) {
  return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: TONE[tone], background: `color-mix(in srgb, ${TONE[tone]} 12%, transparent)` }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE[tone] }} />{text}</span>;
}
const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <section className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] ${className}`}>{children}</section>;
const H = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4"><h2 className="font-semibold">{children}</h2>{right}</div>;
const Btn = ({ children, onClick, ghost, type = "button", disabled }: { children: React.ReactNode; onClick?: () => void; ghost?: boolean; type?: "button" | "submit"; disabled?: boolean }) => (
  <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-50 ${ghost ? "border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--soft)]" : "bg-[var(--accent)] text-[var(--on)] hover:brightness-110"}`}>{children}</button>
);

function StateView({ state, title, retry }: { state: PreviewState; title: string; retry: () => void }) {
  if (state === "loading") return <Panel className="p-5"><div className="h-4 w-40 animate-pulse rounded bg-[var(--soft)]" /><div className="mt-4 grid gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--soft)_70%,transparent)]" />)}</div><span className="sr-only">Loading {title}</span></Panel>;
  if (state === "error") return <Panel className="grid justify-items-center gap-2 p-8 text-center" ><span className="grid h-11 w-11 place-items-center rounded-full" style={{ background: "color-mix(in srgb, #b42318 12%, transparent)", color: "#b42318" }}><Icon name="warning" /></span><p className="font-semibold">Couldn&apos;t load {title.toLowerCase()}</p><p className="text-sm text-[var(--muted)]">The connection dropped. Your data is safe — try again.</p><Btn ghost onClick={retry}>Try again</Btn></Panel>;
  return <Panel className="grid justify-items-center gap-2 p-8 text-center"><span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--soft)] text-[var(--accent)]"><Icon name="inbox" /></span><p className="font-semibold">No {title.toLowerCase()} yet</p><p className="text-sm text-[var(--muted)]">When there&apos;s something here, you&apos;ll see it straight away.</p></Panel>;
}

function ModuleView({ m, app, state, retry }: { m: Module; app: AppTemplate; state: PreviewState; retry: () => void }) {
  const data = !["hero", "features", "split", "form"].includes(m.m);
  if (data && state !== "normal") return <StateView state={state} title={"title" in m ? m.title : m.m === "kpis" ? "Metrics" : m.m === "accounts" ? "Accounts" : "Items"} retry={retry} />;
  switch (m.m) {
    case "kpis": return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{m.items.map((k) => (
        <Panel key={k.label} className="p-4"><p className="text-sm text-[var(--muted)]">{k.label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{k.value}</p>{k.delta ? <p className="mt-1 text-xs font-semibold" style={{ color: TONE[k.tone ?? "good"] }}>{k.delta}</p> : null}</Panel>
      ))}</div>
    );
    case "chart": return <Chart m={m} />;
    case "table": return <Table m={m} />;
    case "kanban": return <Kanban m={m} />;
    case "inbox": return <Inbox m={m} />;
    case "form": return <Form m={m} />;
    case "calendar": return <Calendar m={m} />;
    case "catalog": return <Catalog m={m} app={app} />;
    case "progress": return (
      <Panel className="pb-4"><H>{m.title}</H><ul className="mt-3 grid gap-4 px-5">{m.items.map((it) => (
        <li key={it.title}><div className="flex justify-between gap-3 text-sm"><span className="font-semibold">{it.title}</span><span className="text-[var(--muted)]">{it.pct}%</span></div><p className="text-xs text-[var(--muted)]">{it.meta}</p><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--soft)]" role="progressbar" aria-valuenow={it.pct} aria-valuemin={0} aria-valuemax={100} aria-label={it.title}><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${it.pct}%` }} /></div></li>
      ))}</ul></Panel>
    );
    case "feed": return (
      <Panel className="pb-3"><H>{m.title}</H><ul className="mt-2">{m.items.map((it, i) => (
        <li key={i} className="flex gap-3 border-t border-[var(--line)] px-5 py-3 text-sm first:border-t-0"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" /><span className="flex-1"><span className="font-semibold">{it.who}</span> {it.what}</span><span className="shrink-0 text-xs text-[var(--muted)]">{it.when}</span></li>
      ))}</ul></Panel>
    );
    case "hero": return (
      <section className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr]">
        <div>{m.eyebrow ? <p className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)]">{m.eyebrow}</p> : null}<h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">{m.title}</h1><p className="mt-4 max-w-lg text-lg text-[var(--muted)]">{m.sub}</p><div className="mt-6 flex flex-wrap gap-2"><Btn>{m.cta}</Btn>{m.secondary ? <Btn ghost>{m.secondary}</Btn> : null}</div>{m.stats ? <dl className="mt-8 flex flex-wrap gap-8">{m.stats.map(([v, l]) => <div key={l}><dt className="text-2xl font-bold">{v}</dt><dd className="text-sm text-[var(--muted)]">{l}</dd></div>)}</dl> : null}</div>
        <div className="overflow-hidden rounded-3xl border border-[var(--line)]"><Art kind={m.art} palette={app.palette} seed={m.seed} alt="" className="aspect-[4/3] h-full w-full" /></div>
      </section>
    );
    case "features": return (
      <section><h2 className="text-xl font-bold">{m.title}</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{m.items.map((f) => <li key={f.title}><Panel className="h-full p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--soft)] text-[var(--accent)]"><Icon name={f.icon} /></span><p className="mt-3 font-semibold">{f.title}</p><p className="mt-1 text-sm text-[var(--muted)]">{f.body}</p></Panel></li>)}</ul></section>
    );
    case "accounts": return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{m.items.map((a, i) => (
        <div key={a.number} className="rounded-2xl p-5 text-[var(--on)] shadow-sm" style={{ background: i === 0 ? `linear-gradient(135deg, var(--accent), var(--accent2))` : `linear-gradient(135deg, var(--ink), color-mix(in srgb, var(--ink) 70%, var(--accent)))` }}>
          <p className="text-sm opacity-85">{a.name}</p><p className="mt-3 text-2xl font-bold tracking-tight">{a.balance}</p><p className="mt-4 flex justify-between font-mono text-xs opacity-85"><span>{a.number}</span><span>{a.note}</span></p>
        </div>
      ))}</div>
    );
    case "split": return <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"><div className="grid content-start gap-6">{m.left.map((x, i) => <ModuleView key={i} m={x} app={app} state={state} retry={retry} />)}</div><div className="grid content-start gap-6">{m.right.map((x, i) => <ModuleView key={i} m={x} app={app} state={state} retry={retry} />)}</div></div>;
  }
}

function Chart({ m }: { m: Extract<Module, { m: "chart" }> }) {
  const ranges = m.ranges ?? [];
  const [range, setRange] = useState(ranges[ranges.length - 1] ?? "");
  const take = ranges.length ? Math.max(3, Math.round((m.labels.length * (ranges.indexOf(range) + 1)) / ranges.length)) : m.labels.length;
  const labels = m.labels.slice(-take);
  const series = m.series.map((s) => ({ ...s, values: s.values.slice(-take) }));
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const W = 600, Hh = 200, pad = 28;
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, labels.length - 1);
  const y = (v: number) => Hh - pad - (v / max) * (Hh - pad * 2);
  const colors = ["var(--accent)", "var(--accent2)", "var(--muted)"];
  return (
    <Panel className="pb-4">
      <H right={ranges.length ? <div role="group" aria-label="Range" className="flex rounded-lg border border-[var(--line)] p-0.5">{ranges.map((r) => <button key={r} type="button" aria-pressed={r === range} onClick={() => setRange(r)} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${r === range ? "bg-[var(--soft)] text-[var(--accent)]" : "text-[var(--muted)]"}`}>{r}</button>)}</div> : null}>{m.title}</H>
      <svg viewBox={`0 0 ${W} ${Hh}`} className="mt-2 w-full px-2" role="img" aria-label={`${m.title}: ${series.map((s) => `${s.label} from ${s.values[0]} to ${s.values[s.values.length - 1]}${m.unit ?? ""}`).join("; ")}`}>
        {[0.25, 0.5, 0.75, 1].map((t) => <line key={t} x1={pad} x2={W - pad} y1={y(max * t)} y2={y(max * t)} stroke="var(--line)" />)}
        {m.kind === "bar" ? series.map((s, si) => s.values.map((v, i) => { const bw = ((W - pad * 2) / labels.length) * 0.7 / series.length; const bx = pad + (i * (W - pad * 2)) / labels.length + si * bw + 4; return <rect key={`${si}-${i}`} x={bx} y={y(v)} width={bw} height={Hh - pad - y(v)} rx="3" fill={colors[si]}><title>{`${labels[i]}: ${v}${m.unit ?? ""}`}</title></rect>; }))
          : series.map((s, si) => <g key={s.label}><polyline fill="none" stroke={colors[si]} strokeWidth="2.5" strokeLinejoin="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />{s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={colors[si]}><title>{`${labels[i]}: ${v}${m.unit ?? ""}`}</title></circle>)}</g>)}
        {labels.map((l, i) => (labels.length <= 12 || i % Math.ceil(labels.length / 8) === 0) ? <text key={l + i} x={m.kind === "bar" ? pad + ((i + 0.5) * (W - pad * 2)) / labels.length : x(i)} y={Hh - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{l}</text> : null)}
      </svg>
      <ul className="flex flex-wrap gap-4 px-5 text-xs text-[var(--muted)]">{series.map((s, si) => <li key={s.label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: colors[si] }} />{s.label}</li>)}</ul>
    </Panel>
  );
}

function Table({ m }: { m: Extract<Module, { m: "table" }> }) {
  const [rows, setRows] = useState(m.rows);
  const [q, setQ] = useState("");
  const [f, setF] = useState("All");
  const [open, setOpen] = useState<string[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");
  const values = m.filter !== undefined ? ["All", ...new Set(rows.map((r) => r[m.filter!]!))] : [];
  const shown = rows.filter((r) => (f === "All" || r[m.filter!] === f) && (!q || r.join(" ").toLowerCase().includes(q.toLowerCase())));
  return (
    <Panel className="overflow-hidden">
      <H right={<div className="flex flex-wrap items-center gap-2">
        {m.search ? <label className="relative"><span className="sr-only">{m.search}</span><Icon name="search" size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.search} className="w-44 rounded-lg border border-[var(--line)] bg-[var(--bg)] py-1.5 pl-8 pr-2 text-sm outline-none focus:border-[var(--accent)]" /></label> : null}
        {m.action ? <Btn onClick={() => setAdding(true)}><Icon name="plus" size={16} />{m.action}</Btn> : null}
      </div>}>{m.title}</H>
      {values.length ? <div className="flex flex-wrap gap-1.5 px-5 pt-3" role="group" aria-label={`Filter by ${m.columns[m.filter!]}`}>{values.map((v) => <button key={v} type="button" aria-pressed={f === v} onClick={() => setF(v)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${f === v ? "border-[var(--accent)] bg-[var(--soft)] text-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)]"}`}>{v}{v !== "All" ? ` · ${rows.filter((r) => r[m.filter!] === v).length}` : ""}</button>)}</div> : null}
      {toast ? <p role="status" className="mx-5 mt-3 rounded-lg bg-[var(--soft)] px-3 py-2 text-sm font-semibold text-[var(--accent)]">{toast}</p> : null}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="border-y border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">{m.columns.map((c) => <th key={c} scope="col" className="px-5 py-2.5 font-semibold">{c}</th>)}</tr></thead>
          <tbody>{shown.map((r, i) => (
            <tr key={i} className="cursor-pointer border-b border-[var(--line)] last:border-0 hover:bg-[color-mix(in_srgb,var(--soft)_50%,transparent)]" onClick={() => setOpen(r)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setOpen(r); }}>
              {r.map((cell, ci) => <td key={ci} className={`px-5 py-3 ${ci === 0 ? "font-semibold" : ""}`}>{ci === m.status ? <Pill text={cell} tone={m.tones?.[cell]} /> : cell}</td>)}
            </tr>
          ))}</tbody>
        </table>
        {!shown.length ? <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">Nothing matches “{q || f}”. <button type="button" className="font-semibold text-[var(--accent)]" onClick={() => { setQ(""); setF("All"); }}>Clear filters</button></p> : null}
      </div>
      {open ? <Drawer title={open[0]!} onClose={() => setOpen(null)}><dl className="grid gap-3">{m.columns.map((c, i) => <div key={c}><dt className="text-xs uppercase tracking-wide text-[var(--muted)]">{c}</dt><dd className="mt-0.5 font-medium">{i === m.status ? <Pill text={open[i]!} tone={m.tones?.[open[i]!]} /> : open[i]}</dd></div>)}</dl></Drawer> : null}
      {adding ? <Drawer title={m.action ?? "New"} onClose={() => setAdding(false)}>
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const row = m.columns.map((c) => String(fd.get(c) ?? "").trim() || "—"); setRows([row, ...rows]); setAdding(false); setToast(`${row[0]} added.`); setTimeout(() => setToast(""), 2500); }}>
          {m.columns.map((c, i) => <label key={c} className="grid gap-1 text-sm font-medium">{c}{i === m.status && m.tones ? <select name={c} className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2">{Object.keys(m.tones).map((t) => <option key={t}>{t}</option>)}</select> : <input name={c} required={i === 0} className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]" />}</label>)}
          <Btn type="submit">Save</Btn>
        </form>
      </Drawer> : null}
    </Panel>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} role="presentation">
      <div role="dialog" aria-modal="true" aria-label={title} className="h-full w-[min(26rem,100%)] overflow-y-auto bg-[var(--surface)] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="Close" autoFocus className="grid h-9 w-9 place-items-center rounded-lg hover:bg-[var(--soft)]"><Icon name="close" size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

function Kanban({ m }: { m: Extract<Module, { m: "kanban" }> }) {
  const [cols, setCols] = useState(m.columns);
  const move = (ci: number, ki: number) => setCols((c) => c.map((col, i) => i === ci ? { ...col, cards: col.cards.filter((_, j) => j !== ki) } : i === ci + 1 ? { ...col, cards: [c[ci]!.cards[ki]!, ...col.cards] } : col));
  return (
    <section aria-label={m.title}><h2 className="mb-3 font-semibold">{m.title}</h2>
      <div className="grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">{cols.map((col, ci) => (
        <div key={col.name} className="rounded-2xl bg-[color-mix(in_srgb,var(--soft)_55%,var(--bg))] p-3">
          <p className="mb-2 flex justify-between px-1 text-sm font-semibold">{col.name}<span className="text-[var(--muted)]">{col.cards.length}</span></p>
          <ul className="grid gap-2">{col.cards.map((k, ki) => (
            <li key={k.title} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm shadow-sm">
              <p className="font-semibold">{k.title}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{k.meta}</p>
              <div className="mt-2 flex items-center justify-between">{k.value ? <span className="font-semibold text-[var(--accent)]">{k.value}</span> : <span />}{ci < cols.length - 1 ? <button type="button" onClick={() => move(ci, ki)} className="rounded-md px-2 py-1 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--accent)]" aria-label={`Move ${k.title} to ${cols[ci + 1]!.name}`}>→ {cols[ci + 1]!.name}</button> : null}</div>
            </li>
          ))}{!col.cards.length ? <li className="rounded-xl border border-dashed border-[var(--line)] p-4 text-center text-xs text-[var(--muted)]">Nothing here</li> : null}</ul>
        </div>
      ))}</div>
    </section>
  );
}

function Inbox({ m }: { m: Extract<Module, { m: "inbox" }> }) {
  const [sel, setSel] = useState(0);
  const [replies, setReplies] = useState<Record<number, string[]>>({});
  const [draft, setDraft] = useState("");
  const it = m.items[sel]!;
  return (
    <Panel className="grid overflow-hidden md:grid-cols-[18rem_1fr]">
      <ul className="max-h-[28rem] overflow-y-auto border-b border-[var(--line)] md:border-b-0 md:border-r" aria-label={m.title}>{m.items.map((x, i) => (
        <li key={x.title}><button type="button" onClick={() => setSel(i)} aria-current={i === sel ? "true" : undefined} className={`w-full border-b border-[var(--line)] px-4 py-3 text-left ${i === sel ? "bg-[var(--soft)]" : "hover:bg-[color-mix(in_srgb,var(--soft)_50%,transparent)]"}`}><span className="flex justify-between gap-2 text-sm font-semibold">{x.title}{x.badge ? <Pill text={x.badge} tone="info" /> : null}</span><span className="block text-xs text-[var(--muted)]">{x.meta}</span><span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{x.preview}</span></button></li>
      ))}</ul>
      <div className="flex min-h-[20rem] flex-col p-5">
        <p className="text-lg font-bold">{it.title}</p><p className="text-xs text-[var(--muted)]">{it.meta}</p>
        <div className="mt-4 grid gap-3 text-sm leading-6">{it.body.map((b, i) => <p key={i}>{b}</p>)}{(replies[sel] ?? []).map((r, i) => <p key={`r${i}`} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--accent)] px-4 py-2 text-[var(--on)]">{r}</p>)}</div>
        {m.reply ? <form className="mt-auto flex gap-2 pt-5" onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return; setReplies({ ...replies, [sel]: [...(replies[sel] ?? []), draft.trim()] }); setDraft(""); }}><label className="sr-only" htmlFor="reply">{m.reply}</label><input id="reply" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={m.reply} className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" /><Btn type="submit">Send</Btn></form> : null}
      </div>
    </Panel>
  );
}

function Form({ m }: { m: Extract<Module, { m: "form" }> }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const s = m.steps[step]!;
  const last = step === m.steps.length - 1;
  const next = () => {
    const missing = s.fields.filter((f) => f.required && !values[f.label]?.trim()).map((f) => f.label);
    const badEmail = s.fields.filter((f) => f.type === "email" && values[f.label] && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values[f.label]!)).map((f) => `${f.label} (check the address)`);
    const errs = [...missing, ...badEmail];
    setErrors(errs);
    if (errs.length) return;
    if (last) setDone(true); else setStep(step + 1);
  };
  if (done) return <Panel className="grid justify-items-center gap-2 p-10 text-center"><span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: "color-mix(in srgb, #0f7a4b 14%, transparent)", color: "#0f7a4b" }}><Icon name="check" /></span><p className="text-lg font-bold">{m.success.title}</p><p className="max-w-md text-sm text-[var(--muted)]">{m.success.body}</p><Btn ghost onClick={() => { setDone(false); setStep(0); setValues({}); }}>Start again</Btn></Panel>;
  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-lg font-bold">{m.title}</h2>{m.sub ? <p className="text-sm text-[var(--muted)]">{m.sub}</p> : null}
      {m.steps.length > 1 ? <ol className="mt-4 flex flex-wrap gap-2 text-xs font-semibold" aria-label="Steps">{m.steps.map((x, i) => <li key={x.title} aria-current={i === step ? "step" : undefined} className={`rounded-full px-3 py-1 ${i === step ? "bg-[var(--accent)] text-[var(--on)]" : i < step ? "bg-[var(--soft)] text-[var(--accent)]" : "bg-[var(--bg)] text-[var(--muted)]"}`}>{i < step ? "✓ " : `${i + 1}. `}{x.title}</li>)}</ol> : null}
      {errors.length ? <div role="alert" className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in srgb, #b42318 10%, transparent)", color: "#b42318" }}>Please complete: {errors.join(", ")}</div> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{s.fields.map((f) => {
        const id = `f-${f.label.replace(/\W+/g, "-")}`;
        const invalid = errors.some((e) => e.startsWith(f.label));
        const common = { id, value: values[f.label] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setValues({ ...values, [f.label]: e.target.value }), "aria-invalid": invalid || undefined, className: `w-full rounded-lg border bg-[var(--bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] ${invalid ? "border-[#b42318]" : "border-[var(--line)]"}` };
        return (
          <div key={f.label} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
            <label htmlFor={id} className="mb-1 block text-sm font-medium">{f.label}{f.required ? <span aria-hidden className="text-[var(--accent)]"> *</span> : null}</label>
            {f.type === "select" ? <select {...common}><option value="">Choose…</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>
              : f.type === "textarea" ? <textarea {...common} rows={3} placeholder={f.placeholder} />
              : <input {...common} type={f.type === "money" ? "number" : f.type} placeholder={f.placeholder} inputMode={f.type === "money" ? "decimal" : undefined} />}
          </div>
        );
      })}</div>
      <div className="mt-6 flex justify-between gap-2">{step > 0 ? <Btn ghost onClick={() => { setErrors([]); setStep(step - 1); }}>Back</Btn> : <span />}<Btn onClick={next}>{last ? m.submit : "Continue"}</Btn></div>
    </Panel>
  );
}

function Calendar({ m }: { m: Extract<Module, { m: "calendar" }> }) {
  const [open, setOpen] = useState<(typeof m.events)[number] | null>(null);
  const hours = useMemo(() => { const hs = m.events.flatMap((e) => [parseInt(e.start), parseInt(e.end)]); return { from: Math.min(...hs), to: Math.max(...hs) + 1 }; }, [m.events]);
  const toMin = (t: string) => { const [h, mm] = t.split(":").map(Number); return (h! - hours.from) * 60 + (mm ?? 0); };
  const span = (hours.to - hours.from) * 60;
  return (
    <Panel className="pb-4"><H>{m.title}</H>
      <div className="mt-3 overflow-x-auto px-5"><div className="grid min-w-[640px]" style={{ gridTemplateColumns: `3rem repeat(${m.days.length}, 1fr)` }}>
        <div />{m.days.map((d) => <div key={d} className="pb-2 text-center text-xs font-semibold text-[var(--muted)]">{d}</div>)}
        <div className="relative" style={{ height: span * 0.9 }}>{Array.from({ length: hours.to - hours.from }, (_, i) => <span key={i} className="absolute right-2 text-[10px] text-[var(--muted)]" style={{ top: i * 60 * 0.9 - 6 }}>{hours.from + i}:00</span>)}</div>
        {m.days.map((d, di) => (
          <div key={d} className="relative border-l border-[var(--line)]" style={{ height: span * 0.9, backgroundImage: "repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px 54px)" }}>
            {m.events.filter((e) => e.day === di).map((e) => (
              <button key={e.title + e.start} type="button" onClick={() => setOpen(e)} className="absolute inset-x-1 overflow-hidden rounded-lg px-2 py-1 text-left text-[11px] leading-tight" style={{ top: toMin(e.start) * 0.9, height: Math.max(24, (toMin(e.end) - toMin(e.start)) * 0.9 - 2), background: `color-mix(in srgb, ${TONE[e.tone ?? "info"]} 14%, var(--surface))`, borderLeft: `3px solid ${TONE[e.tone ?? "info"]}` }}>
                <span className="block font-semibold">{e.title}</span><span className="text-[var(--muted)]">{e.start}–{e.end}</span>
              </button>
            ))}
          </div>
        ))}
      </div></div>
      {open ? <Drawer title={open.title} onClose={() => setOpen(null)}><p className="text-sm">{m.days[open.day]} · {open.start}–{open.end}</p>{open.meta ? <p className="mt-2 text-sm text-[var(--muted)]">{open.meta}</p> : null}</Drawer> : null}
    </Panel>
  );
}

function Catalog({ m, app }: { m: Extract<Module, { m: "catalog" }>; app: AppTemplate }) {
  const [tag, setTag] = useState("All");
  const [cart, setCart] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  const [toast, setToast] = useState("");
  const items = m.items.filter((i) => tag === "All" || i.tag === tag);
  const price = (s?: string) => Number((s ?? "").replace(/[^0-9.]/g, "")) || 0;
  const currency = (m.items.find((i) => i.price)?.price ?? "").replace(/[0-9.,\s]/g, "").slice(0, 3) || "$";
  const total = cart.reduce((n, t) => n + price(m.items.find((i) => i.title === t)?.price), 0);
  return (
    <section aria-label={m.title}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{m.title}</h2>
        {m.cart ? <Btn ghost onClick={() => setCartOpen(true)}><Icon name="card" size={16} />Basket · {cart.length}</Btn> : null}</div>
      {m.filters ? <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter">{["All", ...m.filters].map((f) => <button key={f} type="button" aria-pressed={tag === f} onClick={() => setTag(f)} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${tag === f ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on)]" : "border-[var(--line)] bg-[var(--surface)]"}`}>{f}</button>)}</div> : null}
      {toast ? <p role="status" className="mb-3 rounded-lg bg-[var(--soft)] px-3 py-2 text-sm font-semibold text-[var(--accent)]">{toast}</p> : null}
      <ul className={`grid gap-4 sm:grid-cols-2 ${m.cols === 4 ? "lg:grid-cols-4" : m.cols === 2 ? "" : "lg:grid-cols-3"}`}>{items.map((it) => (
        <li key={it.title}><Panel className="flex h-full flex-col overflow-hidden">
          <div className="relative"><Art kind={it.art} palette={app.palette} seed={it.seed} alt={it.title} className="aspect-[4/3] w-full" />{it.badge ? <span className="absolute left-3 top-3 rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold shadow">{it.badge}</span> : null}</div>
          <div className="flex flex-1 flex-col p-4"><p className="font-semibold">{it.title}</p><p className="mt-0.5 text-sm text-[var(--muted)]">{it.meta}</p>
            <div className="mt-auto flex items-center justify-between gap-2 pt-3">{it.price ? <span className="font-bold">{it.price}</span> : <span />}<Btn onClick={() => { if (m.cart) setCart([...cart, it.title]); setToast(`${it.title}: ${m.cart ? "added to your basket" : "saved"}.`); setTimeout(() => setToast(""), 2200); }}>{m.action}</Btn></div>
          </div>
        </Panel></li>
      ))}</ul>
      {cartOpen ? <Drawer title="Your basket" onClose={() => { setCartOpen(false); setPaid(false); }}>
        {paid ? <div className="grid justify-items-center gap-2 py-6 text-center"><span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: "color-mix(in srgb, #0f7a4b 14%, transparent)", color: "#0f7a4b" }}><Icon name="check" /></span><p className="font-bold">Order placed</p><p className="text-sm text-[var(--muted)]">A confirmation is on its way to your email. (Preview — no payment taken.)</p></div>
          : cart.length ? <>
            <ul className="grid gap-2">{cart.map((t, i) => <li key={i} className="flex justify-between gap-2 border-b border-[var(--line)] pb-2 text-sm"><span>{t}</span><span className="flex items-center gap-2">{m.items.find((x) => x.title === t)?.price}<button type="button" aria-label={`Remove ${t}`} onClick={() => setCart(cart.filter((_, j) => j !== i))} className="text-[var(--muted)] hover:text-[var(--ink)]"><Icon name="close" size={14} /></button></span></li>)}</ul>
            <p className="mt-4 flex justify-between font-bold"><span>Total</span><span>{currency}{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></p>
            <div className="mt-4"><Btn onClick={() => { setPaid(true); setCart([]); }}>Check out</Btn></div>
          </> : <p className="py-6 text-center text-sm text-[var(--muted)]">Your basket is empty. Add something you like.</p>}
      </Drawer> : null}
    </section>
  );
}

/** Layout switches for the two shells, by available width (so the device preview is real). */
const APP_CSS = `
.kw-app-admin{display:flex;min-height:100dvh}
.kw-app-side{display:flex;flex-direction:column;width:15rem;flex-shrink:0;border-right:1px solid var(--line);background:var(--surface);position:sticky;top:0;height:100dvh}
.kw-app-tabs,.kw-app-mobilebrand{display:none}
.kw-app-burger,.kw-app-sheet{display:none}
@media (max-width: 900px){.kw-app-side{display:none}.kw-app-tabs{display:block}.kw-app-mobilebrand{display:inline}}
@media (max-width: 760px){.kw-app-topnav{display:none}.kw-app-burger{display:grid}.kw-app-sheet{display:block}}
`;
