import type { Category as SiteCategory } from "@/lib/sites/types";
import { SITES, siteBrief, siteFeatures } from "@/lib/sites";
import { STARTERS, type Starter } from "@/lib/site/starters";
import { APP_TEMPLATES, appBrief } from "@/lib/apps";
import { CATALOG_CATEGORIES, type CatalogCategory, type Level, type ProjectType, type Style } from "@/lib/apps/types";

export { CATALOG_CATEGORIES };
export type { CatalogCategory, Level, ProjectType, Style };

/**
 * One catalogue over every kind of template: complete websites (live demo),
 * interactive app templates (live demo) and app starters (a brief with a
 * drawn preview). Popularity is never invented: "Most used" comes from real
 * project counts passed in by the page.
 */
export type Entry = {
  kind: "website" | "app" | "starter";
  slug: string;
  name: string;
  category: CatalogCategory;
  industry: string;
  type: ProjectType;
  styles: Style[];
  level: Level;
  tagline: string;
  description: string;
  features: string[];
  /** Screens or pages the template includes. */
  parts: string[];
  /** YYYY-MM-DD for templates that record when they were added. */
  added?: string;
  featured: boolean;
  keywords: string[];
  /** Live demo path, when the template has one. */
  demo?: string;
  name_for_project: string;
  brief: string;
};

const SITE_CAT: Record<SiteCategory, CatalogCategory> = {
  "Corporate & Business": "Business & Corporate", "Technology & SaaS": "Technology & SaaS", "Finance & Banking": "Finance & Fintech",
  "Restaurant & Hospitality": "Food & Hospitality", "Fashion & Beauty": "E-commerce & Retail", "E-commerce": "E-commerce & Retail",
  "Real Estate": "Real Estate & Construction", Education: "Education", Healthcare: "Healthcare", "Travel & Tourism": "Food & Hospitality",
  "Construction & Engineering": "Real Estate & Construction", "Creative & Portfolio": "Marketing & Creative", Events: "Personal & Community",
  Nonprofit: "Personal & Community", "Personal Websites": "Personal & Community", "Landing Pages": "Marketing & Creative", "Blogs & Publications": "Marketing & Creative",
};
const SITE_KEYWORDS: Record<SiteCategory, string[]> = {
  "Corporate & Business": ["consultancy", "consulting", "company", "corporate", "professional services", "agency", "firm"],
  "Technology & SaaS": ["saas", "software", "startup", "product", "app website", "tech"],
  "Finance & Banking": ["bank", "banking", "finance", "fintech", "savings", "credit union", "loans"],
  "Restaurant & Hospitality": ["restaurant", "food", "menu", "cafe", "bar", "dining", "reservations", "bistro"],
  "Fashion & Beauty": ["fashion", "clothing", "beauty", "boutique", "apparel", "salon", "luxury"],
  "E-commerce": ["shop", "online shop", "store", "ecommerce", "products", "handmade", "crafts"],
  "Real Estate": ["real estate", "property", "homes", "houses", "estate agent", "realtor", "developer"],
  Education: ["school", "students", "education", "academy", "courses", "college", "tutoring"],
  Healthcare: ["clinic", "health", "doctor", "medical", "hospital", "dental", "wellness"],
  "Travel & Tourism": ["travel", "tours", "tourism", "holidays", "trips", "travel agency"],
  "Construction & Engineering": ["construction", "construction company", "contractor", "builders", "engineering", "civil"],
  "Creative & Portfolio": ["portfolio", "designer", "photographer", "studio", "creative", "artist"],
  Events: ["event", "conference", "festival", "summit", "tickets", "speakers"],
  Nonprofit: ["charity", "nonprofit", "ngo", "foundation", "donations", "volunteers"],
  "Personal Websites": ["personal website", "cv", "resume", "about me", "freelancer", "personal brand"],
  "Landing Pages": ["landing page", "waitlist", "launch", "one page", "campaign"],
  "Blogs & Publications": ["blog", "magazine", "publication", "articles", "newsletter", "writing"],
};
function siteStyles(style: string): Style[] {
  const s = style.toLowerCase();
  const out: Style[] = [];
  if (/calm|clear|minimal|crisp|airy/.test(s)) out.push("Minimal");
  if (/bold|electric|strong|gradient|confident/.test(s)) out.push("Bold");
  if (/luxury|premium/.test(s)) out.push("Premium");
  if (/friendly|bright|playful/.test(s)) out.push("Playful");
  if (/editorial|magazine|gallery/.test(s)) out.push("Editorial");
  if (/corporate|trustworthy/.test(s)) out.push("Corporate");
  if (/warm|earthy|caring|human|personal/.test(s)) out.push("Warm");
  if (/product|industrial/.test(s)) out.push("Technical");
  return out.length ? out : ["Minimal"];
}

