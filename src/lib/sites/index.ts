import type { Category, Site } from "./types";
import { harbourKitchen, summit, wayfarer } from "./templates/hospitality";
import { launchpad, lumen, meridian, northbank } from "./templates/business";
import { clayAndCo, keystone, maisonVale } from "./templates/retail";
import { brightpath, ironline, riverbend, willow } from "./templates/services";
import { fieldNotes, folio, personal } from "./templates/creative";

/** Complete website templates, one or more per category. Order = gallery order. */
export const SITES: Site[] = [
  meridian, lumen, northbank, harbourKitchen, maisonVale, clayAndCo, keystone, brightpath, willow,
  wayfarer, ironline, folio, summit, riverbend, personal, launchpad, fieldNotes,
];

export const SITE_CATEGORIES: Category[] = [
  "Corporate & Business", "Technology & SaaS", "Finance & Banking", "Restaurant & Hospitality", "Fashion & Beauty",
  "E-commerce", "Real Estate", "Education", "Healthcare", "Travel & Tourism", "Construction & Engineering",
  "Creative & Portfolio", "Events", "Nonprofit", "Personal Websites", "Landing Pages", "Blogs & Publications",
];

export const siteBySlug = (slug: string) => SITES.find((s) => s.slug === slug);

export const categorySlug = (c: Category) => c.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Features a gallery listing shows, derived from what the template actually contains. */
export function siteFeatures(site: Site): string[] {
  const kinds = new Set(site.pages.flatMap((p) => p.sections.map((s) => (s.t === "booking" ? `booking:${s.kind}` : s.t))));
  const f: string[] = [];
  if (kinds.has("cart")) f.push("Basket & checkout");
  if (kinds.has("booking:table")) f.push("Table booking");
  if (kinds.has("booking:appointment")) f.push("Appointments");
  if (kinds.has("booking:ticket")) f.push("Ticketing");
  if (kinds.has("booking:tour") || kinds.has("booking:visit")) f.push("Enquiry forms");
  if (kinds.has("donate")) f.push("Donations");
  if (kinds.has("menu")) f.push("Menus");
  if (kinds.has("pricing")) f.push("Pricing");
  if (kinds.has("rates")) f.push("Rate tables");
  if (kinds.has("schedule")) f.push("Schedule");
  if (kinds.has("article")) f.push("Articles");
  if (kinds.has("detail")) f.push("Detail pages");
  if (kinds.has("newsletter") || site.footer.newsletter) f.push("Newsletter");
  if (kinds.has("contact")) f.push("Contact form");
  if (site.pages.some((p) => p.slug === "cookies")) f.push("Cookie consent");
  return f;
}

/** The brief handed to the AI builder when someone uses a website template. */
export function siteBrief(site: Site): string {
  const pages = site.pages.filter((p) => !["privacy", "terms", "cookies"].includes(p.slug)).map((p) => p.title).join(", ");
  const brief = `Build a ${site.category.toLowerCase()} website called "${site.name}" from the Keelwork "${site.name}" template. ${site.description} Style: ${site.style.toLowerCase()}, ${site.voice ?? "professional"} tone. Pages: ${pages}, plus privacy, terms${site.pages.some((p) => p.slug === "cookies") ? " and cookie policy with a consent banner" : ""}. Features: ${siteFeatures(site).join(", ")}. Keep it fully responsive and accessible. Leave clearly marked placeholders for facts I must supply (phone, email, address, prices, registration numbers, statistics, reviews) — never invent them. Replace the example content with my business details as I provide them.`;
  return brief.slice(0, 2000);
}
