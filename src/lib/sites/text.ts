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
  if (href === "/" || href === "") return base;
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
