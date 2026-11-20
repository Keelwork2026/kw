/**
 * The app's menus: groups, pages, submenus and the hints shown with them.
 *
 * Every link here points at something that exists: a page, a section anchor
 * on a page, or a project tab. Project links ({ tab, at }) open in the
 * project you're in; from elsewhere they go through that section's project
 * picker (?to=…&at=…) so you choose the project first. menu.test.ts checks
 * that every page, tab and anchor named here is real.
 */
import { PROJECT_TABS } from "./nav";

export type ProjectTab = (typeof PROJECT_TABS)[number]["slug"];

/** Where a menu item goes: an app path (with optional #anchor) or a project tab (+ anchor). */
export type Target = { path: string } | { tab: ProjectTab; at?: string; query?: string };

export type SubItem = { label: string; hint: string; to: Target };

export type MenuItem = {
  /** Top-level route, e.g. "database" → /database. */
  slug: string;
  label: string;
  /** One line under the label when hints are on. */
  hint: string;
  /** "What you can do here" — shown on the page itself. */
  can: string[];
  children?: SubItem[];
};

export type MenuGroup = { id: string; label: string; items: MenuItem[] };

export const MENU: readonly MenuGroup[] = [
  {
    id: "overview", label: "Overview", items: [
      {
        slug: "dashboard", label: "Dashboard", hint: "What's happening across your workspace",
        can: ["See your latest projects and their status", "Spot failing checks and deployments", "Approve what agents are waiting on", "See what's live and this month's spend"],
        children: [
          { label: "Recent projects", hint: "The six you touched last", to: { path: "/dashboard#recent" } },
          { label: "Open incidents", hint: "Anything failing right now", to: { path: "/dashboard#incidents" } },
          { label: "Waiting for approval", hint: "Agent actions that need a yes", to: { path: "/dashboard#approvals" } },
          { label: "Live in production", hint: "What's deployed and where", to: { path: "/dashboard#live" } },
        ],
      },
      {
        slug: "projects", label: "My Projects", hint: "Every app your workspace is building",
        can: ["Open any project", "See status, backend and host at a glance", "Find archived projects"],
        children: [
          { label: "Active projects", hint: "Everything not archived", to: { path: "/projects" } },
          { label: "Archived projects", hint: "Read-only; owners and admins can restore", to: { path: "/projects?archived=1" } },
          { label: "Create a project", hint: "Describe a new app", to: { path: "/new-project" } },
        ],
      },
    ],
  },
  {
    id: "build", label: "Build", items: [
      {
        slug: "new-project", label: "Create Project", hint: "Describe an app and start planning",
        can: ["Name your app and describe what it should do", "The Software Architect drafts a plan for you to approve", "Nothing is built until you approve the plan"],
      },
      {
        slug: "builder", label: "AI Builder", hint: "Chat, plan, approve and watch it build",
        can: ["Pick the backend and host before the first build", "Chat with the planner about features", "Approve the plan, then watch each task on the board", "Preview the app live and export the code as a ZIP"],
        children: [
          { label: "Stack", hint: "Backend and hosting choice", to: { tab: "", at: "stack" } },
          { label: "Chat", hint: "Talk to the planner", to: { tab: "", at: "chat" } },
          { label: "Plan", hint: "Review and approve the plan", to: { tab: "", at: "plan" } },
          { label: "Waiting for you", hint: "Approve or decline agent requests", to: { tab: "", at: "approvals" } },
          { label: "Build board", hint: "Each task and who's on it", to: { tab: "", at: "board" } },
          { label: "Preview and export", hint: "Live preview and ZIP download", to: { tab: "", at: "preview" } },
          { label: "Code editor", hint: "Read, edit and commit files", to: { tab: "code" } },
        ],
      },
      {
        slug: "templates", label: "Templates", hint: "Start from a reviewed template",
        can: ["Start from a designed app starter or one of seventeen website templates", "Use a reviewed template from the marketplace", "Import a page from a website you're allowed to use"],
        children: [
          { label: "Starter templates", hint: "Website templates and app starters", to: { path: "/templates#starters" } },
          { label: "Marketplace templates", hint: "Reviewed templates from others", to: { path: "/templates#reviewed" } },
          { label: "Import a website", hint: "Rebuild a page you own", to: { path: "/templates#import" } },
        ],
      },
      {
        slug: "sites", label: "Websites", hint: "Complete websites written from your business details",
        can: ["Answer a few questions and get a full multi-page website", "Edit every word, regenerate any section, change tone with AI", "Preview on desktop, tablet and mobile, then share a link or export HTML"],
        children: [
          { label: "Your websites", hint: "Drafts in this workspace", to: { path: "/sites" } },
          { label: "Create a website", hint: "From your business profile", to: { path: "/sites/new" } },
          { label: "Website templates", hint: "Seventeen complete sites to preview", to: { path: "/starters" } },
        ],
      },
      {
        slug: "design", label: "Design Studio", hint: "Click an element in the preview to restyle it",
        can: ["Turn on Design mode in a project's preview", "Click any element and describe the change", "Get a scoped plan for just that element"],
        children: [
          { label: "Open a preview", hint: "Design mode lives in the preview", to: { tab: "", at: "preview" } },
        ],
      },
    ],
  },
  {
    id: "data", label: "Data and backend", items: [
      {
        slug: "database", label: "Database Studio", hint: "Tables, policies and migrations",
        can: ["Browse tables and row-level security policies", "Read each migration explained in plain language", "Apply pending migrations to your own database"],
        children: [
          { label: "Tables", hint: "Schema from your migrations", to: { tab: "database", at: "tables" } },
          { label: "Migrations", hint: "Review and apply changes", to: { tab: "database", at: "migrations" } },
        ],
      },
      {
        slug: "backend", label: "Backend Studio", hint: "API routes and server actions",
        can: ["See every API route and server action", "Check each one for auth, validation and rate limits"],
        children: [
          { label: "API routes", hint: "HTTP endpoints in the app", to: { tab: "backend", at: "routes" } },
          { label: "Server actions", hint: "Form and mutation handlers", to: { tab: "backend", at: "actions" } },
        ],
      },
      {
        slug: "integrations", label: "API and Integrations", hint: "Connect services with your own accounts",
        can: ["See which services a project can connect to", "Check which are connected", "Add the keys they need as encrypted secrets"],
        children: [
          { label: "Integration catalogue", hint: "Payments, email, maps and more", to: { tab: "integrations" } },
          { label: "Secrets", hint: "Encrypted keys for integrations", to: { tab: "secrets", at: "set-secret" } },
        ],
      },
      {
        slug: "automation", label: "Automation Studio", hint: "Webhooks, schedules and workflows",
        can: ["Start a workflow from a template", "Trigger by hand, by signed webhook or on a schedule", "Chain HTTP, email, Slack, transform and delay steps", "Watch each run and retry failures"],
        children: [
          { label: "Templates", hint: "Ready-made workflows", to: { tab: "automations", at: "starters" } },
          { label: "Your automations", hint: "Switch on, run now, edit", to: { tab: "automations", at: "wfs" } },
          { label: "Editor", hint: "Build or change a workflow", to: { tab: "automations", at: "editor" } },
          { label: "Run history", hint: "Every run and its steps", to: { tab: "automations", at: "history" } },
        ],
      },
    ],
  },
  {
    id: "quality", label: "Quality", items: [
      {
        slug: "agents", label: "AI Agents", hint: "The specialist team and their models",
        can: ["Meet the eight specialist agents", "See which AI model each one uses", "Understand what needs your approval"],
      },
      {
        slug: "testing", label: "Testing & QA", hint: "Quality, security, UX and release readiness",
        can: ["Run Quick, Full or pre-deployment QA against the running app", "See scores, issues, journeys and release readiness", "Ask the agents to fix issues, then retest", "Run tests, lint, type checks or a build", "See failures turned into incidents"],
        children: [
          { label: "QA overview", hint: "Scores, readiness and what to fix first", to: { tab: "qa" } },
          { label: "Issues", hint: "Findings from every QA run", to: { tab: "qa", query: "view=issues" } },
          { label: "Release readiness", hint: "Why a version can or can't ship", to: { tab: "qa", query: "view=readiness" } },
          { label: "Test plan", hint: "What the app is and what gets tested", to: { tab: "qa", query: "view=plan" } },
          { label: "Reports", hint: "Executive, security, UX and more", to: { tab: "qa", query: "view=reports" } },
          { label: "Run checks", hint: "Start a test or build", to: { tab: "tests", at: "run" } },
          { label: "Run history", hint: "Past runs and logs", to: { tab: "tests", at: "history" } },
          { label: "Incidents", hint: "Failures and proposed fixes", to: { tab: "incidents" } },
        ],
      },
      {
        slug: "security", label: "Security Centre", hint: "Secret scanning, reviews and audits",
        can: ["Scan for leaked secrets", "Run a security review and a dependency audit", "Fix, or accept the risk of, each finding", "Critical findings block deployments until fixed"],
        children: [
          { label: "Run a scan", hint: "Secrets, review or audit", to: { tab: "security", at: "scans" } },
          { label: "Open findings", hint: "What still needs fixing", to: { tab: "security", at: "findings" } },
          { label: "Accepted risks", hint: "Findings you chose to accept", to: { tab: "security", query: "status=accepted" } },
          { label: "Secrets", hint: "Encrypted, never shown again", to: { tab: "secrets", at: "secret-list" } },
        ],
      },
    ],
  },
  {
    id: "ship", label: "Ship", items: [
      {
        slug: "deployments", label: "Deployment Centre", hint: "Preview and production deployments",
        can: ["Deploy a preview or go to production", "A deploy is only live after its health check passes", "Roll back to any earlier version"],
        children: [
          { label: "Deploy", hint: "Preview or production", to: { tab: "deployments", at: "deploy" } },
          { label: "Deployment history", hint: "Every version, with roll back", to: { tab: "deployments", at: "hist" } },
          { label: "Deploy credentials", hint: "Your Cloudflare or Vercel token", to: { tab: "secrets", at: "set-secret" } },
        ],
      },
      {
        slug: "hosting", label: "Hosting and Infrastructure", hint: "Where each app runs",
        can: ["See each project's host (Cloudflare Workers or Vercel)", "Apps run in your own account, not Keelwork's"],
        children: [
          { label: "Hosts by project", hint: "Pick a project to see its host", to: { tab: "deployments" } },
        ],
      },
      {
        slug: "analytics", label: "Analytics", hint: "Privacy-safe visitor analytics",
        can: ["Turn on cookieless analytics for an app", "See visits, pages and referrers without tracking people"],
        children: [
          { label: "Visitor analytics", hint: "Visits, pages, referrers", to: { tab: "analytics" } },
        ],
      },
    ],
  },
  {
    id: "workspace", label: "Workspace", items: [
      {
        slug: "team", label: "Team Workspace", hint: "Members, roles and invitations",
        can: ["Change what each member can do", "Invite people by email", "Revoke open invitations"],
        children: [
          { label: "Members and roles", hint: "Who's in and what they can do", to: { path: "/team#members" } },
          { label: "Invite someone", hint: "Send an invitation", to: { path: "/team#invite" } },
          { label: "Open invitations", hint: "Pending, revocable", to: { path: "/team#invitations" } },
        ],
      },
      {
        slug: "marketplace", label: "Marketplace", hint: "Publish and install templates",
        can: ["Install a published template into a new project", "Publish your own project for review", "Track your submissions"],
        children: [
          { label: "Browse templates", hint: "Published by others", to: { path: "/marketplace#browse" } },
          { label: "Publish a project", hint: "Submit for review", to: { path: "/marketplace#publish" } },
          { label: "My submissions", hint: "Review status", to: { path: "/marketplace#mine" } },
        ],
      },
      {
        slug: "billing", label: "Billing and Usage", hint: "Credits, plans and limits",
        can: ["See your credit balance and plan", "Buy credits or change plan", "Set a monthly spending limit", "See every charge in the usage history"],
        children: [
          { label: "Plan", hint: "Change or manage your plan", to: { path: "/billing#plan" } },
          { label: "Buy credits", hint: "Top up your balance", to: { path: "/billing#packs" } },
          { label: "Spending limit", hint: "Cap monthly AI spend", to: { path: "/billing#limit" } },
          { label: "Usage history", hint: "Every charge, itemised", to: { path: "/billing#history" } },
        ],
      },
      {
        slug: "settings", label: "Settings", hint: "Workspace and account settings",
        can: ["Rename or create an organization", "Change your password and sign out other sessions", "Read the audit log", "Approve or revoke staff support access"],
        children: [
          { label: "Organization", hint: "Name and new workspaces", to: { path: "/settings" } },
          { label: "New organization", hint: "Start another workspace", to: { path: "/settings#new-org" } },
          { label: "Account security", hint: "Password and sessions", to: { path: "/settings/security" } },
          { label: "Audit log", hint: "Every sensitive action", to: { path: "/settings/audit" } },
          { label: "Support access", hint: "Approve staff, read-only, time-limited", to: { path: "/settings/support" } },
        ],
      },
      {
        slug: "docs", label: "Documentation", hint: "How Keelwork works",
        can: ["Learn how ideas become apps", "Understand credits, secrets and deployments"],
        children: [
          { label: "From idea to app", hint: "The whole flow", to: { path: "/docs#start" } },
          { label: "The agents", hint: "Who does what", to: { path: "/docs#agents" } },
          { label: "Credits", hint: "How usage is charged", to: { path: "/docs#credits" } },
          { label: "Secrets", hint: "How keys are protected", to: { path: "/docs#secrets" } },
          { label: "Deploying", hint: "Health checks and roll back", to: { path: "/docs#deploy" } },
          { label: "Your code is yours", hint: "Export anytime", to: { path: "/docs#own" } },
        ],
      },
    ],
  },
];

