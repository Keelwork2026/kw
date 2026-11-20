import type { AppTemplate, Module } from "./types";
import { crm, helpdesk, projects } from "./templates/business";
import { banking, lms, loans, patients } from "./templates/finance-health-education";
import { construction, hotel, property, restaurant, store } from "./templates/commerce-places";
import { analytics, community, habits, marketing, recruiting } from "./templates/data-creative-community";
import { expenses, fitness, inventory, invoicing, logistics, pharmacy, saasAdmin, school } from "./templates/operations";

/** Interactive app templates. Order = default gallery order within a section. */
export const APP_TEMPLATES: AppTemplate[] = [
  crm, banking, store, restaurant, lms, patients, analytics, projects, property, construction, hotel, loans, helpdesk, marketing, recruiting, community, habits,
  school, invoicing, saasAdmin, logistics, pharmacy, inventory, expenses, fitness,
];

export const appBySlug = (slug: string) => APP_TEMPLATES.find((a) => a.slug === slug);

const MODULE_WORDS: Partial<Record<Module["m"], string>> = {
  kpis: "metric tiles", chart: "charts with an accessible data table", table: "searchable, filterable tables with detail drawers", kanban: "a board where items move between stages",
  inbox: "a two-pane inbox with replies", form: "forms with validation and a success state", calendar: "a week calendar", catalog: "a filterable catalogue", progress: "progress bars", feed: "an activity feed", accounts: "account cards",
};

function modulesOf(ms: Module[]): Module[] { return ms.flatMap((m) => (m.m === "split" ? modulesOf([...m.left, ...m.right]) : [m])); }

/** The brief the planner receives when someone uses an app template. */
export function appBrief(app: AppTemplate): string {
  const screens = app.screens.map((s) => {
    const kinds = [...new Set(modulesOf(s.modules).map((m) => MODULE_WORDS[m.m]).filter(Boolean))];
    return `${s.label} (${kinds.join(", ") || "landing content"})`;
  }).join("; ");
  const shell = app.shell === "admin" ? "a left sidebar on desktop and a scrollable tab bar on mobile" : "a top navigation bar that becomes a menu on mobile";
  const cart = modulesOf(app.screens.flatMap((s) => s.modules)).some((m) => m.m === "catalog" && m.cart);
  const brief = `Build a ${app.type.toLowerCase()} for ${app.industry.toLowerCase()}, from the Keelwork "${app.name}" template. ${app.description} Screens: ${screens}. Layout: ${shell}. Features: ${app.features.join(", ")}. Use ${app.stack}. Every list needs empty, loading and error states; every form validates and confirms. ${cart ? "Checkout stays in test mode until I connect a payment provider. " : ""}Use the template's sample data only as seed data I can delete, and leave clear placeholders for my real business details — never invent facts, reviews or figures about my business. Fully responsive and accessible.`;
  return brief.slice(0, 2000);
}

export function appUseHref(app: AppTemplate, signedIn: boolean): string {
  const q = new URLSearchParams({ template: app.slug, name: app.name, prompt: appBrief(app) });
  return signedIn ? `/new-project?${q.toString()}` : `/sign-up?${q.toString()}`;
}
