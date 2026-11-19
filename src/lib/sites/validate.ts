import type { Site } from "./types";

/**
 * Checks a site that came back from the browser before it is saved or shown
 * to anyone. Text is rendered escaped by React, so the risks are links
 * (javascript: URLs), CSS values in the palette, and sheer size.
 */
const SECTION_TYPES = new Set(["hero", "logos", "stats", "features", "split", "cards", "menu", "gallery", "testimonials", "pricing", "faq", "cta", "newsletter", "contact", "steps", "timeline", "team", "schedule", "detail", "article", "rates", "booking", "donate", "cart", "checkout", "account"]);
const HEX = /^#[0-9a-f]{6}$/i;
const SAFE_HREF = /^(\/(?!\/)|#|https:\/\/|http:\/\/|mailto:|tel:)/i;

export function validateSite(input: unknown): { ok: true; site: Site } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Not a site." };
  const s = input as Site;
  const size = JSON.stringify(s).length;
  if (size > 900_000) return { ok: false, error: "This site is too large to save." };
  if (typeof s.name !== "string" || !s.name.trim() || s.name.length > 80) return { ok: false, error: "The site needs a name of 1–80 characters." };
  if (!Array.isArray(s.pages) || s.pages.length < 1 || s.pages.length > 40) return { ok: false, error: "A site has between 1 and 40 pages." };
  if (!s.palette || !Object.values(s.palette).every((c) => typeof c === "string" && HEX.test(c))) return { ok: false, error: "Colours must be hex values like #1a2b3c." };
  if (!["serif", "grotesk", "sans", "mono"].includes(s.fonts?.display) || !["sans", "serif"].includes(s.fonts?.body)) return { ok: false, error: "Unknown font choice." };
  if (!["none", "soft", "round"].includes(s.radius)) return { ok: false, error: "Unknown corner style." };
  const slugs = new Set<string>();
  for (const p of s.pages) {
    if (typeof p.slug !== "string" || !/^([a-z0-9-]+(\/[a-z0-9-]+)*)?$/.test(p.slug) || slugs.has(p.slug)) return { ok: false, error: `Page address "${String(p.slug)}" isn't valid or is used twice.` };
    slugs.add(p.slug);
    if (!Array.isArray(p.sections) || p.sections.length > 40) return { ok: false, error: "A page has at most 40 sections." };
    for (const sec of p.sections) if (!sec || !SECTION_TYPES.has((sec as { t: string }).t)) return { ok: false, error: "Unknown section type." };
  }
  let bad: string | null = null;
  const walk = (v: unknown, key: string) => {
    if (bad) return;
    if (typeof v === "string") {
      if (key === "href" && !SAFE_HREF.test(v.trim())) bad = `Links must start with /, #, https://, mailto: or tel: ("${v.slice(0, 40)}").`;
      if (v.length > 5000) bad = "A text field is too long.";
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(s, "");
  if (bad) return { ok: false, error: bad };
  return { ok: true, site: s };
}