/** Hints for the project tabs: what each tab is for and the sections to jump to. */
export const PROJECT_TAB_HINTS: Record<ProjectTab, { hint: string; can: string[]; jump?: { label: string; at?: string; query?: string }[] }> = {
  "": { hint: "Plan and build with the agents", can: ["Choose the stack", "Chat with the planner and approve the plan", "Answer agent requests", "Preview and export"], jump: [{ label: "Stack", at: "stack" }, { label: "Chat", at: "chat" }, { label: "Plan", at: "plan" }, { label: "Waiting for you", at: "approvals" }, { label: "Board", at: "board" }, { label: "Preview", at: "preview" }] },
  code: { hint: "Browse, edit and commit files", can: ["Open any file in the editor", "Save changes as a commit", "See history and restore old versions"] },
  database: { hint: "Schema and migrations", can: ["Browse tables and policies", "Apply pending migrations"], jump: [{ label: "Tables", at: "tables" }, { label: "Migrations", at: "migrations" }] },
  backend: { hint: "Routes and server actions", can: ["Review every endpoint for auth and validation"], jump: [{ label: "API routes", at: "routes" }, { label: "Server actions", at: "actions" }] },
  qa: { hint: "Quality assurance and release readiness", can: ["Run Quick or Full QA", "Triage issues and ask the agents to fix them", "See release readiness"], jump: [{ label: "Overview" }, { label: "Issues", query: "view=issues" }, { label: "Results", query: "view=tests" }, { label: "Release", query: "view=readiness" }, { label: "Reports", query: "view=reports" }] },
  tests: { hint: "Run checks and read logs", can: ["Run tests, lint, type checks and builds", "Read full logs"], jump: [{ label: "Run checks", at: "run" }, { label: "History", at: "history" }] },
  incidents: { hint: "What's failing and fixes", can: ["See failures from checks, deploys and automations", "Ask for a proposed fix, or dismiss"], jump: [{ label: "Show closed", query: "all=1" }] },
  security: { hint: "Findings from scans and reviews", can: ["Run scans", "Fix or accept findings"], jump: [{ label: "Run a scan", at: "scans" }, { label: "Findings", at: "findings" }, { label: "Accepted", query: "status=accepted" }] },
  deployments: { hint: "Deploy and roll back", can: ["Deploy preview or production", "Roll back to any version"], jump: [{ label: "Deploy", at: "deploy" }, { label: "History", at: "hist" }] },
  analytics: { hint: "Cookieless visitor stats", can: ["Turn analytics on", "See visits and referrers"] },
  automations: { hint: "Workflows for this app", can: ["Start from a template", "Edit, run and watch workflows"], jump: [{ label: "Templates", at: "starters" }, { label: "Automations", at: "wfs" }, { label: "Editor", at: "editor" }, { label: "Run history", at: "history" }] },
  integrations: { hint: "Connect outside services", can: ["See what's connected", "Add the keys each service needs"] },
  secrets: { hint: "Encrypted keys and tokens", can: ["Add or replace a secret per environment", "Values are never shown again"], jump: [{ label: "Secrets", at: "secret-list" }, { label: "Add a secret", at: "set-secret" }] },
};

