import type { Page, Section, Site } from "./types";

/** Facts only the owner can supply. Shown as "Add your …" chips, never invented. */
export const PLACEHOLDERS: Record<string, string> = {
  phone: "phone number",
  email: "email address",
  address: "street address",
  licence: "licence or registration number",
  years: "years in business",
  hours: "opening hours",
  founded: "founding year",
  reg: "company registration number",
  charity: "charity number",
  regulator: "regulator and reference number",
  price: "price",
  date: "date",
  venue: "venue address",
  name: "full name",
  stat: "a figure you can verify",
};

export type Piece = { text: string } | { ph: string; label: string };

/** Splits text into plain runs and [[placeholder]] chips. */
export function pieces(s: string): Piece[] {
  const out: Piece[] = [];
  const re = /\[\[([a-z0-9-]+)(?::([^\]]+))?\]\]/gi;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) });
    const key = m[1]!.toLowerCase();
    out.push({ ph: key, label: m[2] ?? PLACEHOLDERS[key] ?? key.replace(/-/g, " ") });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}

/** Plain text for metadata: placeholders read as "[your phone number]". */
export function plain(s: string): string {
  return pieces(s).map((p) => ("text" in p ? p.text : `[your ${p.label}]`)).join("");
}

export function pageBySlug(site: Site, slug: string | undefined): Page | undefined {
  return site.pages.find((p) => p.slug === (slug ?? ""));
}

/**
 * Template links are written as the live site would have them ("/menu",
 * "/shop/oak-bowl", "#book"). In the gallery they resolve under /demo/<slug>.
 */
export function resolveHref(site: Site, href: string, base = `/demo/${site.slug}`): string {
  if (/^(https?:|mailto:|tel:|#)/.test(href)) return href;
  if (href === "/" || href === "") return base || "/";
  return `${base}${href.startsWith("/") ? href : `/${href}`}`;
}

/** Every internal link a page section contains (for QA). */
export function sectionLinks(s: Section): string[] {
  const out: string[] = [];
  const add = (h?: string) => { if (h) out.push(h); };
  switch (s.t) {
    case "hero": case "cta": s.ctas.forEach((c) => add(c.href)); break;
    case "split": add(s.cta?.href); break;
    case "cards": s.items.forEach((c) => add(c.href)); add(s.more?.href); break;
    case "pricing": s.plans.forEach((p) => add(p.cta.href)); break;
    case "detail": add(s.cta.href); add(s.secondary?.href); break;
    default: break;
  }
  return out;
}

/** Every string in a section (for QA content checks). */
export function sectionText(s: Section): string {
  return JSON.stringify(s);
}

/* ---------- generic editing of a section's text ---------- */

export type Path = (string | number)[];
export type TextField = { path: Path; label: string; value: string; long: boolean; link: boolean };

const SKIP = new Set(["t", "v", "art", "icon", "id", "seed", "kind", "type", "sample", "featured", "reverse", "cols", "inNav"]);
const NICE: Record<string, string> = { title: "Title", sub: "Supporting text", eyebrow: "Eyebrow", body: "Body", label: "Button text", href: "Link", meta: "Details", price: "Price", alt: "Image description", quote: "Quote", name: "Name", role: "Role", desc: "Description", button: "Button text", placeholder: "Placeholder", note: "Note", blurb: "Summary", bio: "Bio", badge: "Badge", year: "Date", who: "Who", room: "Room", time: "Time", day: "Day" };

/** Every editable string in a section, with a readable label. */
export function textFields(section: unknown): TextField[] {
  const out: TextField[] = [];
  const walk = (v: unknown, path: Path) => {
    if (out.length >= 120) return;
    const key = [...path].reverse().find((k) => typeof k === "string") as string | undefined;
    if (typeof v === "string") {
      if (key && SKIP.has(key)) return;
      const parts = path.map((k, i) => (typeof k === "number" ? `${k + 1}` : i === path.length - 1 ? NICE[k] ?? k : NICE[k] ?? k)).filter((x) => !["items", "ctas", "plans", "groups", "sessions", "days", "fields"].includes(String(x)));
      out.push({ path, label: parts.join(" · ") || "Text", value: v, long: v.length > 70 || key === "body" || key === "sub" || key === "quote", link: key === "href" });
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, i]));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (!SKIP.has(k) || typeof x === "object") walk(x, [...path, k]);
  };
  walk(section, []);
  return out;
}

/** Immutable set by path. */
export function setAt<T>(obj: T, path: Path, value: unknown): T {
  if (!path.length) return value as T;
  const [k, ...rest] = path;
  if (Array.isArray(obj)) return obj.map((x, i) => (i === k ? setAt(x, rest, value) : x)) as T;
  const o = obj as Record<string, unknown>;
  return { ...o, [k as string]: setAt(o[k as string], rest, value) } as T;
}
