/**
 * Words for the public site. Every claim here describes something Keelwork
 * does today; where a capability depends on your own accounts (AI keys,
 * Cloudflare, Vercel, Stripe), the copy says so.
 */
import type { IconName, Tint } from "@/components/marketing/menu-data";

export type Visual = "chat" | "design" | "table" | "agents" | "flow" | "code" | "checks" | "integrations" | "deploy" | "motion";

export type FeaturePage = {
  slug: string; title: string; icon: IconName; tint: Tint; tagline: string; intro: string;
  points: { title: string; body: string }[];
  steps: string[];
  visual: Visual;
  appPath: string;
  related: string[];
};

export const FEATURES: FeaturePage[] = [
  {
    slug: "ai-builder", title: "AI Builder", icon: "sparkles", tint: "orange", visual: "chat", appPath: "/builder",
    tagline: "Describe it. Approve the plan. Watch it build.",
    intro: "Tell Keelwork what you want in plain words. The Software Architect asks the questions a good developer would, writes a plan you can read, and only starts once you approve it. Then a team of specialist agents builds it task by task while you watch.",
    points: [
      { title: "A plan before any code", body: "You see pages, data, integrations and risks up front. Change anything, then approve." },
      { title: "A live build board", body: "Every task shows who is working on it, what changed and whether its checks passed." },
      { title: "You stay in charge", body: "Risky steps — deleting files, running migrations, pushing changes — wait for your yes." },
      { title: "Real code you own", body: "Next.js and TypeScript in a Git history. Export the full source as a ZIP whenever you like." },
    ],
    steps: ["Describe your idea, or start from a template", "Answer a few questions and approve the plan", "Watch the agents build and test it in a sandbox", "Preview it live, then deploy to your own account"],
    related: ["agents", "design-studio", "testing-security"],
  },
  {
    slug: "design-studio", title: "Design Studio", icon: "brush", tint: "pink", visual: "design", appPath: "/design",
    tagline: "Click anything. Describe the change. Done.",
    intro: "Turn on Design mode in the live preview and click any element. Keelwork knows exactly which file and line it came from, so “make this button rounder and use our brand red” becomes a small, scoped change instead of a guess.",
    points: [
      { title: "Point, don't explain", body: "Select a heading, card or button in the preview; the request is tied to that element." },
      { title: "Scoped edits", body: "The planner proposes a change to just that component, so nothing else moves." },
      { title: "Design-system aware", body: "Colours, spacing and fonts come from your tokens, keeping every page consistent." },
      { title: "Accessible by default", body: "Contrast, focus states and tap targets are checked on every change." },
    ],
    steps: ["Open your project's live preview", "Switch on Design mode", "Click an element and say what to change", "Approve the scoped plan and see it update"],
    related: ["ai-builder", "motion", "code-editor"],
  },
  {
    slug: "database", title: "Database & Auth", icon: "database", tint: "violet", visual: "table", appPath: "/database",
    tagline: "Real tables, sign-ins and storage — safe by default.",
    intro: "Every app gets a real database, chosen per project: Supabase (default), plain PostgreSQL, Appwrite or Tencent CloudBase. Tables come with row-level security, and the Database tab explains each migration in plain language before anyone applies it.",
    points: [
      { title: "Security first", body: "Row-level security on every table and no anonymous writes unless you ask for them." },
      { title: "Migrations explained", body: "Each statement is described in plain words. Destructive changes need the file name typed to confirm." },
      { title: "Sign-in built in", body: "Email sign-in with verification, plus Google, Microsoft or GitHub when you add their keys." },
      { title: "Your database, your account", body: "Data lives in your own project — Keelwork never keeps a copy." },
    ],
    steps: ["Choose a backend when you create the project", "Agents write the tables and policies as migrations", "Review each migration in the Database tab", "Apply it to your own database in one transaction"],
    related: ["backend", "integrations", "testing-security"],
  },
  {
    slug: "agents", title: "AI Agents", icon: "bot", tint: "blue", visual: "agents", appPath: "/agents",
    tagline: "Eight specialists that check each other's work.",
    intro: "Architect, Database, Backend, Frontend, Integrations, QA, Security and Docs. Each works through tools that a policy engine checks before anything runs, and every tool call is logged with secret-looking values masked.",
    points: [
      { title: "Specialists, not one generalist", body: "Each agent has a narrow job and the tools for it — nothing more." },
      { title: "Reviewed work", body: "QA and Security review what the others produce before it reaches you." },
      { title: "Your choice of models", body: "A provider-neutral catalogue routes planning and coding to the models you configure, such as Kimi and DeepSeek." },
      { title: "Spending you control", body: "Every call is metered against your balance and monthly limit, and stops before going over." },
    ],
    steps: ["You approve a plan", "The Architect splits it into tasks", "Specialists build, QA tests, Security reviews", "Anything risky waits for your approval"],
    related: ["ai-builder", "testing-security", "automations"],
  },
  {
    slug: "automations", title: "Automations", icon: "bolt", tint: "yellow", visual: "flow", appPath: "/automation",
    tagline: "Emails, webhooks and schedules without the plumbing.",
    intro: "Chain HTTP calls, emails, Slack messages, data transforms and delays into workflows. Trigger them by hand, by a signed webhook or on a schedule, and watch every run step by step.",
    points: [
      { title: "Three ways to start", body: "Run now, a signed webhook (replays refused) or a schedule as often as every 5 minutes." },
      { title: "Steps that talk to each other", body: "Use earlier steps' output in later ones; secrets only ever go into HTTP headers and bodies." },
      { title: "Retries built in", body: "Temporary failures retry with backoff; real failures open an incident you can fix." },
      { title: "Drafts until approved", body: "Saving makes a draft; an owner or admin switches it on." },
    ],
    steps: ["Start from a template or a blank workflow", "Add steps and wire their inputs", "Save as a draft and test with Run now", "Switch it on and watch the run history"],
    related: ["integrations", "agents", "deploy"],
  },
  {
    slug: "code-editor", title: "Code Editor", icon: "code", tint: "navy", visual: "code", appPath: "/builder",
    tagline: "All the source, with history, in your browser.",
    intro: "Browse every file the agents wrote, edit with syntax highlighting, and save each change as a commit. Open any earlier version, compare it, and restore it in one click. Export the whole project as a ZIP at any time.",
    points: [
      { title: "A proper editor", body: "Syntax highlighting for TypeScript, CSS, SQL, Markdown and more." },
      { title: "Every save is a commit", body: "Full history per file with diffs and one-click restore." },
      { title: "Safe by design", body: "Secrets and env files are never shown, exported or committed." },
      { title: "Leave any time", body: "Export the full source; a README lists the variables your app needs by name." },
    ],
    steps: ["Open the Code tab of a project", "Pick a file from the tree", "Edit and save — it becomes a commit", "Export the ZIP when you want it elsewhere"],
    related: ["ai-builder", "testing-security", "deploy"],
  },
  {
    slug: "testing-security", title: "Testing & Security", icon: "shield", tint: "green", visual: "checks", appPath: "/testing",
    tagline: "Every change tested and scanned before it ships.",
    intro: "Tests, type checks, lint and builds run in the project's sandbox. Keelwork picks the tests a change affects first, scans for leaked secrets, reviews code for security issues and audits dependencies — and critical findings block deployment until they're fixed.",
    points: [
      { title: "Smart test selection", body: "Run only the tests a change can affect, then the full suite before release." },
      { title: "Secret scanning", body: "Keys and tokens are caught before they reach a commit, an export or a deploy." },
      { title: "Security review and audit", body: "Findings come with a location and a hint; fix them or record why you accept the risk." },
      { title: "Incidents that close themselves", body: "Failures open incidents that close automatically when the same thing succeeds." },
    ],
    steps: ["Agents run checks after each task", "Read results and full logs in the Tests tab", "Fix or accept security findings", "Deploy once nothing critical is open"],
    related: ["agents", "deploy", "code-editor"],
  },
  {
    slug: "integrations", title: "Integrations", icon: "plug", tint: "violet", visual: "integrations", appPath: "/integrations",
    tagline: "Payments, email, messaging and AI — with your own accounts.",
    intro: "Connect the services your app needs using your own keys. Each integration lists exactly which secrets it needs; add them on the Secrets tab, where every value is encrypted with its own key and can never be read back.",
    points: [
      { title: "Your accounts, your data", body: "Stripe, Resend, Slack, Twilio, OpenAI, Anthropic, Kimi and more run under your keys, not Keelwork's." },
      { title: "Encrypted secrets", body: "Each value has its own key; not you, agents or Keelwork staff can read it again." },
      { title: "Clear status", body: "See at a glance which integrations are connected and which secrets are missing." },
      { title: "Per environment", body: "Different keys for development, preview and production." },
    ],
    steps: ["Open a project's Integrations tab", "See which secrets each service needs", "Add them on the Secrets tab", "Ask the agents to use the integration"],
    related: ["automations", "database", "deploy"],
  },
  {
    slug: "deploy", title: "Publish & Hosting", icon: "globe", tint: "blue", visual: "deploy", appPath: "/deployments",
    tagline: "Deploy to your own Cloudflare or Vercel — with rollback.",
    intro: "Ship a preview, then production, to your own Cloudflare Workers or Vercel account. A deployment is only called live after its health check passes; on Cloudflare, a failed live check switches traffic back automatically. Roll back to any earlier version.",
    points: [
      { title: "Your hosting account", body: "Apps run in your account with your domain settings; Keelwork never hosts your users' traffic." },
      { title: "Health-checked", body: "/api/health, then the home page — only then is a deployment marked live." },
      { title: "Instant rollback", body: "Every version is kept; switch back in one click." },
      { title: "Blocked when unsafe", body: "Open critical security findings stop deployments from anyone, including agents." },
    ],
    steps: ["Add your Cloudflare or Vercel token as a secret", "Deploy a preview and check it", "Deploy to production", "Roll back any time from History"],
    related: ["testing-security", "code-editor", "integrations"],
  },
  {
    slug: "motion", title: "Motion & 3D", icon: "film", tint: "orange", visual: "motion", appPath: "/builder",
    tagline: "Animations, scroll effects and 3D scenes that stay fast.",
    intro: "Ask for page transitions, hover and scroll effects or an interactive 3D scene, and the agents build them with rules baked in: every effect respects “reduce motion”, stays within a performance budget and keeps content readable without it.",
    points: [
      { title: "Respects reduced motion", body: "Every animation has a calm fallback for people who turn motion off." },
      { title: "Performance budgets", body: "Effects are checked so pages stay smooth on ordinary phones." },
      { title: "3D that degrades well", body: "Scenes load progressively and show a still image where WebGL isn't available." },
      { title: "Tunable by chat", body: "“Slower”, “less bounce”, “only on desktop” — say it and the change is scoped." },
    ],
    steps: ["Describe the effect you want", "Approve the scoped plan", "Try it in the live preview", "Tweak timing by chatting"],
    related: ["design-studio", "ai-builder", "testing-security"],
  },
  {
    slug: "backend", title: "Backend Studio", icon: "wrench", tint: "green", visual: "table", appPath: "/backend",
    tagline: "Every API route and server action, checked.",
    intro: "See every endpoint and server action in your app, with heuristic checks for sign-in, input validation and rate limiting, so gaps are visible before users find them.",
    points: [
      { title: "One list of everything", body: "API routes and server actions, read straight from the source." },
      { title: "Checks at a glance", body: "Auth, validation and rate-limit patterns marked per endpoint." },
      { title: "Honest heuristics", body: "A tick means the pattern was found — not a guarantee — and the page says so." },
      { title: "Fix with a sentence", body: "Ask the Backend agent to add the missing check, scoped to that endpoint." },
    ],
    steps: ["Open a project's Backend tab", "Scan the route and action list", "Spot missing checks", "Ask the agents to fix them"],
    related: ["database", "testing-security", "agents"],
  },
  {
    slug: "teams", title: "Teams & Roles", icon: "users", tint: "pink", visual: "agents", appPath: "/team",
    tagline: "Build together, with the right permissions.",
    intro: "Invite people by email and give each a role — owner, admin, member, billing or viewer. Sensitive actions are recorded in an audit log, and staff support access needs an owner's approval, is read-only and expires.",
    points: [
      { title: "Clear roles", body: "Owners and admins manage people; billing managers handle plans and credits; members build; viewers watch." },
      { title: "Audit log", body: "Sign-ins, role changes, secrets, deployments and approvals — all recorded." },
      { title: "Support you control", body: "Staff ask, owners approve for 1–72 hours, and can end it early." },
      { title: "Several workspaces", body: "Keep clients or teams in separate organizations with separate billing." },
    ],
    steps: ["Open Team Workspace", "Invite by email with a role", "Change roles any time", "Review the audit log"],
    related: ["agents", "deploy", "integrations"],
  },
];

