import type { ArtKind, Palette } from "@/lib/sites/types";
import type { IconName } from "@/components/icons";

/**
 * App templates are data, like website templates: screens made of modules,
 * with realistic sample data for one specific business. One renderer draws
 * every app as an interactive preview (navigation, filters, drag-free
 * pipelines, forms with validation, carts), and the same data becomes the
 * brief the agents build from.
 */

export type ProjectType = "Website" | "Landing page" | "Web app" | "Dashboard" | "Online store" | "Portal" | "Internal tool";
export type Style = "Minimal" | "Bold" | "Premium" | "Playful" | "Editorial" | "Corporate" | "Warm" | "Technical";
export type Level = "Beginner-friendly" | "Advanced";

export const CATALOG_CATEGORIES = [
  "Business & Corporate", "E-commerce & Retail", "Finance & Fintech", "Food & Hospitality", "Healthcare", "Education",
  "Real Estate & Construction", "Technology & SaaS", "Productivity & Workflow", "Marketing & Creative", "Personal & Community",
] as const;
export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

export type Tone = "good" | "warn" | "bad" | "info" | "neutral";

export type Module =
  | { m: "kpis"; items: { label: string; value: string; delta?: string; tone?: Tone }[] }
  | { m: "chart"; title: string; kind: "line" | "bar"; labels: string[]; series: { label: string; values: number[] }[]; unit?: string; ranges?: string[] }
  | { m: "table"; title: string; columns: string[]; rows: string[][]; status?: number; tones?: Record<string, Tone>; filter?: number; search?: string; action?: string }
  | { m: "kanban"; title: string; columns: { name: string; cards: { title: string; meta: string; value?: string }[] }[] }
  | { m: "inbox"; title: string; items: { title: string; meta: string; preview: string; body: string[]; badge?: string }[]; reply?: string }
  | { m: "form"; title: string; sub?: string; steps: { title: string; fields: { label: string; type: "text" | "email" | "tel" | "number" | "date" | "time" | "select" | "textarea" | "money"; options?: string[]; required?: boolean; placeholder?: string }[] }[]; submit: string; success: { title: string; body: string } }
  | { m: "calendar"; title: string; days: string[]; events: { day: number; start: string; end: string; title: string; meta?: string; tone?: Tone }[] }
  | { m: "catalog"; title: string; filters?: string[]; items: { title: string; meta: string; price?: string; art: ArtKind; seed?: number; tag?: string; badge?: string }[]; action: string; cart?: boolean; cols?: 2 | 3 | 4 }
  | { m: "progress"; title: string; items: { title: string; meta: string; pct: number }[] }
  | { m: "feed"; title: string; items: { who: string; what: string; when: string }[] }
  | { m: "hero"; eyebrow?: string; title: string; sub: string; cta: string; secondary?: string; art: ArtKind; seed?: number; stats?: [string, string][] }
  | { m: "features"; title: string; items: { icon: IconName; title: string; body: string }[] }
  | { m: "accounts"; items: { name: string; number: string; balance: string; note?: string }[] }
  | { m: "split"; left: Module[]; right: Module[] };

export type Screen = { slug: string; label: string; icon: IconName; title: string; sub?: string; modules: Module[] };

export type AppTemplate = {
  slug: string;
  name: string;
  category: CatalogCategory;
  industry: string;
  type: ProjectType;
  styles: Style[];
  level: Level;
  tagline: string;
  description: string;
  useCases: string[];
  features: string[];
  effort: string;
  stack: string;
  /** YYYY-MM-DD the template was added to the library. */
  added: string;
  featured?: boolean;
  keywords: string[];
  brand: string;
  palette: Palette;
  shell: "admin" | "consumer";
  user?: { name: string; role: string };
  screens: Screen[];
};
