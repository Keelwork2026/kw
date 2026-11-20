import type { BusinessProfile, Category, Icon, Page, Section, Seo, Site } from "../types";
import { SITES } from "../index";
import { plain } from "../text";
import { UI, ctaFor, headlines, heroSub, list, serviceBody } from "./copy";

/**
 * The content engine. It starts from the complete template for the business's
 * industry (the blueprint: pages, sections, layout, legal pages, footer) and
 * writes the brand, the hero, services, about copy, calls to action and SEO
 * from the business profile. Facts it can't know stay as [[placeholders]].
 * Deterministic: the same profile and variant always give the same site.
 */
export function blueprintFor(industry: Category): Site {
  return SITES.find((s) => s.category === industry) ?? SITES[0]!;
}

const ICONS: [RegExp, Icon][] = [
  [/clean|wash|care|health|clinic|therap|dental|medic/i, "heart"], [/design|brand|creative|photo|art/i, "spark"], [/build|construct|repair|install|plumb|electric|roof/i, "tool"],
  [/consult|strategy|advice|plan|account|tax|finance|bank|invest/i, "chart"], [/teach|course|train|tutor|class|school/i, "book"], [/travel|tour|trip|flight/i, "plane"],
  [/deliver|ship|moving|logistic|courier/i, "truck"], [/food|cater|coffee|bak|restaurant|bar|cook/i, "cup"], [/event|ticket|wedding|party|venue/i, "ticket"],
  [/secur|legal|insur|protect|compliance/i, "shield"], [/home|propert|estate|rent|let/i, "home"], [/web|app|software|digital|it\b|tech|data|cloud/i, "bolt"],
  [/garden|landscap|eco|green|plant/i, "leaf"], [/gift|shop|product/i, "gift"],
];
export const iconFor = (s: string): Icon => ICONS.find(([re]) => re.test(s))?.[1] ?? "check";

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 48) || "site";

function replaceDeep<T>(v: T, from: string, to: string): T {
  if (typeof v === "string") return v.split(from).join(to) as T;
  if (Array.isArray(v)) return v.map((x) => replaceDeep(x, from, to)) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replaceDeep(x, from, to)])) as T;
  return v;
}

/** Where the primary call to action should go, from the pages the blueprint has. */
function primaryHref(site: Site, kind: ReturnType<typeof ctaFor>["kind"]): string {
  const has = (slug: string) => site.pages.some((p) => p.slug === slug);
  const withSection = (t: Section["t"]) => site.pages.find((p) => p.sections.some((s) => s.t === t))?.slug;
  const home = site.pages.find((p) => p.slug === "");
  const anchor = home?.sections.find((s) => s.id)?.id;
  const fallback = has("contact") ? "/contact" : anchor ? `#${anchor}` : "/";
  const booking = withSection("booking");
  if (kind === "book" && booking !== undefined) return booking ? `/${booking}` : "#book";
  if (kind === "shop" && (has("shop") || has("collection"))) return has("shop") ? "/shop" : "/collection";
  if (kind === "donate" && has("donate")) return "/donate";
  if (kind === "quote" && has("quote")) return "/quote";
  if (kind === "signup" && has("pricing")) return "/pricing";
  return fallback;
}

/** SEO for one generated page. */
export function seoFor(page: Page, p: BusinessProfile): Seo {
  const where = p.location ? ` in ${p.location}` : "";
  const isHome = page.slug === "";
  const svc = p.services.slice(0, 2).join(" and ");
  const title = isHome ? `${p.name} — ${svc || p.industry}${where}`.slice(0, 65) : `${plain(page.title)} | ${p.name}`.slice(0, 65);
  const base = isHome ? `${p.name}: ${plain(p.description).replace(/\.$/, "")}.` : `${plain(page.description).replace(/\.$/, "")} — ${p.name}${where}.`;
  const description = base.length > 158 ? `${base.slice(0, 155).replace(/\s+\S*$/, "")}…` : base;
  const keywords = [...p.services.slice(0, 4).map((s) => s.toLowerCase()), ...(p.location ? p.services.slice(0, 2).map((s) => `${s.toLowerCase()} ${p.location!.toLowerCase()}`) : []), p.industry.toLowerCase()];
  return { title, description, keywords: [...new Set(keywords)], ogTitle: isHome ? p.name : title, ogDescription: description, canonical: `/${page.slug}` };
}

