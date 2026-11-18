import type { IconName } from "./menu-data";

const PATHS: Record<IconName, string> = {
  sparkles: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z",
  brush: "M4 20c3 0 4-1.5 4-3.5S9.5 13 11 13l7-8 2 2-8 7c0 1.5-1.5 3-3.5 3S4 18 4 20z",
  database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  bot: "M8 8h8a3 3 0 013 3v5a3 3 0 01-3 3H8a3 3 0 01-3-3v-5a3 3 0 013-3zm4-5v5M9 13h.01M15 13h.01",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  code: "M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4",
  plug: "M9 2v5M15 2v5M6 7h12v4a6 6 0 01-12 0zM12 17v5",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18zm-9 9h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z",
  film: "M4 4h16v16H4zM8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4",
  wave: "M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0 2 2 2 2",
  cube: "M12 2l9 5v10l-9 5-9-5V7zm0 0v10m9-5l-9 5-9-5",
  pen: "M15 4l5 5L9 20H4v-5z",
  rocket: "M5 15c-1 1-1 4-1 4s3 0 4-1M9 15l-3-3c1-5 6-9 13-9 0 7-4 12-9 13z M15 9h.01",
  briefcase: "M4 7h16v12H4zM9 7V4h6v3M4 12h16",
  users: "M9 11a3 3 0 100-6 3 3 0 000 6zm8 0a3 3 0 100-6M3 20c0-3 3-5 6-5s6 2 6 5M17 15c2 0 4 2 4 5",
  wrench: "M14 6a4 4 0 015 5l-9 9-3-3 9-9a4 4 0 01-2-2z",
  building: "M5 21V4h10v17M15 9h4v12M8 8h2M8 12h2M8 16h2",
  book: "M4 4h7a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-6M20 4v14h-6",
  cap: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5",
  chat: "M4 5h16v11H9l-5 4z",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  pulse: "M3 12h4l2-6 4 12 2-6h6",
};

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
