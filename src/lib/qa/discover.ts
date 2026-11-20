import type { AppType, Category, Journey, Profile, Route } from "./types";

/**
 * Application discovery: reads a project's files and works out what the app
 * is, which pages and endpoints it has, how it authenticates, what it
 * integrates with and which journeys matter. Everything here is inferred from
 * the code; anything that can't be inferred is listed as an unknown for the
 * owner to confirm.
 */
export type SourceFile = { path: string; content: string };

const PAGE_RE = /^(?:src\/)?app\/(.*?)(?:^|\/)?page\.(?:tsx|ts|jsx|js|mdx)$/;
const API_RE = /^(?:src\/)?app\/(.*?)(?:^|\/)?route\.(?:ts|js)$/;
const PAGES_RE = /^(?:src\/)?pages\/(.+)\.(?:tsx|ts|jsx|js)$/;

function appPath(dir: string): { path: string; dynamic: boolean } {
  const parts = dir.split("/").filter(Boolean).filter((p) => !/^\(.*\)$/.test(p) && !p.startsWith("@"));
  const dynamic = parts.some((p) => p.startsWith("["));
  return { path: `/${parts.join("/")}`.replace(/\/+$/, "") || "/", dynamic };
}

export function findRoutes(files: SourceFile[]): Route[] {
  const out: Route[] = [];
  for (const f of files) {
    let m = PAGE_RE.exec(f.path);
    if (m) { const { path, dynamic } = appPath(m[1] ?? ""); out.push({ path, file: f.path, kind: "page", dynamic, auth: authOf(f.content) }); continue; }
    m = API_RE.exec(f.path);
    if (m) {
      const { path, dynamic } = appPath(m[1] ?? "");
      const methods = [...f.content.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map((x) => x[1]!);
      out.push({ path, file: f.path, kind: "api", methods: [...new Set(methods)], dynamic, auth: authOf(f.content) });
      continue;
    }
    m = PAGES_RE.exec(f.path);
    if (m && !/^_(app|document|error)$/.test(m[1]!)) {
      const raw = m[1]!.replace(/\/?index$/, "");
      const isApi = raw.startsWith("api/") || raw === "api";
      const path = `/${raw}`.replace(/\/+$/, "") || "/";
      out.push({ path, file: f.path, kind: isApi ? "api" : "page", dynamic: path.includes("["), auth: authOf(f.content), methods: isApi ? ["GET", "POST"] : undefined });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/** A rough read of whether a route checks who is signed in. */
export function authOf(src: string): Route["auth"] {
  if (/auth\.getUser\(|getServerSession\(|auth\(\)|currentUser\(|requireOrg\(|requireUser\(|getSession\(|redirect\(\s*["'`]\/(sign-?in|login)/.test(src)) return "protected";
  return "unknown";
}

/** Does a concrete path match a route pattern like /products/[id]? */
export function matchRoute(routes: Route[], path: string): Route | undefined {
  const clean = path.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
  return routes.find((r) => {
    if (r.path === clean) return true;
    if (!r.dynamic) return false;
    const re = new RegExp(`^${r.path.replace(/\[\[?\.\.\.[^\]]+\]\]?/g, ".*").replace(/\[[^\]]+\]/g, "[^/]+")}$`);
    return re.test(clean);
  });
}

const INTEGRATIONS: [RegExp, string][] = [
  [/^(stripe|@stripe\/)/, "Stripe payments"], [/^(paystack|react-paystack|@paystack)/, "Paystack payments"], [/^flutterwave/, "Flutterwave payments"], [/^(@paypal|paypal)/, "PayPal payments"],
  [/^(resend|nodemailer|@sendgrid|postmark|mailgun)/, "Email delivery"], [/^twilio/, "SMS (Twilio)"], [/^(@supabase\/)/, "Supabase"], [/^(prisma|@prisma\/)/, "Prisma ORM"],
  [/^(openai|@anthropic-ai|ai$|@ai-sdk)/, "AI model API"], [/^(mapbox|@react-google-maps|leaflet|react-leaflet)/, "Maps"], [/^(@aws-sdk\/client-s3|@vercel\/blob|uploadthing)/, "File storage"],
  [/^(next-auth|@auth\/|@clerk\/)/, "Authentication provider"], [/^(posthog|@vercel\/analytics|plausible)/, "Analytics"], [/^(algoliasearch|meilisearch)/, "Search service"],
];

const TYPE_SIGNALS: [AppType, RegExp][] = [
  ["banking", /\b(transfer|transaction|kyc|loan|wallet|account-?balance|statement|beneficiar|withdraw|deposit|invest)/i],
  ["restaurant", /\b(menu|dish|reservation|table-?booking|delivery|takeaway|restaurant|order-?food)/i],
  ["ecommerce", /\b(cart|checkout|product|shop|basket|order|catalog|sku)/i],
  ["booking", /\b(booking|appointment|availability|reserve|slot|schedule)/i],
  ["education", /\b(course|lesson|quiz|enrol|enroll|student|assessment|curriculum|grade)/i],
  ["healthcare", /\b(patient|clinic|doctor|prescription|symptom|health-?record)/i],
  ["marketplace", /\b(seller|vendor|listing|bid|marketplace)/i],
  ["social", /\b(feed|follow|post|comment|friend|like)/i],
  ["crm", /\b(lead|contact|deal|pipeline|crm)/i],
  ["realestate", /\b(property|listing|viewing|valuation|rent|mortgage)/i],
  ["events", /\b(ticket|speaker|agenda|event)/i],
  ["nonprofit", /\b(donate|donation|volunteer|charity)/i],
  ["saas", /\b(workspace|subscription|billing|team|invite|onboarding|dashboard|plan)/i],
  ["blog", /\b(blog|article|post|author|category)/i],
];

export function classify(routes: Route[], deps: string[], description: string): { type: AppType; reason: string } {
  const pageRoutes = routes.filter((r) => r.kind === "page");
  if (!pageRoutes.length && routes.some((r) => r.kind === "api")) return { type: "api", reason: "The project has API routes but no pages." };
  const corpus = `${routes.map((r) => r.path).join(" ")} ${deps.join(" ")} ${description}`;
  let best: { type: AppType; hits: string[] } = { type: "unknown", hits: [] };
  for (const [type, re] of TYPE_SIGNALS) {
    const hits = [...new Set([...corpus.matchAll(new RegExp(re.source, "gi"))].map((m) => m[0]!.toLowerCase()))];
    if (hits.length > best.hits.length) best = { type, hits };
  }
  if (best.hits.length >= 2 || (best.hits.length === 1 && /\S/.test(description) && new RegExp(TYPE_SIGNALS.find((t) => t[0] === best.type)![1].source, "i").test(description)))
    return { type: best.type, reason: `Found ${best.hits.slice(0, 5).map((h) => `“${h}”`).join(", ")} in the routes, packages or description.` };
  if (pageRoutes.length <= 2) return { type: "landing", reason: "One or two pages with no product-specific routes." };
  return { type: pageRoutes.length > 2 ? "business" : "unknown", reason: "No product-specific routes found; treated as an informational website." };
}

const J = (key: string, name: string, goal: string, steps: [string, RegExp][]): Journey => ({ key, name, goal, steps: steps.map(([label, match]) => ({ label, match })) });

/** The journeys worth checking for each kind of app. Steps match real page paths. */
export function journeysFor(type: AppType): Journey[] {
  const home: [string, RegExp] = ["Home page", /^\/$/];
  const contact: [string, RegExp] = ["Contact", /contact|support|help/];
  const signup: [string, RegExp] = ["Sign up", /sign-?up|register|join|create-account/];
  const signin: [string, RegExp] = ["Sign in", /sign-?in|login|log-in/];
  switch (type) {
    case "ecommerce": return [J("shop", "Find and buy a product", "Buy something", [home, ["Product list", /shop|products?|catalog|collection|store/], ["Product details", /products?\/\[|shop\/\[|item/], ["Cart", /cart|basket|bag/], ["Checkout", /checkout/], ["Order confirmation", /confirm|success|thank|orders?/]]), J("account", "Create an account", "Register", [home, signup])];
    case "restaurant": return [J("order", "Order food", "Place an order", [home, ["Menu", /menu/], ["Cart", /cart|basket|order/], ["Checkout", /checkout|pay/], ["Confirmation", /confirm|success|thank|track/]]), J("book", "Book a table", "Reserve a table", [home, ["Booking", /book|reserv|table/]])];
    case "banking": return [J("onboard", "Open an account", "Register and verify identity", [home, signup, ["Verification", /verify|kyc|identity/], ["Account", /account|dashboard|wallet/]]), J("transfer", "Send money", "Make a transfer", [signin, ["Account", /account|dashboard|wallet/], ["Transfer", /transfer|send|pay/], ["Confirmation", /confirm|success|receipt/], ["History", /history|transactions|statement/]])];
    case "booking": return [J("book", "Make a booking", "Book a time", [home, ["Availability", /availab|book|schedule|slots?/], ["Details", /details|book|checkout/], ["Confirmation", /confirm|success|thank/]]), J("manage", "Change a booking", "Cancel or reschedule", [signin, ["My bookings", /bookings|appointments|account/]])];
    case "education": return [J("learn", "Start learning", "Enrol and open a lesson", [home, ["Courses", /courses?|catalog/], ["Course details", /courses?\/\[/], ["Enrol", /enrol|enroll|apply|checkout|sign-?up/], ["Lesson", /lesson|learn|module/]]), J("assess", "Take an assessment", "Submit and see results", [signin, ["Assessment", /quiz|test|assessment|exam/], ["Results", /result|grade|progress/]])];
    case "healthcare": return [J("appointment", "Book an appointment", "Request care", [home, ["Services", /services|treatments/], ["Appointment", /appoint|book/]])];
    case "saas": return [J("onboard", "Get started", "Sign up and reach the first useful screen", [home, ["Pricing", /pricing|plans/], signup, ["Dashboard", /dashboard|app|workspace|projects?/]]), J("collab", "Invite a teammate", "Add someone to the workspace", [signin, ["Team settings", /team|members|invite|settings/]])];
    case "marketplace": return [J("buy", "Find and buy", "Purchase from a seller", [home, ["Listings", /listings?|browse|search/], ["Listing details", /listings?\/\[|items?\/\[/], ["Checkout", /checkout|buy|order/]]), J("sell", "Start selling", "Create a listing", [signup, ["New listing", /new|create|sell/]])];
    case "api": return [];
    case "realestate": return [J("find", "Find a property", "Request a viewing", [home, ["Listings", /propert|listings?|homes/], ["Property details", /propert(y|ies)\/|listings?\//], ["Viewing request", /view|book|contact/]])];
    case "events": return [J("attend", "Attend the event", "Get a ticket", [home, ["Schedule", /schedule|agenda|programme/], ["Tickets", /tickets?|register/]])];
    case "nonprofit": return [J("give", "Make a donation", "Donate", [home, ["Donate", /donat|give/]]), J("help", "Volunteer", "Sign up to help", [home, ["Volunteer", /volunteer|get-involved/]])];
    default: return [J("contact", "Get in touch", "Contact the business", [home, ["About or services", /about|services|work|what-we-do/], contact])];
  }
}

const PRIORITIES: Partial<Record<AppType, Category[]>> = {
  banking: ["security", "logic", "functional", "api", "database", "accessibility", "errors"],
  ecommerce: ["functional", "journeys", "security", "performance", "logic", "responsive"],
  restaurant: ["functional", "journeys", "responsive", "performance", "logic"],
  saas: ["functional", "security", "api", "journeys", "ux", "performance"],
  education: ["accessibility", "journeys", "responsive", "functional", "ux"],
  healthcare: ["security", "accessibility", "functional", "ux", "errors"],
  api: ["api", "security", "performance", "load", "errors"],
  landing: ["performance", "accessibility", "content", "ux", "responsive"],
  business: ["accessibility", "performance", "content", "ux", "responsive", "functional"],
};

const UNKNOWN_RULES: Partial<Record<AppType, string[]>> = {
  ecommerce: ["How tax is calculated and shown", "Delivery charges and free-delivery threshold", "Discount stacking rules", "What happens to stock when an order is cancelled"],
  restaurant: ["Minimum order and delivery fee rules", "Opening hours that limit ordering", "How allergens must be shown"],
  banking: ["Daily and per-transaction transfer limits", "Rounding and currency precision rules", "When a transfer can be reversed", "KYC levels and what each allows"],
  booking: ["How far ahead bookings can be made", "Cancellation and refund window", "Double-booking rules"],
  education: ["Pass marks and grading rules", "Whether lessons unlock in order"],
  saas: ["Plan limits and what happens when they're reached", "Who can invite and remove members"],
  marketplace: ["Commission and fee rules", "Refund and dispute rules"],
};

export function discover(files: SourceFile[], opts: { backend?: string | null; description?: string } = {}): Profile {
  const routes = findRoutes(files);
  const pkg = files.find((f) => f.path === "package.json");
  let deps: string[] = [];
  try { const j = JSON.parse(pkg?.content ?? "{}") as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }; deps = [...Object.keys(j.dependencies ?? {}), ...Object.keys(j.devDependencies ?? {})]; } catch { /* unreadable package.json */ }
  const framework = deps.includes("next") ? "Next.js" : deps.includes("vite") ? "Vite" : deps.includes("express") ? "Express" : deps.includes("react") ? "React" : "Unknown";
  const code = files.filter((f) => /\.(tsx|jsx|ts|js|html|vue|svelte)$/.test(f.path) && !/node_modules|\.next\//.test(f.path));
  const components = code.filter((f) => /\/components?\//.test(f.path)).length;
  const forms = code.flatMap((f) => {
    const count = (f.content.match(/<form\b/g) ?? []).length;
    if (!count) return [];
    return [{ file: f.path, fields: (f.content.match(/<(input|select|textarea)\b/g) ?? []).length, hasSubmit: /onSubmit=|action=|type=["']submit["']/.test(f.content) }];
  });
  const integrations = [...new Set(deps.flatMap((d) => INTEGRATIONS.filter(([re]) => re.test(d)).map(([, label]) => label)))];
  const tables = [...new Set(files.filter((f) => f.path.endsWith(".sql")).flatMap((f) => [...f.content.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?/gi)].map((m) => m[1]!)))];
  const all = code.map((f) => f.content).join("\n");
  const authProvider = deps.some((d) => d.startsWith("@supabase/")) && /auth\.(signIn|signUp|getUser)/.test(all) ? "Supabase Auth" : deps.includes("next-auth") ? "NextAuth" : deps.some((d) => d.startsWith("@clerk/")) ? "Clerk" : /sign-?in|login/i.test(routes.map((r) => r.path).join(" ")) ? "Custom" : null;
  const roles = [...new Set([...all.matchAll(/role\s*(?:===?|==)\s*["'`](\w{3,20})["'`]/g)].map((m) => m[1]!))].slice(0, 10);
  const payments = integrations.some((i) => /payments/.test(i)) || /checkout|payment/i.test(routes.map((r) => r.path).join(" "));
  const uploads = /type=["']file["']|\.upload\(/.test(all);
  const { type, reason } = classify(routes, deps, opts.description ?? "");
  const highRisk = [
    ...(payments ? ["Payments and checkout"] : []),
    ...(authProvider ? ["Sign-in and account access"] : []),
    ...(uploads ? ["File uploads"] : []),
    ...(roles.length ? [`Role-based access (${roles.join(", ")})`] : []),
    ...(type === "banking" ? ["Money movement and balances"] : []),
    ...(type === "healthcare" ? ["Health information"] : []),
    ...(routes.some((r) => r.kind === "api" && r.methods?.some((m) => m !== "GET")) ? ["Endpoints that change data"] : []),
  ];
  return {
    appType: type, appTypeReason: reason, framework, backend: opts.backend ?? null, routes, components, forms, integrations,
    dependencies: deps.length, tables, auth: { present: authProvider !== null, provider: authProvider, roles }, payments, uploads, highRisk,
    journeys: journeysFor(type), priorities: PRIORITIES[type] ?? ["functional", "accessibility", "performance", "security", "ux"],
    unknowns: UNKNOWN_RULES[type] ?? [],
  };
}

/** Profile as JSON for storage (regexes become their source text). */
export function profileJson(p: Profile): unknown {
  return { ...p, journeys: p.journeys.map((j) => ({ ...j, steps: j.steps.map((s) => ({ label: s.label, match: s.match instanceof RegExp ? s.match.source : s.match })) })) };
}
