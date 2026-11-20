/** Loading layouts shaped like the content they stand in for, so nothing jumps when it arrives. */
const B = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => <div className={`kw-skeleton ${className}`} style={style} />;

export function HeaderSkeleton() {
  return <div className="mb-6"><B className="h-9 w-56" /><B className="mt-3 h-4 w-full max-w-xl" /></div>;
}

export function CardGridSkeleton({ count = 6, thumb = true }: { count?: number; thumb?: boolean }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="panel p-4">
          {thumb ? <B className="aspect-[4/3] w-full rounded-xl" /> : null}
          <B className={`${thumb ? "mt-4" : ""} h-5 w-2/3`} /><B className="mt-2 h-3.5 w-full" /><B className="mt-1.5 h-3.5 w-4/5" />
          <div className="mt-4 flex gap-2"><B className="h-10 flex-1 rounded-full" /><B className="h-10 w-24 rounded-full" /></div>
        </li>
      ))}
    </ul>
  );
}

export function StatSkeleton({ count = 4 }: { count?: number }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>{Array.from({ length: count }, (_, i) => <div key={i} className="panel p-4"><B className="h-3.5 w-24" /><B className="mt-3 h-7 w-16" /></div>)}</div>;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="panel overflow-hidden" aria-hidden>
      <div className="flex gap-4 border-b border-border p-4">{[40, 25, 20, 15].map((w) => <B key={w} className="h-3.5" style={{ width: `${w}%` }} />)}</div>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0"><B className="h-4 w-[35%]" /><B className="h-4 w-[22%]" /><B className="h-4 w-[18%]" /><B className="ml-auto h-6 w-16 rounded-full" /></div>)}
    </div>
  );
}

/** Wraps a skeleton with an announcement for screen readers. */
export function Loading({ label, children }: { label: string; children: React.ReactNode }) {
  return <div role="status" aria-live="polite" aria-busy="true"><span className="sr-only">{label}</span>{children}</div>;
}
