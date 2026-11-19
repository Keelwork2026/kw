import type { Icon } from "@/lib/sites/types";

const P: Record<Icon, string> = {
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z M8.5 12l2.5 2.5 4.5-5",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l3 2",
  leaf: "M5 19c0-9 6-14 15-14 0 9-5 15-14 15 M5 19l8-8",
  heart: "M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  users: "M9 11a4 4 0 100-8 4 4 0 000 8z M2 21c0-4 3-6 7-6s7 2 7 6 M17 11a3 3 0 100-6 M18 15c2.5.5 4 2.5 4 6",
  pin: "M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z M12 11a2 2 0 100-4 2 2 0 000 4z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z",
  mail: "M3 6h18v12H3z M3 7l9 6 9-6",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18z M3 12h18 M12 3c3 3.5 3 14.5 0 18 M12 3c-3 3.5-3 14.5 0 18",
  lock: "M6 11h12v10H6z M8 11V7a4 4 0 018 0v4",
  check: "M5 12.5l4.5 4.5L19 7",
  cup: "M4 8h13v5a6 6 0 01-6 6h-1a6 6 0 01-6-6z M17 10h2a2 2 0 010 4h-2 M8 3v2M12 3v2",
  home: "M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6",
  tool: "M14.5 6.5a4 4 0 00-5.4 5.2L3 17.8 6.2 21l6.1-6.1a4 4 0 005.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z",
  book: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z M4 19V5 M8 7h7",
  plane: "M10 14L3 11l1-2 8 1 5-5c1-1 3-1 3 0s0 2-1 3l-5 5 1 8-2 1-3-7-3 3v3l-1 1-2-4-4-2 1-1h3z",
  ticket: "M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z M14 6v12",
  card: "M3 6h18v12H3z M3 10h18 M7 15h3",
  gift: "M4 10h16v10H4z M3 7h18v3H3z M12 7v13 M12 7c-2-4-6-3-5 0 M12 7c2-4 6-3 5 0",
  sun: "M12 17a5 5 0 100-10 5 5 0 000 10z M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2",
  truck: "M2 6h12v10H2z M14 10h4l3 3v3h-7 M6 19a2 2 0 100-4 2 2 0 000 4z M17 19a2 2 0 100-4 2 2 0 000 4z",
  chat: "M4 5h16v11H9l-5 4z M8 10h8",
};

export function SiteIcon({ name, size = 22 }: { name: Icon; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[name]} />
    </svg>
  );
}

const S: Record<string, string> = {
  instagram: "M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4z M12 16a4 4 0 100-8 4 4 0 000 8z M17.5 6.5h.01",
  facebook: "M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v7h4v-7h3l1-4h-4V8z",
  linkedin: "M4 9h4v12H4z M6 6.5a2 2 0 100-4 2 2 0 000 4z M10 9h4v2c1-1.5 2.5-2.3 4-2.3 2.5 0 4 1.6 4 4.8V21h-4v-6.5c0-1.6-.7-2.5-2-2.5s-2 1-2 2.5V21h-4z",
  x: "M4 4l16 16 M20 4L4 20",
  youtube: "M3 8a3 3 0 013-3h12a3 3 0 013 3v8a3 3 0 01-3 3H6a3 3 0 01-3-3z M10 9l5 3-5 3z",
  tiktok: "M14 3v11a3.5 3.5 0 11-3.5-3.5 M14 3c.5 2.5 2.5 4.5 5 4.5",
  pinterest: "M12 21a9 9 0 100-18 9 9 0 000 18z M10 21l2.5-10 M10.5 14c3 1 6-1 6-4.5S13.5 5 11 6.5 8 11 9.5 12",
};

export function SocialIcon({ name }: { name: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={S[name] ?? S.x} />
    </svg>
  );
}
