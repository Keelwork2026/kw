import type { AppTemplate } from "../types";
import { PAL } from "../palettes";

const STAGE = { Lead: "neutral", Qualified: "info", Proposal: "warn", Won: "good", Lost: "bad" } as const;

export const crm: AppTemplate = {
  slug: "app-crm-northwind", name: "CRM for contacts & deals", category: "Business & Corporate", industry: "B2B sales", type: "Web app",
  styles: ["Corporate", "Minimal"], level: "Advanced", featured: true, added: "2026-11-18",
  tagline: "Pipeline, contacts and follow-ups for a 10-person sales team.",
  description: "A sales CRM for a B2B team: a revenue dashboard, a deal pipeline you can advance stage by stage, a searchable contact list with detail drawers, and a shared inbox for replies.",
  useCases: ["Track deals from first call to signature", "See this quarter's revenue against target", "Keep every contact and conversation in one place"],
  features: ["Revenue dashboard", "Deal pipeline", "Contacts with filters", "Shared inbox", "Activity feed", "Team roles"],
  effort: "About 2–3 hours of agent work", stack: "Next.js, Supabase (Postgres + auth), row-level security per team",
  keywords: ["crm", "sales", "pipeline", "deals", "leads", "customers", "contacts", "b2b", "sales team", "account management"],
  brand: "Your Company", palette: PAL.navy, shell: "admin", user: { name: "Emily Carter", role: "Sales lead" },
  screens: [
    { slug: "overview", label: "Overview", icon: "chart", title: "Good morning, Emily", sub: "Q4 so far — 41 days left in the quarter.", modules: [
      { m: "kpis", items: [{ label: "Closed this quarter", value: "$412,800", delta: "↑ 18% vs Q3" }, { label: "Open pipeline", value: "$1.26M", delta: "34 deals" , tone: "info" }, { label: "Win rate", value: "31%", delta: "↑ 4 pts" }, { label: "Avg. cycle", value: "38 days", delta: "↓ 6 days" }] },
      { m: "split", left: [{ m: "chart", title: "Revenue vs target", kind: "bar", unit: "k", labels: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"], series: [{ label: "Closed", values: [96, 118, 104, 142, 156, 112] }, { label: "Target", values: [110, 110, 120, 120, 135, 135] }], ranges: ["3M", "6M"] }],
        right: [{ m: "feed", title: "Recent activity", items: [{ who: "Travis", what: "moved Halden Logistics to Proposal", when: "12m" }, { who: "Emily", what: "won Brightline Foods — $48,000", when: "1h" }, { who: "Sofia", what: "logged a call with Meridian Health", when: "3h" }, { who: "Derek", what: "added 6 contacts from Lagos Tech Week", when: "Yesterday" }] }] },
    ] },
    { slug: "pipeline", label: "Pipeline", icon: "workflow", title: "Deal pipeline", sub: "Move a deal forward when the next step is agreed.", modules: [
      { m: "kanban", title: "Q4 deals", columns: [
        { name: "Lead", cards: [{ title: "Coastal Freight", meta: "Inbound · Derek", value: "$22k" }, { title: "Loft Interiors", meta: "Referral · Sofia", value: "$9k" }] },
        { name: "Qualified", cards: [{ title: "Meridian Health", meta: "Demo Thu · Sofia", value: "$64k" }, { title: "Oakley & Partners", meta: "Budget confirmed · Travis", value: "$31k" }] },
        { name: "Proposal", cards: [{ title: "Halden Logistics", meta: "Sent Mon · Travis", value: "$88k" }] },
        { name: "Won", cards: [{ title: "Brightline Foods", meta: "Signed today · Emily", value: "$48k" }] },
      ] },
    ] },
    { slug: "contacts", label: "Contacts", icon: "users", title: "Contacts", modules: [
      { m: "table", title: "All contacts", search: "Search contacts", action: "Add contact", columns: ["Name", "Company", "Stage", "Owner", "Last touch"], status: 2, filter: 2, tones: STAGE, rows: [
        ["Nicole Edwards", "Meridian Health", "Qualified", "Sofia", "Today"], ["Daniel Brooks", "Halden Logistics", "Proposal", "Travis", "Yesterday"], ["Megan Bell", "Brightline Foods", "Won", "Emily", "Today"],
        ["Chen Wei", "Coastal Freight", "Lead", "Derek", "2 days"], ["Lauren Johnson", "Loft Interiors", "Lead", "Sofia", "5 days"], ["Marcus Hale", "Oakley & Partners", "Qualified", "Travis", "1 week"], ["Priya Nair", "Vantage Retail", "Lost", "Emily", "3 weeks"],
      ] },
    ] },
    { slug: "inbox", label: "Inbox", icon: "inbox", title: "Shared inbox", modules: [
      { m: "inbox", title: "Conversations", reply: "Reply to this thread…", items: [
        { title: "Halden Logistics", meta: "Daniel Brooks · 9:14", badge: "New", preview: "Thanks for the proposal — two questions on onboarding…", body: ["Hi Travis,", "Thanks for the proposal. Two questions: can onboarding start in January, and is the 12-month price fixed if we add a second depot?", "Daniel"] },
        { title: "Meridian Health", meta: "Nicole Edwards · Yesterday", preview: "Thursday at 2pm works for the demo.", body: ["Thursday at 2pm works for the demo. I'll bring our operations manager.", "Nicole"] },
        { title: "Brightline Foods", meta: "Megan Bell · Yesterday", preview: "Signed copy attached.", body: ["Signed copy attached — looking forward to getting started.", "Megan"] },
      ] },
    ] },
  ],
};

export const projects: AppTemplate = {
  slug: "app-project-tracker", name: "Project & task tracker", category: "Productivity & Workflow", industry: "Agencies and product teams", type: "Web app",
  styles: ["Minimal", "Technical"], level: "Beginner-friendly", added: "2026-11-18",
  tagline: "Boards, timelines and workload for a team shipping client work.",
  description: "Project management for a small studio: a sprint board you can move cards across, project progress, a weekly schedule and a task list you can filter by owner.",
  useCases: ["Run weekly sprints", "See which projects are at risk", "Balance work across the team"],
  features: ["Kanban board", "Project progress", "Weekly schedule", "Task list with filters", "Activity feed"],
  effort: "About 1–2 hours of agent work", stack: "Next.js, Supabase, realtime updates",
  keywords: ["project management", "tasks", "kanban", "board", "sprint", "team", "agency", "todo", "workflow", "trello", "asana", "productivity"],
  brand: "Your Studio", palette: PAL.violet, shell: "admin", user: { name: "Jake Allen", role: "Project lead" },
  screens: [
    { slug: "board", label: "Board", icon: "layout", title: "Sprint 14 · Nov 17–28", sub: "9 tasks · 3 days in", modules: [
      { m: "kanban", title: "Sprint board", columns: [
        { name: "To do", cards: [{ title: "Checkout copy review", meta: "Kestrel Shop · Amy" }, { title: "Onboarding emails", meta: "Lumen App · Jake" }, { title: "Footer links audit", meta: "Kestrel Shop · Owen" }] },
        { name: "In progress", cards: [{ title: "Booking flow screens", meta: "Harbour Clinic · Amy" }, { title: "Pricing page build", meta: "Lumen App · Owen" }] },
        { name: "Review", cards: [{ title: "Accessibility fixes", meta: "Harbour Clinic · Jake" }] },
        { name: "Done", cards: [{ title: "Brand colours", meta: "Kestrel Shop · Amy" }, { title: "Sitemap", meta: "Lumen App · Owen" }, { title: "Analytics setup", meta: "Harbour Clinic · Jake" }] },
      ] },
    ] },
    { slug: "projects", label: "Projects", icon: "folder", title: "Projects", modules: [
      { m: "kpis", items: [{ label: "Active projects", value: "3" }, { label: "Due this month", value: "2", tone: "warn", delta: "Kestrel launch Nov 30" }, { label: "Tasks done this week", value: "14", delta: "↑ 5" }, { label: "Overdue", value: "1", tone: "bad", delta: "Footer links audit" }] },
      { m: "progress", title: "Delivery", items: [{ title: "Kestrel Shop", meta: "Launch Nov 30 · 6 tasks left", pct: 78 }, { title: "Harbour Clinic", meta: "Beta Dec 12 · 11 tasks left", pct: 54 }, { title: "Lumen App", meta: "Discovery · 18 tasks left", pct: 22 }] },
    ] },
    { slug: "schedule", label: "Schedule", icon: "clock", title: "This week", modules: [
      { m: "calendar", title: "Team schedule", days: ["Mon 17", "Tue 18", "Wed 19", "Thu 20", "Fri 21"], events: [
        { day: 0, start: "09:30", end: "10:00", title: "Sprint planning", tone: "info", meta: "Whole team" }, { day: 1, start: "11:00", end: "12:00", title: "Kestrel review", tone: "warn", meta: "Client call with Kestrel" },
        { day: 2, start: "14:00", end: "15:30", title: "Design crit", tone: "info" }, { day: 3, start: "10:00", end: "11:00", title: "Harbour demo", tone: "good", meta: "Booking flow walkthrough" }, { day: 4, start: "16:00", end: "16:30", title: "Retro", tone: "neutral" },
      ] },
    ] },
    { slug: "tasks", label: "Tasks", icon: "check", title: "All tasks", modules: [
      { m: "table", title: "Tasks", search: "Search tasks", action: "New task", columns: ["Task", "Project", "Owner", "Status", "Due"], status: 3, filter: 2, tones: { "To do": "neutral", "In progress": "info", Review: "warn", Done: "good", Overdue: "bad" }, rows: [
        ["Checkout copy review", "Kestrel Shop", "Amy", "To do", "Nov 24"], ["Booking flow screens", "Harbour Clinic", "Amy", "In progress", "Nov 21"], ["Pricing page build", "Lumen App", "Owen", "In progress", "Nov 26"],
        ["Accessibility fixes", "Harbour Clinic", "Jake", "Review", "Nov 20"], ["Footer links audit", "Kestrel Shop", "Owen", "Overdue", "Nov 18"], ["Brand colours", "Kestrel Shop", "Amy", "Done", "Nov 14"],
      ] },
    ] },
  ],
};

export const helpdesk: AppTemplate = {
  slug: "app-helpdesk", name: "Customer support helpdesk", category: "Technology & SaaS", industry: "Customer support", type: "Internal tool",
  styles: ["Minimal", "Technical"], level: "Advanced", added: "2026-11-19",
  tagline: "A support inbox with SLAs, queues and customer context.",
  description: "Customer support for a software company: ticket queues with priority filters, a conversation view you can reply in, response-time metrics and a knowledge-base progress tracker.",
  useCases: ["Answer customer tickets as a team", "Watch first-response time", "Spot recurring issues"],
  features: ["Ticket inbox", "Queues and priorities", "SLA dashboard", "Customer details", "Canned replies"],
  effort: "About 2 hours of agent work", stack: "Next.js, Supabase, email webhooks",
  keywords: ["helpdesk", "support", "tickets", "customer service", "zendesk", "inbox", "sla", "saas"],
  brand: "Your Support", palette: PAL.teal, shell: "admin", user: { name: "Ivy Bennett", role: "Support lead" },
  screens: [
    { slug: "inbox", label: "Inbox", icon: "inbox", title: "Open tickets", sub: "12 open · 3 waiting on you", modules: [
      { m: "inbox", title: "Tickets", reply: "Write a reply…", items: [
        { title: "Can't export invoices to CSV", meta: "Harbor Dental · Priority high · 18m", badge: "High", preview: "The export button spins and nothing downloads…", body: ["Hi, the export button spins and nothing downloads. We need last month's invoices for our accountant today.", "Browser: Chrome 131, Windows 11."] },
        { title: "How do I add a second admin?", meta: "Plume Studio · Normal · 1h", preview: "Our co-founder needs admin access…", body: ["Our co-founder needs admin access to billing. Where do I set that?"] },
        { title: "Webhook retries", meta: "Northline Ltd · Normal · 3h", preview: "Do failed webhooks retry automatically?", body: ["Do failed webhooks retry automatically, and for how long?"] },
      ] },
    ] },
    { slug: "queues", label: "Queues", icon: "layers", title: "All tickets", modules: [
      { m: "table", title: "Tickets", search: "Search tickets", columns: ["Subject", "Customer", "Priority", "Assignee", "Waiting"], status: 2, filter: 2, tones: { Urgent: "bad", High: "warn", Normal: "info", Low: "neutral" }, rows: [
        ["Can't export invoices to CSV", "Harbor Dental", "High", "Ivy", "18m"], ["Login loop on Safari", "Kora Labs", "Urgent", "Mason", "42m"], ["How do I add a second admin?", "Plume Studio", "Normal", "Ivy", "1h"],
        ["Webhook retries", "Northline Ltd", "Normal", "Mason", "3h"], ["Change company name", "Bolt Couriers", "Low", "—", "1 day"],
      ] },
    ] },
    { slug: "metrics", label: "Metrics", icon: "chart", title: "Support health", modules: [
      { m: "kpis", items: [{ label: "First response", value: "47 min", delta: "↓ 12 min", tone: "good" }, { label: "Resolved this week", value: "186" }, { label: "Satisfaction", value: "94%", delta: "↑ 2 pts" }, { label: "Breached SLA", value: "3", tone: "bad", delta: "All urgent" }] },
      { m: "chart", title: "Tickets per day", kind: "line", labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], series: [{ label: "Created", values: [42, 38, 51, 47, 36, 12, 9] }, { label: "Resolved", values: [40, 41, 46, 49, 38, 14, 10] }] },
    ] },
  ],
};