const STARTER_CAT: Record<Starter["category"], CatalogCategory> = {
  Business: "Business & Corporate", Creative: "Marketing & Creative", SaaS: "Technology & SaaS", Commerce: "E-commerce & Retail", Personal: "Personal & Community",
  Marketing: "Marketing & Creative", "Food & drink": "Food & Hospitality", Content: "Marketing & Creative", "Internal tools": "Productivity & Workflow",
};
const STARTER_TYPE: Record<Starter["category"], ProjectType> = {
  Business: "Web app", Creative: "Website", SaaS: "Dashboard", Commerce: "Online store", Personal: "Web app", Marketing: "Landing page", "Food & drink": "Website", Content: "Website", "Internal tools": "Internal tool",
};

const legal = ["privacy", "terms", "cookies"];
const siteEntries: Entry[] = SITES.map((s) => ({
  kind: "website", slug: s.slug, name: s.name, category: SITE_CAT[s.category], industry: s.category, type: s.category === "Landing Pages" ? "Landing page" : s.category === "E-commerce" ? "Online store" : "Website",
  styles: siteStyles(s.style), level: "Beginner-friendly", tagline: s.tagline, description: s.description, features: siteFeatures(s),
  parts: s.pages.filter((p) => !legal.includes(p.slug)).map((p) => p.title), featured: ["meridian-advisory", "harbour-kitchen", "maison-vale", "willow-clinic", "ironline-construction"].includes(s.slug),
  keywords: [...SITE_KEYWORDS[s.category], "website", "site"], demo: `/demo/${s.slug}`, name_for_project: s.name, brief: siteBrief(s),
}));
const starterEntries: Entry[] = STARTERS.filter((s) => !SITES.some((x) => x.slug === s.slug)).map((s) => ({
  kind: "starter", slug: s.slug, name: s.name, category: STARTER_CAT[s.category], industry: s.category, type: STARTER_TYPE[s.category], styles: ["Minimal"], level: "Beginner-friendly",
  tagline: s.tagline, description: s.description, features: s.features, parts: s.pages, featured: false, keywords: [s.category.toLowerCase(), ...s.design.kind.split("-")], name_for_project: s.name, brief: s.prompt,
}));
const appEntries: Entry[] = APP_TEMPLATES.map((a) => ({
  kind: "app", slug: a.slug, name: a.name, category: a.category, industry: a.industry, type: a.type, styles: a.styles, level: a.level, tagline: a.tagline, description: a.description,
  features: a.features, parts: a.screens.map((s) => s.label), added: a.added, featured: !!a.featured, keywords: a.keywords, demo: `/demo/${a.slug}`, name_for_project: a.brand, brief: appBrief(a),
}));

export const CATALOG: Entry[] = [...appEntries, ...siteEntries, ...starterEntries];
export const entryBySlug = (slug: string) => CATALOG.find((e) => e.slug === slug);
export const PROJECT_TYPES: ProjectType[] = ["Website", "Landing page", "Web app", "Dashboard", "Online store", "Portal", "Internal tool"];
export const STYLES: Style[] = ["Minimal", "Bold", "Premium", "Playful", "Editorial", "Corporate", "Warm", "Technical"];

/** "Use this template": Create Project resolves the name and brief from the slug. */
export function templateUseHref(e: Entry, signedIn: boolean): string {
  const q = new URLSearchParams({ template: e.slug });
  return signedIn ? `/new-project?${q.toString()}` : `/sign-up?${q.toString()}`;
}

/** Templates added most recently (only those that record a date). */
export function recentlyAdded(n = 6): Entry[] {
  return CATALOG.filter((e) => e.added).sort((a, b) => b.added!.localeCompare(a.added!) || a.name.localeCompare(b.name)).slice(0, n);
}

/** Templates related to one: same category first, then shared industry words and type. */
export function related(e: Entry, n = 4): Entry[] {
  const words = new Set(e.keywords);
  return CATALOG.filter((x) => x.slug !== e.slug)
    .map((x) => ({ x, s: (x.category === e.category ? 4 : 0) + (x.type === e.type ? 1 : 0) + x.keywords.filter((k) => words.has(k)).length }))
    .filter((r) => r.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map((r) => r.x);
}