export type Solution = { slug: string; title: string; icon: IconName; tint: Tint; tagline: string; intro: string; jobs: string[]; starters: string[]; features: string[] };

export const SOLUTIONS: Solution[] = [
  { slug: "founders", title: "Founders", icon: "rocket", tint: "orange", tagline: "From idea to paying customers, fast.", intro: "Validate an idea with a real product, not a slide. Start from a waitlist or a SaaS starter, take payments with your own Stripe account, and keep the code when you raise or hire.", jobs: ["Launch a waitlist this afternoon", "Ship an MVP with sign-in and billing", "Iterate daily from customer feedback", "Hand real code to your first engineer"], starters: ["launchpad", "pulse-analytics", "clay-and-co"], features: ["ai-builder", "deploy", "integrations"] },
  { slug: "designers", title: "Designers", icon: "pen", tint: "pink", tagline: "Ship the design you drew — not a handoff of it.", intro: "Click any element in the live preview and describe the change. Typography, spacing and motion stay true to your system, and accessibility checks run on every edit.", jobs: ["Turn a portfolio into a real site", "Prototype with real data", "Polish motion and micro-interactions", "Keep your design tokens consistent"], starters: ["folio", "field-notes", "launchpad"], features: ["design-studio", "motion", "code-editor"] },
  { slug: "agencies", title: "Agencies", icon: "briefcase", tint: "blue", tagline: "One workspace per client, with approvals.", intro: "Keep each client in its own organization, with its own billing, roles and audit log. Agents propose; you and the client approve; deployments go to the client's own hosting account.", jobs: ["Spin up client sites from starters", "Get approvals before risky changes", "Deploy to the client's own account", "Hand over the full source"], starters: ["harbour-kitchen", "studio-bookings", "folio"], features: ["teams", "deploy", "ai-builder"] },
  { slug: "product-teams", title: "Product teams", icon: "users", tint: "violet", tagline: "Prototype on real data, then hand over real code.", intro: "Test ideas with working software instead of mock-ups. Everything is TypeScript in Git, tested in a sandbox and exportable, so engineering can pick it up without a rewrite.", jobs: ["Prototype a feature end to end", "Test with real users and data", "Run checks and security reviews", "Export the code to your repo"], starters: ["pulse-analytics", "deal-desk", "streaks"], features: ["testing-security", "code-editor", "agents"] },
  { slug: "internal-tools", title: "Internal tools", icon: "wrench", tint: "green", tagline: "Dashboards and admin panels your team will use.", intro: "Build the tools spreadsheets can't handle: CRMs, approval flows, inventories and reports, with roles, an audit log and automations that send the weekly summary for you.", jobs: ["Replace a shared spreadsheet", "Add approvals and roles", "Automate weekly reports", "Connect your existing services"], starters: ["deal-desk", "pulse-analytics", "studio-bookings"], features: ["database", "automations", "teams"] },
  { slug: "enterprise", title: "Enterprise", icon: "building", tint: "navy", tagline: "Isolation, audit logs and support you control.", intro: "Generated code runs in isolated sandboxes, never on Keelwork's servers. Every sensitive action is audited, secrets are encrypted per value, and staff can only look inside with an owner's time-limited, read-only approval.", jobs: ["Separate organizations per team", "Audit every sensitive action", "Approve or deny support access", "Deploy to accounts you control"], starters: ["deal-desk", "pulse-analytics", "field-notes"], features: ["teams", "testing-security", "deploy"] },
];

