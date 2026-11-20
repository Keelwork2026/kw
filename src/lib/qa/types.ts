/**
 * Shared data model for Keelwork's Quality Assurance engine. Every module
 * (discovery, functional, security, UX, performance, accessibility,
 * responsive, regression) produces the same result and issue shapes, so
 * scoring, issues, history, reports and release readiness treat them alike.
 */

export const CATEGORIES = [
  "functional", "logic", "browser", "api", "database", "security", "pentest", "ux", "journeys", "personas",
  "performance", "load", "accessibility", "responsive", "crossbrowser", "regression", "integration", "errors", "content", "build",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** How a result was obtained. Shown on every result so nothing simulated passes as real. */
export const METHODS = ["automated", "browser", "static", "ai", "simulated", "human", "monitoring"] as const;
export type Method = (typeof METHODS)[number];
export const METHOD_LABEL: Record<Method, string> = {
  automated: "Automated test (executed)",
  browser: "Browser-executed",
  static: "Static code analysis",
  ai: "AI-assisted analysis",
  simulated: "AI-simulated user testing — not real human research",
  human: "Human testing",
  monitoring: "Production monitoring",
};

export const STATUSES = ["passed", "failed", "blocked", "skipped", "not_run", "in_progress"] as const;
export type Status = (typeof STATUSES)[number];

export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CONFIDENCE = ["confirmed", "probable", "potential", "informational", "needs_manual"] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export const ISSUE_STATUSES = ["new", "confirmed", "in_progress", "awaiting_review", "fixed", "awaiting_retest", "verified", "rejected", "false_positive", "accepted_risk", "reopened"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];
/** Statuses that mean the problem may still be present. */
export const OPEN_ISSUE: IssueStatus[] = ["new", "confirmed", "in_progress", "awaiting_review", "fixed", "awaiting_retest", "reopened"];

export type Priority = "P0" | "P1" | "P2" | "P3" | "P4";

export type Evidence =
  | { kind: "code"; file: string; line?: number; snippet?: string }
  | { kind: "http"; method: string; url: string; status: number | null; ms?: number; headers?: Record<string, string>; body?: string }
  | { kind: "measure"; name: string; value: number | null; unit: string; note?: string }
  | { kind: "log"; text: string }
  | { kind: "screenshot"; viewport: string; page: string; dataUrl?: string; note?: string }
  | { kind: "html"; page: string; selector?: string; snippet: string };

/** One executed (or explicitly not executed) test. */
export type Result = {
  key: string; // stable across runs: used for regression comparison
  name: string;
  category: Category;
  method: Method;
  objective: string;
  steps: string[];
  expected: string;
  actual: string;
  status: Status;
  severity: Severity;
  target?: string; // page, component or endpoint
  evidence: Evidence[];
  durationMs?: number;
  /** When set, a failed/blocked result raises or updates this issue. */
  issue?: Finding;
};

/** A problem the engine found, before it becomes a tracked issue. */
export type Finding = {
  fingerprint: string; // stable identity (category + rule + target)
  title: string;
  category: Category;
  rule: string;
  severity: Severity;
  confidence: Confidence;
  description: string;
  impact: string;
  recommendation: string;
  verify: string;
  target?: string;
  wcag?: string;
  evidence: Evidence[];
};

export type AppType =
  | "ecommerce" | "restaurant" | "banking" | "saas" | "booking" | "education" | "healthcare" | "marketplace"
  | "social" | "dashboard" | "crm" | "portal" | "api" | "landing" | "business" | "blog" | "nonprofit" | "realestate" | "events" | "unknown";

export type Route = { path: string; file: string; kind: "page" | "api"; methods?: string[]; dynamic: boolean; auth?: "protected" | "public" | "unknown" };

export type Profile = {
  appType: AppType;
  appTypeReason: string;
  framework: string;
  backend: string | null;
  routes: Route[];
  components: number;
  forms: { file: string; fields: number; hasSubmit: boolean }[];
  integrations: string[];
  dependencies: number;
  tables: string[];
  auth: { present: boolean; provider: string | null; roles: string[] };
  payments: boolean;
  uploads: boolean;
  highRisk: string[];
  journeys: Journey[];
  priorities: Category[];
  unknowns: string[]; // business rules or facts that need the owner's confirmation
};

export type Journey = {
  key: string;
  name: string;
  goal: string;
  steps: { label: string; match: RegExp | string; page?: string }[];
};

export type Mode = "quick" | "full" | "predeploy" | "custom" | "regression";

export type Scope = { categories?: Category[]; pages?: string[]; endpoints?: string[]; changedOnly?: boolean; issueId?: string };

export type Score = { category: Category | "overall"; value: number | null; basis: "verified" | "estimated" | "incomplete" | "unavailable"; executed: number; total: number; explain: string };

export const RELEASE_STATUSES = ["not_tested", "in_progress", "failed", "critical", "needs_review", "conditional", "ready", "approved"] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];
export const RELEASE_LABEL: Record<ReleaseStatus, string> = {
  not_tested: "Not tested", in_progress: "Testing in progress", failed: "Failed", critical: "Critical issues found",
  needs_review: "Needs review", conditional: "Conditional pass", ready: "Ready for deployment", approved: "Approved for release",
};

