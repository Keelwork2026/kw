import type { AppTemplate, Module } from "@/lib/apps/types";
import { Art } from "@/components/sites/art";

const flat = (ms: Module[]): Module[] => ms.flatMap((m) => (m.m === "split" ? flat([...m.left, ...m.right]) : [m]));

/** A miniature of the app's first screen, drawn from its real data (shell, title, metrics, chart or hero). */
export function AppThumb({ app, className = "" }: { app: AppTemplate; className?: string }) {
  const p = app.palette;
  const screen = app.screens[0]!;
  const mods = flat(screen.modules);
  const kpis = mods.find((m) => m.m === "kpis");
  const chart = mods.find((m) => m.m === "chart");
  const hero = mods.find((m) => m.m === "hero");
  const catalog = mods.find((m) => m.m === "catalog");
  const values = chart?.m === "chart" ? chart.series[0]!.values : [];
  const max = Math.max(1, ...values);
  return (
    <div className={`relative aspect-[4/3] overflow-hidden ${className}`} style={{ background: p.bg, color: p.ink }} aria-hidden>
      {app.shell === "admin" ? (
        <div className="flex h-full">
          <div className="w-[22%] shrink-0 p-2" style={{ background: p.surface, borderRight: `1px solid ${p.line}` }}>
            <div className="mb-2 flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ background: p.accent }} /><span className="truncate text-[8px] font-bold">{app.brand}</span></div>
            {app.screens.map((s, i) => <div key={s.slug} className="mb-1 truncate rounded px-1 py-0.5 text-[7px]" style={i === 0 ? { background: p.soft, color: p.accent } : { color: p.muted }}>{s.label}</div>)}
          </div>
          <div className="min-w-0 flex-1 p-2.5">
            <p className="truncate text-[11px] font-bold">{screen.title}</p>
            {kpis?.m === "kpis" ? <div className="mt-1.5 grid grid-cols-2 gap-1">{kpis.items.slice(0, 4).map((k) => <div key={k.label} className="rounded p-1" style={{ background: p.surface, border: `1px solid ${p.line}` }}><p className="truncate text-[6px]" style={{ color: p.muted }}>{k.label}</p><p className="truncate text-[9px] font-bold">{k.value}</p></div>)}</div> : null}
            {values.length ? (
              <div className="mt-1.5 flex h-[34%] items-end gap-[3px] rounded p-1.5" style={{ background: p.surface, border: `1px solid ${p.line}` }}>
                {values.slice(-10).map((v, i) => <span key={i} className="flex-1 rounded-sm" style={{ height: `${(v / max) * 100}%`, background: i % 2 ? p.accent2 : p.accent, opacity: 0.85 }} />)}
              </div>
            ) : (
              <div className="mt-1.5 grid gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className="flex items-center gap-1 rounded p-1" style={{ background: p.surface, border: `1px solid ${p.line}` }}><span className="h-1.5 w-8 rounded" style={{ background: p.soft }} /><span className="ml-auto h-1.5 w-5 rounded-full" style={{ background: i % 2 ? p.accent2 : p.accent, opacity: 0.6 }} /></div>)}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-full">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ borderBottom: `1px solid ${p.line}`, background: p.surface }}>
            <span className="h-3 w-3 rounded-full" style={{ background: p.accent }} /><span className="truncate text-[8px] font-bold">{app.brand}</span>
            <span className="ml-auto flex gap-1.5">{app.screens.slice(0, 3).map((s) => <span key={s.slug} className="text-[7px]" style={{ color: p.muted }}>{s.label}</span>)}</span>
          </div>
          {hero?.m === "hero" ? (
            <div className="grid h-[calc(100%-25px)] grid-cols-[1.1fr_1fr] items-center gap-2 p-2.5">
              <div><p className="line-clamp-3 text-[12px] font-bold leading-[1.1]">{hero.title}</p><span className="mt-1.5 inline-block rounded px-1.5 py-0.5 text-[7px] font-semibold" style={{ background: p.accent, color: p.onAccent }}>{hero.cta}</span>
                {catalog?.m === "catalog" ? <p className="mt-1.5 truncate text-[7px]" style={{ color: p.muted }}>{catalog.items.length} {catalog.title.toLowerCase()}</p> : null}</div>
              <div className="h-full overflow-hidden rounded-md"><Art kind={hero.art} palette={p} seed={hero.seed} alt="" className="h-full w-full" /></div>
            </div>
          ) : <p className="p-3 text-[12px] font-bold">{screen.title}</p>}
        </div>
      )}
    </div>
  );
}