export type Tutorial = { slug: string; title: string; minutes: number; level: "Beginner" | "Intermediate"; summary: string; steps: { title: string; body: string }[] };

export const TUTORIALS: Tutorial[] = [
  { slug: "first-app", title: "Your first app in one sitting", minutes: 20, level: "Beginner", summary: "Go from an idea to a live preview: describe it, approve the plan, watch it build and try it.", steps: [
    { title: "Describe your idea", body: "On Create Project, give it a name and two or three sentences: who it's for, what they do, and what makes it yours. Or pick a starter template — its brief is filled in for you." },
    { title: "Choose the stack", body: "Pick a backend (Supabase is a great default) and where it will be deployed. This can't change after the first build, so take a moment." },
    { title: "Plan with the Architect", body: "Press Plan this idea. Answer its questions in the chat, read the plan's pages, data and risks, and ask for changes until it's right. Then approve." },
    { title: "Watch it build", body: "The board shows each task, the agent working on it and its checks. Anything risky waits under Waiting for you." },
    { title: "Preview and iterate", body: "Start the sandbox to open the live preview. Ask for changes in the chat, or switch on Design mode and click what you want changed." },
  ] },
  { slug: "design-mode", title: "Restyle anything with Design mode", minutes: 10, level: "Beginner", summary: "Click elements in the preview and describe changes; get scoped plans that touch only what you picked.", steps: [
    { title: "Open the preview", body: "In the Build tab, start the sandbox and open the preview." },
    { title: "Turn on Design mode", body: "Use the Design mode switch above the preview. Elements highlight as you hover." },
    { title: "Click and describe", body: "Click a heading or button and write the change: “use our coral, bigger, rounder corners”." },
    { title: "Approve the scoped plan", body: "The plan names the file and component. Approve it and watch the preview update." },
  ] },
  { slug: "payments", title: "Take payments with Stripe", minutes: 25, level: "Intermediate", summary: "Add checkout to your app using your own Stripe account, test it, then go live.", steps: [
    { title: "Get test keys", body: "In your Stripe dashboard, copy the test secret key and create a webhook signing secret." },
    { title: "Add them as secrets", body: "On the project's Secrets tab add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET for development and preview." },
    { title: "Ask for checkout", body: "In the chat: “Add Stripe Checkout for the 10-class pass and mark bookings paid from the webhook.” Approve the plan." },
    { title: "Test it", body: "Use Stripe's test card in the preview. Check the order appears and the webhook marked it paid." },
    { title: "Go live", body: "Add your live keys for production only, deploy, and make one real purchase to confirm." },
  ] },
  { slug: "deploy-cloudflare", title: "Deploy to your own Cloudflare account", minutes: 15, level: "Intermediate", summary: "Ship a preview and then production, with health checks and rollback.", steps: [
    { title: "Create an API token", body: "In Cloudflare, create a token that can edit Workers, and note your 32-character account ID." },
    { title: "Add deploy credentials", body: "On the Secrets tab add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. They're used only by the deploy service and never passed to your app." },
    { title: "Deploy a preview", body: "On the Deploy tab press Deploy preview and open the link once the health check passes." },
    { title: "Go to production", body: "Tick the confirmation and press Deploy production. If the live check fails, traffic switches back automatically." },
    { title: "Roll back if needed", body: "Every version is in History. Roll back to any of them in one click." },
  ] },
  { slug: "automations", title: "Automate a weekly summary email", minutes: 15, level: "Intermediate", summary: "Fetch numbers from your app every Monday and email them to your team.", steps: [
    { title: "Start from a template", body: "On the Automations tab choose Daily summary email and change the schedule to Monday 07:00 UTC." },
    { title: "Point it at your data", body: "Edit the HTTP step's URL to your app's stats endpoint and add its token as a secret used in the header." },
    { title: "Shape the message", body: "Use the transform step to pick the numbers you want, then reference them in the email body." },
    { title: "Test and switch on", body: "Save the draft, press Run now and check the run history. An owner or admin then switches it on." },
  ] },
];

