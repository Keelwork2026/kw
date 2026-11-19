import type { Section, Site } from "./types";
import { sectionLinks } from "./text";

/**
 * Automated quality checks every website template must pass before it is
 * listed. They enforce the content rules: no dead links, no lorem ipsum, no
 * invented claims, SEO and accessibility basics, and legal pages.
 */
export type QaIssue = { page: string; rule: string; detail: string };

const BANNED: [RegExp, string][] = [
  [/lorem ipsum/i, "placeholder Latin text"],
  [/welcome to our website/i, "generic welcome line"],
  [/award[- ]winning/i, "unsupported award claim"],
  [/trusted by\s+[\d,.]+/i, "unsupported customer-count claim"],
  [/\b\d+\+?\s+years of experience/i, "unsupported years-of-experience claim"],
  [/\b(number one|#1|world[- ]class|best in (the )?(world|industry|class))\b/i, "unsupported superlative"],
  [/\bguaranteed (results|returns|cure)\b/i, "unsupported guarantee"],
  [/\b(cures?|heals?|treats?) (cancer|diabetes|anxiety|depression|disease|illness|pain)\b/i, "medical claim"],
  [/\b(risk[- ]free|guaranteed) (investment|returns?|profit)/i, "financial claim"],
];

const BUILT_IN_IDS: Partial<Record<Section["t"], string>> = { contact: "contact", booking: "book", donate: "donate" };

function images(s: Section): { alt: string }[] {
  const out: { alt: string }[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.art === "string") out.push({ alt: String(o.alt ?? "") });
      Object.values(o).forEach(walk);
    }
  };
  walk(s);
  return out;
}

export function qaSite(site: Site): QaIssue[] {
  const issues: QaIssue[] = [];
  const add = (page: string, rule: string, detail: string) => issues.push({ page: page || "home", rule, detail });
  const slugs = new Set(site.pages.map((p) => p.slug));
  const content = site.pages.filter((p) => !["privacy", "terms", "cookies"].includes(p.slug));

  if (!slugs.has("")) add("", "structure", "no home page");
  if (slugs.size !== site.pages.length) add("", "structure", "duplicate page slugs");
  if (site.category !== "Landing Pages" && content.length < 4) add("", "structure", `only ${content.length} content pages (need 4+)`);
  if (!slugs.has("privacy") || !slugs.has("terms")) add("", "legal", "privacy policy and terms are required");
  if (!site.footer.contact.length) add("", "footer", "footer has no contact details");
  if (!site.footer.social.length) add("", "footer", "footer has no social links");

  const resolves = (href: string, pageIds: Set<string>) => {
    if (/^(https?:|mailto:|tel:)/.test(href)) return true;
    if (href.startsWith("#")) return pageIds.has(href.slice(1));
    const path = href.split(/[?#]/)[0]!.replace(/^\/+|\/+$/g, "");
    return slugs.has(path);
  };
  const titles = new Set<string>();

  for (const page of site.pages) {
    const ids = new Set(page.sections.flatMap((s) => [s.id, BUILT_IN_IDS[s.t]].filter(Boolean) as string[]));
    if (!page.sections.length) add(page.slug, "structure", "page has no sections");
    if (!page.title.trim()) add(page.slug, "seo", "missing title");
    if (titles.has(page.title)) add(page.slug, "seo", `duplicate title "${page.title}"`);
    titles.add(page.title);
    if (page.description.length < 10 || page.description.length > 170) add(page.slug, "seo", `meta description is ${page.description.length} characters`);
    for (const s of page.sections) {
      for (const href of sectionLinks(s)) if (!resolves(href, ids)) add(page.slug, "links", `dead link ${href}`);
      const text = JSON.stringify(s);
      for (const [re, why] of BANNED) if (re.test(text)) add(page.slug, "content", why);
      for (const img of images(s)) if (img.alt.trim().length < 3) add(page.slug, "a11y", "image without alt text");
      if (s.t === "testimonials" && !s.sample) add(page.slug, "claims", "testimonials must be marked as samples until real ones are added");
      if (s.t === "logos" && !s.sample && !s.items.every((i) => i.includes("[["))) add(page.slug, "claims", "client logos must be samples or placeholders");
      if (s.t === "stats" && !s.sample && !s.items.every(([v]) => v.includes("[["))) add(page.slug, "claims", "statistics must be placeholders or marked as samples");
    }
    if (page.slug === "") for (const l of [site.primaryCta]) if (!resolves(l.href, ids)) add(page.slug, "links", `primary call to action ${l.href} is dead`);
  }
  for (const c of site.footer.columns) for (const l of c.links) if (!resolves(l.href, new Set(site.pages.find((p) => p.slug === "")!.sections.flatMap((s) => [s.id, BUILT_IN_IDS[s.t]].filter(Boolean) as string[])))) add("", "links", `footer link ${l.href} is dead`);
  return issues;
}
