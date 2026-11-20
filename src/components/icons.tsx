/**
 * Keelwork's one icon set: 24×24 grid, 1.75 stroke, round caps and joins,
 * drawn with currentColor so icons take the text colour around them. The
 * website templates use the same style (components/sites/icons.tsx).
 * Decorative by default (aria-hidden); give a `label` when an icon carries
 * meaning on its own — and prefer IconButton for icon-only actions.
 */
export const ICONS = {
  plus: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.3-4.3",
  edit: "M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4",
  trash: "M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3",
  save: "M5 3h11l3 3v15H5z M8 3v6h8V3 M8 21v-7h8v7",
  share: "M18 8a3 3 0 100-6 3 3 0 000 6z M6 15a3 3 0 100-6 3 3 0 000 6z M18 22a3 3 0 100-6 3 3 0 000 6z M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4",
  download: "M12 3v12 M7 10l5 5 5-5 M4 21h16",
  upload: "M12 21V9 M7 14l5-5 5 5 M4 3h16",
  bell: "M6 16V11a6 6 0 0112 0v5l2 2H4z M10 21h4",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  filter: "M3 5h18l-7 8v6l-4 2v-8z",
  sort: "M7 4v16 M3 8l4-4 4 4 M17 20V4 M13 16l4 4 4-4",
  info: "M12 21a9 9 0 100-18 9 9 0 000 18z M12 11v5 M12 8h.01",
  warning: "M12 3l10 18H2z M12 10v4 M12 17.5h.01",
  success: "M12 21a9 9 0 100-18 9 9 0 000 18z M8 12.5l2.5 2.5L16 9.5",
  error: "M12 21a9 9 0 100-18 9 9 0 000 18z M15 9l-6 6 M9 9l6 6",
  chevronDown: "M6 9l6 6 6-6",
  chevronRight: "M9 6l6 6-6 6",
  more: "M5 12h.01 M12 12h.01 M19 12h.01",
  copy: "M9 9h11v11H9z M5 15H4V4h11v1",
  check: "M5 12.5l4.5 4.5L19 7",
  close: "M6 6l12 12 M18 6L6 18",
  folder: "M3 6h6l2 2h10v11H3z",
  rocket: "M12 15l-3-3c1-4 4-8 10-9-1 6-5 9-9 10z M9 12l-4 1-2 4 4-1 M12 15l-1 4 4-2 1-4 M15 9h.01",
  sparkles: "M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  layers: "M12 3l9 5-9 5-9-5z M3 13l9 5 9-5 M3 17.5l9 5 9-5",
  database: "M12 8c5 0 8-1.3 8-3s-3-3-8-3-8 1.3-8 3 3 3 8 3z M4 5v14c0 1.7 3 3 8 3s8-1.3 8-3V5 M4 12c0 1.7 3 3 8 3s8-1.3 8-3",
  code: "M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M8.5 12l2.5 2.5 4.5-5",
  flask: "M9 3h6 M10 3v6L4.5 19a1.5 1.5 0 001.3 2h12.4a1.5 1.5 0 001.3-2L14 9V3 M7 15h10",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  plug: "M9 2v5 M15 2v5 M6 7h12v4a6 6 0 01-12 0z M12 17v5",
  key: "M15 9a4 4 0 11-3.6 5.7L4 22H2v-3l7.3-7.3A4 4 0 0115 9z M16 8h.01",
  users: "M9 11a4 4 0 100-8 4 4 0 000 8z M2 21c0-4 3-6 7-6s7 2 7 6 M17 11a3 3 0 100-6 M18 15c2.5.5 4 2.5 4 6",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18z M3 12h18 M12 3c3 3.5 3 14.5 0 18 M12 3c-3 3.5-3 14.5 0 18",
  layout: "M3 4h18v16H3z M3 9h18 M9 9v11",
  chat: "M4 5h16v11H9l-5 4z M8 10h8",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l3 2",
  archive: "M3 4h18v4H3z M5 8v12h14V8 M10 12h4",
  play: "M7 4l13 8-13 8z",
  external: "M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6",
  history: "M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8 M3 3v5h5 M12 7v5l3 2",
  card: "M3 6h18v12H3z M3 10h18 M7 15h3",
  workflow: "M5 8a3 3 0 100-6 3 3 0 000 6z M19 22a3 3 0 100-6 3 3 0 000 6z M5 8v5a3 3 0 003 3h8",
  inbox: "M3 13l3-8h12l3 8 M3 13v6h18v-6 M3 13h5l1 3h6l1-3h5",
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, label, className = "", strokeWidth = 1.75 }: { name: IconName; size?: number; label?: string; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={`inline-block shrink-0 align-[-0.2em] ${className}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <path d={ICONS[name]} />
    </svg>
  );
}

/**
 * Icon-only action: always has an accessible name, a tooltip on hover and
 * keyboard focus, a visible hover state and a focus ring.
 */
export function IconButton({ icon, label, onClick, href, type = "button", className = "", disabled }: {
  icon: IconName; label: string; onClick?: () => void; href?: string; type?: "button" | "submit"; className?: string; disabled?: boolean;
}) {
  const cls = `kw-icon-btn ${className}`;
  if (href) return <a href={href} className={cls} aria-label={label} data-tip={label}><Icon name={icon} /></a>;
  return <button type={type} onClick={onClick} disabled={disabled} className={cls} aria-label={label} data-tip={label}><Icon name={icon} /></button>;
}