export const CHANGELOG: { date: string; title: string; items: string[] }[] = [
  { date: "20 Nov 2026", title: "Welcome flow, notifications and project organisation", items: ["A short welcome after sign-up: what Keelwork does, how much guidance you want, your workspace and theme, and the features that fit what you're building — every step skippable", "Notification centre: what's waiting on you (approvals, plans to review, incidents) plus finished builds, QA runs and deployments — no pop-ups or emails", "Projects: rename, duplicate with code (secrets are never copied), start a similar project, archive and restore", "Settings: your profile and organization name", "Every empty page explains what goes there and what to do first; icon-only buttons have labels and tooltips; ⌘K search remembers where you went and finds templates"] },
  { date: "20 Nov 2026", title: "Testing & QA Center, and a faster start", items: ["QA Center: Quick, Full, pre-deployment and regression runs against the app in its sandbox, with evidence for every result, issues with priorities, retests, accepted risks, reports (HTML, CSV, JSON) and a release-readiness gate", "Start from the dashboard: describe your idea in one box and Keelwork names the project and opens the planner", "Every project shows where it is — describe, plan, build, preview, test, deploy — from its real state", "What's next: up to three suggestions per project, from what actually needs you to the feature that's useful at this point; no streaks or nudges", "Starter app: lockfile for reproducible installs, ESLint config, security headers, error and not-found pages"] },
  { date: "20 Nov 2026", title: "Complete website templates and the website writer", items: ["17 complete, multi-page website templates — one for every industry — with live demos anyone can open without signing in", "Preview any template page on desktop, tablet or mobile; every template passes automated checks for dead links, SEO, alt text and unsupported claims", "Websites: answer a few questions and Keelwork writes every page, with placeholders for facts only you know", "Website editor: edit any text, regenerate a section, headline and button ideas, AI rewrites, SEO panel, undo/redo and autosave", "Share a read-only link to a draft, or export it as static HTML", "Progress milestones replace the build streak — no streaks, no pressure"] },
  { date: "20 Nov 2026", title: "Templates, a warmer look and a better start", items: ["Nine designed starter templates, each with a preview, pages, features and a ready-to-build brief", "New public pages: features, solutions, tutorials, changelog, status, security and privacy, plus a full footer", "Sunset palette with light and dark themes and a theme switch", "Quick search (⌘K) across pages, sections and projects", "Dashboard: getting started checklist, progress milestones, continue building and daily ideas", "Platform admin: search, filters, support-access overview and a review queue badge"] },
  { date: "20 Nov 2026", title: "Menus, hints and local previews", items: ["Grouped menus with submenus and hints on every page", "“What can I do here?” panels, and Jump to links on project tabs", "Live previews on a single machine (*.localhost), with sandbox network isolation", "Sign-in providers can be hidden where they aren't configured"] },
  { date: "19 Nov 2026", title: "Keelwork 0.1", items: ["Plan-first AI builder with eight specialist agents", "Database Studio, Backend Studio, automations, integrations and encrypted secrets", "Testing, security scanning, incidents and deployments to your own Cloudflare or Vercel", "Billing with credits and spending limits, teams and roles, marketplace and audited support access", "CodeMirror code editor; CI runs lint, strict types, tests and a full build on every change"] },
];

