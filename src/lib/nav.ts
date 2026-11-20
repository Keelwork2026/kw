/** The 21 primary sections of the app shell, in sidebar order. */
export type Section = {
  slug: string;
  label: string;
  phase: number;
  /** Live sections have a real page; others render an honest "Arrives in Phase N" card. */
  live: boolean;
  /** Org-level pickers list the organization's projects and link to a project tab. */
  projectTab?: string;
  description: string;
};

export const SECTIONS: readonly Section[] = [
  { slug: "dashboard", label: "Dashboard", phase: 1, live: true, description: "What's happening across your organization." },
  { slug: "projects", label: "My Projects", phase: 2, live: true, description: "Every app your organization is building." },
  { slug: "new-project", label: "Create Project", phase: 2, live: true, description: "Describe an app and start building." },
  { slug: "builder", label: "AI Builder", phase: 2, live: true, projectTab: "", description: "Chat, plan and build with the agents." },
  { slug: "templates", label: "Templates", phase: 4, live: true, description: "Start from a reviewed template." },
  { slug: "design", label: "Design Studio", phase: 5, live: true, projectTab: "", description: "Click any element in the preview to restyle it." },
  { slug: "database", label: "Database Studio", phase: 6, live: true, projectTab: "database", description: "Tables, policies and migrations." },
  { slug: "backend", label: "Backend Studio", phase: 6, live: true, projectTab: "backend", description: "API routes and server actions." },
  { slug: "integrations", label: "API and Integrations", phase: 7, live: true, projectTab: "integrations", description: "Connect services with your own accounts." },
  { slug: "automation", label: "Automation Studio", phase: 7, live: true, projectTab: "automations", description: "Webhooks, schedules and workflows." },
  { slug: "agents", label: "AI Agents", phase: 3, live: true, description: "The specialist team and the models they use." },
  { slug: "testing", label: "Testing Centre", phase: 8, live: true, projectTab: "tests", description: "Tests, type checks, lint and builds." },
  { slug: "security", label: "Security Centre", phase: 8, live: true, projectTab: "security", description: "Secret scanning, reviews and audits." },
  { slug: "deployments", label: "Deployment Centre", phase: 9, live: true, projectTab: "deployments", description: "Preview and production deployments." },
  { slug: "hosting", label: "Hosting and Infrastructure", phase: 9, live: true, projectTab: "deployments", description: "Where each app runs." },
  { slug: "analytics", label: "Analytics", phase: 12, live: true, projectTab: "analytics", description: "Privacy-safe visitor analytics." },
  { slug: "team", label: "Team Workspace", phase: 1, live: true, description: "Members, roles and invitations." },
  { slug: "marketplace", label: "Marketplace", phase: 12, live: true, description: "Publish and install templates." },
  { slug: "docs", label: "Documentation", phase: 13, live: true, description: "How Keelwork works." },
  { slug: "billing", label: "Billing and Usage", phase: 10, live: true, description: "Credits, plans and limits." },
  { slug: "settings", label: "Settings", phase: 1, live: true, description: "Organization and account settings." },
] as const;

export function sectionBySlug(slug: string): Section | undefined {
  return SECTIONS.find((s) => s.slug === slug);
}

/** Project tabs, in order. Only views that work are listed. */
export const PROJECT_TABS = [
  { slug: "", label: "Build" },
  { slug: "code", label: "Code" },
  { slug: "database", label: "Database" },
  { slug: "backend", label: "Backend" },
  { slug: "media", label: "Media" },
  { slug: "qa", label: "QA" },
  { slug: "tests", label: "Tests" },
  { slug: "incidents", label: "Incidents" },
  { slug: "security", label: "Security" },
  { slug: "deployments", label: "Deploy" },
  { slug: "analytics", label: "Analytics" },
  { slug: "automations", label: "Automations" },
  { slug: "integrations", label: "Integrations" },
  { slug: "secrets", label: "Secrets" },
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