const ANCHOR_RE = /^[a-z][a-z0-9-]{0,40}$/;
const TAB_SLUGS = new Set<string>(PROJECT_TABS.map((t) => t.slug));

/** Resolves a target to a URL. Project targets need a project id, or the picker slug to go through. */
export function hrefFor(to: Target, ctx: { projectId?: string | null; pickerSlug: string }): string {
  if ("path" in to) return to.path;
  const q = to.query ? `?${to.query}` : "";
  const hash = to.at ? `#${to.at}` : "";
  if (ctx.projectId) return `/projects/${ctx.projectId}${to.tab ? `/${to.tab}` : ""}${q}${hash}`;
  const params = new URLSearchParams({ to: to.tab || "build" });
  if (to.at) params.set("at", to.at);
  if (to.query) params.set("q", to.query);
  return `/${ctx.pickerSlug}?${params.toString()}`;
}

/** Validates the picker's ?to / ?at / ?q so they can only point at a real tab, a plain anchor and a known filter. */
export function pickerTarget(sp: { to?: string; at?: string; q?: string }): { tab: string; at: string | null; query: string | null } | null {
  if (!sp.to) return null;
  const tab = sp.to === "build" ? "" : sp.to;
  if (!TAB_SLUGS.has(tab)) return null;
  const at = sp.at && ANCHOR_RE.test(sp.at) ? sp.at : null;
  const query = sp.q && /^(status=(open|accepted|resolved)|all=1|view=(issues|tests|readiness|plan|reports|history|settings))$/.test(sp.q) ? sp.q : null;
  return { tab, at, query };
}

/** The menu item for a path like /billing or /settings/audit (longest match wins), plus its group. */
export function itemForPath(pathname: string): { item: MenuItem; group: MenuGroup } | null {
  const first = pathname.split("/")[1] ?? "";
  for (const group of MENU) for (const item of group.items) if (item.slug === first) return { item, group };
  return null;
}

/** Inside a project, the sidebar highlights the studio that owns the open tab. */
export const TAB_TO_MENU: Record<ProjectTab, string> = {
  "": "builder", code: "builder", database: "database", backend: "backend", qa: "testing", tests: "testing", incidents: "testing",
  security: "security", secrets: "security", deployments: "deployments", analytics: "analytics", automations: "automation", integrations: "integrations",
};

export const PROJECT_PATH_RE = /^\/projects\/([0-9a-f-]{36})(?:\/([a-z]+))?/i;

/** Quick search: every lower-case word of the query must appear in the entry's label, hint or group. */
export function matches(e: { label: string; hint: string; group: string }, query: string): boolean {
  const hay = `${e.label} ${e.hint} ${e.group}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