export type Settings = {
  weights: Partial<Record<Category, number>>;
  gate: {
    blockingSeverities: Severity[];
    minOverall: number;
    requiredCategories: Category[];
    requireManualReview: boolean;
    enforceOnDeploy: boolean;
  };
  excludedRoutes: string[];
  excludedEndpoints: string[];
  viewports: number[];
  maxPages: number;
  load: { enabled: boolean; concurrency: number; seconds: number };
  activeSecurity: boolean; // safe active probes in the sandbox
  pentestAuthorized: { by: string; at: string; scope: string } | null;
  autoAfterBuild: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  weights: {},
  gate: { blockingSeverities: ["critical"], minOverall: 70, requiredCategories: ["functional", "security", "accessibility"], requireManualReview: false, enforceOnDeploy: false },
  excludedRoutes: [],
  excludedEndpoints: [],
  viewports: [360, 768, 1280],
  maxPages: 40,
  load: { enabled: false, concurrency: 10, seconds: 20 },
  activeSecurity: true,
  pentestAuthorized: null,
  autoAfterBuild: false,
};

/** Merge stored settings over the defaults, clamping anything unsafe. */
export function normalizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Settings>;
  const g = (r.gate ?? {}) as Partial<Settings["gate"]>;
  const l = (r.load ?? {}) as Partial<Settings["load"]>;
  const sev = (xs: unknown) => (Array.isArray(xs) ? xs.filter((x): x is Severity => SEVERITIES.includes(x as Severity)) : null);
  const cats = (xs: unknown) => (Array.isArray(xs) ? xs.filter((x): x is Category => CATEGORIES.includes(x as Category)) : null);
  const strs = (xs: unknown, max: number) => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string" && x.length <= 200).slice(0, max) : []);
  const weights: Partial<Record<Category, number>> = {};
  for (const [k, v] of Object.entries(r.weights ?? {})) if (CATEGORIES.includes(k as Category) && typeof v === "number" && v >= 0 && v <= 100) weights[k as Category] = v;
  return {
    weights,
    gate: {
      blockingSeverities: sev(g.blockingSeverities) ?? DEFAULT_SETTINGS.gate.blockingSeverities,
      minOverall: typeof g.minOverall === "number" ? Math.max(0, Math.min(100, Math.round(g.minOverall))) : DEFAULT_SETTINGS.gate.minOverall,
      requiredCategories: cats(g.requiredCategories) ?? DEFAULT_SETTINGS.gate.requiredCategories,
      requireManualReview: g.requireManualReview === true,
      enforceOnDeploy: g.enforceOnDeploy === true,
    },
    excludedRoutes: strs(r.excludedRoutes, 100),
    excludedEndpoints: strs(r.excludedEndpoints, 100),
    viewports: Array.isArray(r.viewports) ? r.viewports.filter((v): v is number => typeof v === "number" && v >= 280 && v <= 2560).slice(0, 7) : DEFAULT_SETTINGS.viewports,
    maxPages: typeof r.maxPages === "number" ? Math.max(1, Math.min(150, Math.round(r.maxPages))) : DEFAULT_SETTINGS.maxPages,
    // Load tests only ever target the project's own sandbox; hard caps keep them small.
    load: { enabled: l.enabled === true, concurrency: Math.max(1, Math.min(50, Math.round(Number(l.concurrency) || 10))), seconds: Math.max(5, Math.min(120, Math.round(Number(l.seconds) || 20))) },
    activeSecurity: r.activeSecurity !== false,
    pentestAuthorized: r.pentestAuthorized && typeof r.pentestAuthorized === "object" && typeof (r.pentestAuthorized as { by?: unknown }).by === "string" ? r.pentestAuthorized : null,
    autoAfterBuild: r.autoAfterBuild === true,
  };
}

export const CATEGORY_INFO: Record<Category, { label: string; about: string }> = {
  functional: { label: "Functional", about: "Pages load, links go somewhere real, forms and buttons are wired up." },
  logic: { label: "Business logic", about: "Calculations, money handling, states and rules. Unclear rules are flagged for you to confirm, never assumed." },
  browser: { label: "Browser interaction", about: "A real headless browser opens pages, checks for errors and interacts with them." },
  api: { label: "API", about: "Every endpoint is called: status codes, validation of bad input, response times and access control." },
  database: { label: "Database", about: "Schema, constraints, row-level security and migration safety, from the project's migrations." },
  security: { label: "Security", about: "Secrets, dependency vulnerabilities, code review rules, security headers and safe probes of your own sandbox." },
  pentest: { label: "Penetration testing", about: "Deeper authorised probes, only against your own sandbox, only after you confirm scope." },
  ux: { label: "UX", about: "Clarity, navigation, forms, trust, error recovery and friction, from what each page actually contains." },
  journeys: { label: "User journeys", about: "The main paths a person takes through your app, checked step by step against real pages and links." },
  personas: { label: "AI personas", about: "AI-simulated users try to reach a goal through your real pages. Not real human research." },
  performance: { label: "Performance", about: "Server response time, page weight and script size, measured against the running app." },
  load: { label: "Load & stress", about: "Controlled concurrent traffic against your own sandbox: latency percentiles and error rates." },
  accessibility: { label: "Accessibility", about: "Automated WCAG 2.2 checks with manual-review flags where tools can't decide." },
  responsive: { label: "Responsive", about: "Pages at phone, tablet and desktop widths: overflow, tap targets and viewport setup." },
  crossbrowser: { label: "Cross-browser", about: "Which browser engines were actually used, and which weren't." },
  regression: { label: "Regression", about: "What changed since the last run: new failures, fixes and reopened issues." },
  integration: { label: "Integrations", about: "Payment, email and other services: configured, sandboxed and handled safely." },
  errors: { label: "Error handling", about: "What happens on bad input, missing pages and failures: clear, safe and recoverable." },
  content: { label: "Content", about: "Placeholder text, lorem ipsum, broken copy and text that doesn't match the feature." },
  build: { label: "Build & tests", about: "The project's own test suite, type check, lint and production build." },
};