export const FAQ: { q: string; a: string }[] = [
  { q: "Do I need to know how to code?", a: "No. You describe what you want and approve plans in plain language. If you do code, every file is there to read and edit, with history." },
  { q: "Who owns the code?", a: "You do. Export the full source as a ZIP at any time. It's standard Next.js and TypeScript, and the README lists the variables your app needs." },
  { q: "Where does my app run?", a: "In your own Cloudflare or Vercel account, with your own database. Keelwork builds and deploys it; it doesn't host your users' traffic." },
  { q: "How are AI costs charged?", a: "AI calls and web searches are metered at each model's price against your credit balance. You can set a monthly limit, and calls stop before going over." },
  { q: "Can Keelwork staff see my code or data?", a: "Not unless an owner approves a support request. Access is read-only, lasts 1–72 hours, can be ended early, and every step appears in your audit log. Secrets are never readable." },
  { q: "What if the AI gets something wrong?", a: "Every change is tested in a sandbox, risky steps wait for your approval, and you can restore any earlier version of any file or roll back any deployment." },
];

export function featureBySlug(slug: string) { return FEATURES.find((f) => f.slug === slug); }
export function solutionBySlug(slug: string) { return SOLUTIONS.find((s) => s.slug === slug); }
export function tutorialBySlug(slug: string) { return TUTORIALS.find((t) => t.slug === slug); }
