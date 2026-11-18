import Link from "next/link";

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight">
      <span aria-hidden className="logo-mark inline-block h-7 w-7 rounded-[9px]" />
      {compact ? <span className="sr-only">Keelwork</span> : <span>Keelwork</span>}
    </Link>
  );
}
