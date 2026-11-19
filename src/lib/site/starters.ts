/**
 * Starter templates. Each one opens a new project with a detailed brief
 * (name + prompt) on Keelwork's Next.js starter; the agents plan it with you
 * and nothing is built until you approve. The design block drives the
 * preview drawn by <TemplatePreview>, so every card shows a real layout,
 * not a flat colour.
 */
export type PreviewKind = "booking" | "portfolio" | "dashboard" | "shop" | "habits" | "waitlist" | "restaurant" | "blog" | "crm";
export type Palette = { bg: string; surface: string; ink: string; muted: string; accent: string; accent2: string; soft: string };

export type Starter = {
  slug: string;
  name: string;
  category: "Business" | "Creative" | "SaaS" | "Commerce" | "Personal" | "Marketing" | "Food & drink" | "Content" | "Internal tools";
  tagline: string;
  description: string;
  pages: string[];
  features: string[];
  stack: string;
  minutes: number;
  prompt: string;
  design: { kind: PreviewKind; palette: Palette; headline: string; sub: string };
};

const p = (bg: string, surface: string, ink: string, muted: string, accent: string, accent2: string, soft: string): Palette => ({ bg, surface, ink, muted, accent, accent2, soft });

export const STARTERS: Starter[] = [
  {
    slug: "studio-bookings", name: "Studio Bookings", category: "Business",
    tagline: "Class schedules, passes and payments for studios.",
    description: "A booking site for a yoga, dance or fitness studio. Members browse the weekly timetable, book a spot, buy class passes and get reminders. Staff manage classes, capacity and the waitlist from an admin page.",
    pages: ["Home with this week's classes", "Timetable", "Class detail and booking", "Passes and checkout", "My bookings", "Admin: classes, capacity, waitlist"],
    features: ["Sign-in with email", "Capacity limits and a waitlist", "Class passes with credits", "Card payments (Stripe)", "Reminder emails", "Row-level security per member"],
    stack: "Next.js · Supabase · Stripe", minutes: 25,
    prompt: "Build Studio Bookings, a booking site for a small yoga studio. Public pages: a home page with a hero, this week's classes and pricing; a weekly timetable with filters by class type and teacher; a class page with description, teacher, time, spots left and a Book button. Members sign in with email, book or cancel a spot (cancellations allowed up to 6 hours before), join a waitlist when a class is full, and see My bookings. Sell class passes (5 and 10 classes) with Stripe checkout; each booking uses one credit. Send a confirmation email and a reminder 2 hours before class. Admin pages for staff: create and edit classes, set capacity, see attendees, move people off the waitlist. Calm, warm design with plenty of white space and large tap targets on mobile.",
    design: { kind: "booking", palette: p("#fbf6f1", "#ffffff", "#2b2321", "#7a6b66", "#c2566a", "#e7a46a", "#f6e3e1"), headline: "Find your flow", sub: "Classes this week" },
  },
  {
    slug: "folio", name: "Folio", category: "Creative",
    tagline: "A portfolio with case studies that read like magazines.",
    description: "A personal portfolio for designers, photographers and studios. Big type, image-led case studies, an about page and a contact form that lands in your inbox.",
    pages: ["Home with selected work", "Case study pages", "About", "Contact"],
    features: ["Image-led case studies", "Smooth page transitions (respecting reduced motion)", "Contact form with spam protection", "SEO metadata per page", "Content you edit in the admin"],
    stack: "Next.js · Supabase", minutes: 15,
    prompt: "Build Folio, a portfolio site for an independent product designer. Home page: oversized name and one-line positioning, a grid of 6 selected projects with cover images and tags. Each case study page has a full-bleed cover, the problem, the process (with image galleries), the outcome with 3 key numbers, and a next-project link. About page with a portrait, short bio, clients list and services. Contact page with a form (name, email, budget range, message) that stores submissions and emails the owner, with a honeypot against spam. Admin area to add and reorder projects and upload images. Editorial, magazine-like design: serif headlines, generous margins, subtle page transitions that switch off with prefers-reduced-motion.",
    design: { kind: "portfolio", palette: p("#f5f3ee", "#ffffff", "#141414", "#6b6b6b", "#1f4fff", "#ff6b3d", "#e9e6df"), headline: "Design that ships", sub: "Selected work 2024–2026" },
  },
  {
    slug: "pulse-analytics", name: "Pulse Analytics", category: "SaaS",
    tagline: "A SaaS dashboard with teams, charts and plans.",
    description: "The skeleton of a SaaS product: sign-in, teams with roles, a dashboard of charts and tables, settings and subscription billing.",
    pages: ["Marketing home and pricing", "Sign-in and onboarding", "Dashboard with KPIs and charts", "Reports table with filters", "Team and roles", "Billing and settings"],
    features: ["Organizations with owner/admin/member roles", "Charts with accessible data tables", "CSV export", "Stripe subscriptions", "Audit log of important actions"],
    stack: "Next.js · Supabase · Stripe", minutes: 35,
    prompt: "Build Pulse Analytics, a small SaaS that tracks website metrics for teams. Marketing home with hero, three feature blocks and a pricing table (Free, Pro, Team). After sign-in, users create or join an organization; roles are owner, admin and member. Dashboard: four KPI tiles (visitors, sign-ups, conversion, revenue) with change vs last period, a line chart of visitors over 30 days, a bar chart by source, and a table of top pages. Every chart also has an accessible table view. Reports page with date range and source filters and CSV export. Team page to invite by email and change roles. Billing page with Stripe subscriptions and the customer portal. Keep an audit log of role changes and billing events. Clean, data-dense design with a left sidebar.",
    design: { kind: "dashboard", palette: p("#f6f7fb", "#ffffff", "#141a2b", "#6a7287", "#5b5bf6", "#18b98c", "#eceefe"), headline: "Pulse", sub: "Last 30 days" },
  },
  {
    slug: "clay-and-co", name: "Clay & Co", category: "Commerce",
    tagline: "A small shop with a big personality.",
    description: "An online shop for a ceramics studio: catalogue, product pages, cart and checkout, with stock that updates as you sell.",
    pages: ["Shop home", "Collection pages", "Product page", "Cart and checkout", "Order confirmation", "Admin: products, stock, orders"],
    features: ["Product variants and stock", "Stripe Checkout", "Order emails", "Discount codes", "Admin order list"],
    stack: "Next.js · Supabase · Stripe", minutes: 30,
    prompt: "Build Clay & Co, an online shop for a small ceramics studio. Home page with a large hero photo area, featured collection and a short brand story. Collection pages with filters (colour, price, in stock). Product page with gallery, description, variants (glaze colour), price, stock left and Add to cart. Cart drawer and Stripe Checkout; on payment, reduce stock and email an order confirmation. Support discount codes. Admin pages: add/edit products and variants, upload images, adjust stock, list orders with status (paid, packed, shipped). Earthy, tactile design with rounded corners and generous product imagery.",
    design: { kind: "shop", palette: p("#f7f1ea", "#fffaf5", "#2a211b", "#7b6a5d", "#b4532a", "#5e7d5a", "#efe2d3"), headline: "Made by hand", sub: "New glazes for autumn" },
  },
  {
    slug: "streaks", name: "Streaks", category: "Personal",
    tagline: "Habits, streaks and an evening nudge.",
    description: "A habit tracker that makes consistency visible: daily check-ins, streak rings, a calendar heatmap and an optional evening reminder.",
    pages: ["Today", "Habit detail with history", "Calendar heatmap", "Settings and reminders"],
    features: ["One-tap check-ins", "Streaks with a rest-day allowance", "Calendar heatmap", "Evening reminder email", "Installable on phones (PWA)"],
    stack: "Next.js · Supabase", minutes: 20,
    prompt: "Build Streaks, a habit tracker. After email sign-in, the Today page lists the user's habits as large cards with a one-tap check-in, a streak count and a progress ring for the week. Users can create habits with a name, emoji, target days per week and an allowed rest day so one missed day doesn't break a streak. Habit page shows a 12-week calendar heatmap and best streak. Optional reminder email at a chosen evening time if today's habits aren't done. Make it installable as a PWA and fast on phones. Bright, friendly design with soft shadows and big rounded buttons.",
    design: { kind: "habits", palette: p("#f4f6f2", "#ffffff", "#1d2a20", "#66736a", "#2f9e5b", "#f4a83b", "#e3f1e6"), headline: "Today", sub: "4 of 5 done" },
  },
  {
    slug: "launchpad", name: "Launchpad", category: "Marketing",
    tagline: "A waitlist page that converts.",
    description: "A launch page with a sharp headline, social proof you supply, a waitlist with referral positions and a simple admin to export sign-ups.",
    pages: ["Launch page", "Thank-you page with referral link", "Admin: sign-ups and export"],
    features: ["Waitlist with double opt-in", "Referral links that move people up", "CSV export", "Open Graph image for sharing"],
    stack: "Next.js · Supabase", minutes: 10,
    prompt: "Build Launchpad, a waitlist page for an upcoming app. Hero with a bold headline, one-sentence value proposition, an email field and Join the waitlist button. Below: three benefit cards, a short FAQ and a footer. On sign-up, send a confirmation email (double opt-in). The thank-you page shows the person's position and a personal referral link; each confirmed referral moves them up 5 places. Admin page (owner only) lists sign-ups with position, referrals and confirmed status, with CSV export. Add Open Graph metadata and a generated share image. Striking dark design with one vivid accent colour.",
    design: { kind: "waitlist", palette: p("#0f0e14", "#1a1922", "#f3f1fa", "#a7a3ba", "#ff5c8a", "#8b6cff", "#262433"), headline: "Something new is coming", sub: "Be first in line" },
  },
  {
    slug: "harbour-kitchen", name: "Harbour Kitchen", category: "Food & drink",
    tagline: "A restaurant site with menu, bookings and pre-orders.",
    description: "A restaurant website that does the work: a beautiful menu, table reservations with time slots, and click-and-collect pre-orders.",
    pages: ["Home", "Menu", "Reserve a table", "Order for collection", "Admin: bookings, menu, orders"],
    features: ["Menu with dietary tags", "Table reservations by time slot", "Click-and-collect orders", "Opening hours and location", "Admin dashboard"],
    stack: "Next.js · Supabase · Stripe", minutes: 25,
    prompt: "Build Harbour Kitchen, a website for a seafood restaurant. Home page with a hero, today's specials, opening hours and a map link. Menu page grouped by starters, mains, desserts and drinks, with prices and dietary tags (vegan, gluten-free, contains nuts). Reservations: choose date, party size and an available 30-minute slot; capacity per slot is set by staff; send a confirmation email. Click-and-collect: add dishes to a basket, pick a collection time, pay with Stripe. Admin: today's bookings, manage slots and capacity, edit the menu, and see orders with statuses. Elegant coastal design: deep navy, sand and a coral accent.",
    design: { kind: "restaurant", palette: p("#f6f1e8", "#fffdf8", "#13243a", "#6c7280", "#e2603f", "#2f6f8f", "#ece3d3"), headline: "Fresh from the harbour", sub: "Tonight's menu" },
  },
  {
    slug: "field-notes", name: "Field Notes", category: "Content",
    tagline: "A blog and newsletter with members-only posts.",
    description: "A writing home: posts with rich formatting, tags and search, a newsletter sign-up and members-only posts for paying supporters.",
    pages: ["Home with latest posts", "Post page", "Tag and search", "Subscribe", "Members area", "Admin editor"],
    features: ["Markdown editor with images", "Tags and full-text search", "Newsletter sign-ups", "Paid memberships (Stripe)", "RSS feed"],
    stack: "Next.js · Supabase · Stripe", minutes: 20,
    prompt: "Build Field Notes, a blog and newsletter for a nature writer. Home page with the latest post featured large and a list of recent posts with reading time. Post pages with clean typography, images and footnotes. Tag pages and full-text search. A Subscribe page for the free newsletter (email confirmation) and paid membership via Stripe; members-only posts show a teaser to everyone else. Admin editor (owner only) with Markdown, image upload, tags, publish/schedule and a preview. Generate an RSS feed and sitemap. Quiet, bookish design with a serif body font and wide margins.",
    design: { kind: "blog", palette: p("#f7f5f0", "#ffffff", "#20221f", "#6d6f68", "#4c7a54", "#c08a3e", "#e8ece2"), headline: "Field Notes", sub: "Essays on slow places" },
  },
  {
    slug: "deal-desk", name: "Deal Desk", category: "Internal tools",
    tagline: "A lightweight CRM your team will actually use.",
    description: "An internal tool for a small sales team: contacts, companies, a deal pipeline board, tasks and a weekly summary.",
    pages: ["Pipeline board", "Contacts and companies", "Deal detail with notes", "Tasks", "Reports"],
    features: ["Drag-and-drop pipeline stages", "Notes and activity history", "Task reminders", "Team roles", "Weekly summary email"],
    stack: "Next.js · Supabase", minutes: 30,
    prompt: "Build Deal Desk, an internal CRM for a five-person sales team. Pipeline board with columns Lead, Qualified, Proposal, Won, Lost; drag deals between stages (keyboard accessible too); each card shows company, value and owner. Contacts and companies lists with search and filters. Deal page with value, stage history, notes, attached files and tasks. My tasks page with due dates and overdue highlighting. Reports: pipeline value by stage and win rate this quarter. Team members sign in; admins manage users. Every Monday email each person a summary of their open deals and tasks. Practical, compact design with a left sidebar and keyboard shortcuts.",
    design: { kind: "crm", palette: p("#f5f6f8", "#ffffff", "#1a1f2b", "#687083", "#2563eb", "#f59e0b", "#e8eefc"), headline: "Pipeline", sub: "$184k open" },
  },
];

export const STARTER_CATEGORIES = [...new Set(STARTERS.map((s) => s.category))];

export function starterBySlug(slug: string): Starter | undefined {
  return STARTERS.find((s) => s.slug === slug);
}

/** Link that opens Create Project with this starter's name and brief filled in. */
export function starterHref(s: Starter, signedIn: boolean): string {
  const q = new URLSearchParams({ template: s.slug, name: s.name, prompt: s.prompt });
  return signedIn ? `/new-project?${q.toString()}` : `/sign-up?${q.toString()}`;
}

/** A different idea each day (same for everyone that day), for the dashboard. */
export function ideasForDay(date: Date, count = 3): Starter[] {
  const day = Math.floor(date.getTime() / 86_400_000);
  return Array.from({ length: count }, (_, i) => STARTERS[(day + i * 4) % STARTERS.length]!);
}