/** Write the sections the profile can personalise; leave the rest of the blueprint intact. */
function personalise(s: Section, p: BusinessProfile, page: Page, variant: number, cta: { label: string; href: string }): Section {
  const ui = UI[p.lang];
  if (page.slug === "") {
    if (s.t === "hero") {
      const h = headlines(p);
      return { ...s, eyebrow: [p.industry, p.location].filter(Boolean).join(" · "), title: h[variant % h.length]!, sub: heroSub(p), ctas: [{ label: cta.label, href: cta.href }, ...(s.ctas.slice(1, 2))], stats: undefined };
    }
    if (s.t === "features" && p.services.length) {
      return { ...s, title: ui.services!, sub: undefined, items: p.services.slice(0, 6).map((svc, i) => ({ icon: iconFor(svc), title: svc, body: serviceBody(svc, p, i + variant) })), cols: p.services.length >= 4 ? (p.services.length === 4 ? 4 : 3) : 3 };
    }
    if (s.t === "cta") return { ...s, title: p.lang === "en" ? `${cta.label} with ${p.name}` : ui.ctaTitle!, sub: p.lang === "en" ? `${p.location ? `Serving ${p.location}. ` : ""}Tell us what you need and we'll take it from there.` : ui.reply!, ctas: [{ label: cta.label, href: cta.href }] };
  }
  if (page.slug === "about" && (s.t === "split" || s.t === "hero") && "title" in s) {
    const body = [`${p.name} provides ${list(p.services.slice(0, 3).map((x) => x.toLowerCase()))}${p.audience ? ` for ${p.audience.toLowerCase()}` : ""}${p.location ? ` in ${p.location}` : ""}.`, `${p.purpose || p.description}`.trim(), "We started in [[founded]]. [[story:Add a sentence about how and why you started]]"];
    if (s.t === "split") return { ...s, title: ui.about!, body };
    return { ...s, title: ui.about!, sub: body.join(" ") };
  }
  return s;
}

export function generateSite(profile: BusinessProfile, opts: { variant?: number } = {}): Site {
  const variant = opts.variant ?? 0;
  const bp = blueprintFor(profile.industry);
  // The blueprint's own brand name becomes the business name everywhere.
  let site = replaceDeep(structuredClone(bp), bp.brand ?? bp.name, profile.name);
  if (bp.logo.word !== (bp.brand ?? bp.name)) site = replaceDeep(site, bp.logo.word, profile.name);
  const c = ctaFor(profile.goal, profile.lang);
  const href = primaryHref(site, c.kind);
  site = {
    ...site,
    slug: slugify(profile.name),
    name: profile.name,
    voice: profile.voice,
    lang: profile.lang,
    profile,
    tagline: profile.description,
    description: profile.description,
    logo: { ...site.logo, word: profile.name },
    announcement: undefined,
    primaryCta: { label: c.label, href },
  };
  site.pages = site.pages.map((page) => {
    const sections = page.sections.map((s) => personalise(s, profile, page, variant, { label: c.label, href }));
    const next = { ...page, sections };
    return { ...next, seo: seoFor(next, profile) };
  });
  site.footer = {
    ...site.footer,
    blurb: `${profile.description.replace(/\.$/, "")}.`,
    contact: [["Phone", "[[phone]]"], ["Email", "[[email]]"], ["Address", profile.location ? `[[address]], ${profile.location}` : "[[address]]"]],
    legal: `© ${new Date().getFullYear()} ${profile.name}. [[reg]]`,
  };
  return site;
}

/** A fresh version of one section, leaving every other section untouched. */
export function regenerateSection(site: Site, pageSlug: string, index: number, variant: number): Site {
  if (!site.profile) return site;
  const fresh = generateSite(site.profile, { variant });
  const page = fresh.pages.find((p) => p.slug === pageSlug);
  const replacement = page?.sections[index];
  if (!replacement) return site;
  return { ...site, pages: site.pages.map((p) => (p.slug === pageSlug ? { ...p, sections: p.sections.map((s, i) => (i === index ? replacement : s)) } : p)) };
}
