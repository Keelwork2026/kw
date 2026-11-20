import type { Entry, ProjectType } from "./index";

/**
 * Template search that understands how people describe what they want
 * ("I need a website for my restaurant", "a dashboard for my sales team").
 * Filler words are dropped, words are matched by stem and synonyms, and
 * words that name a kind of project ("website", "dashboard", "store")
 * steer results towards that type without hiding the rest.
 */

const STOP = new Set(("i im i'm me my mine we our us you your a an the for to of in on at with and or but is are be been want need needs would like looking build make create get some something " +
  "that this these those can could should please help new just simple nice good great best one which who what where how do does it its from by as about into up so really very kind sort type").split(" "));

/** Groups of words that mean the same thing for template search. The first word is the group's key. */
const SYNONYMS: string[][] = [
  ["restaurant", "restaurants", "food", "eatery", "bistro", "cafe", "café", "diner", "kitchen", "bar", "takeaway", "chop"],
  ["shop", "store", "ecommerce", "e-commerce", "shopping", "boutique", "retail", "sell", "selling", "merch"],
  ["clothing", "clothes", "fashion", "apparel", "wear", "garments", "outfits", "dresses"],
  ["dashboard", "analytics", "metrics", "kpi", "kpis", "reporting", "reports", "insights", "bi", "charts"],
  ["sales", "revenue", "deals", "pipeline", "crm", "leads", "selling"],
  ["team", "staff", "employees", "colleagues", "crew"],
  ["construction", "builder", "builders", "building", "contractor", "contractors", "civil", "engineering", "site"],
  ["student", "students", "learners", "pupils", "learning", "school", "education", "courses", "course", "lms", "tutoring", "academy", "teachers", "classes"],
  ["clinic", "health", "healthcare", "medical", "doctor", "doctors", "hospital", "patients", "patient", "dental"],
  ["bank", "banking", "fintech", "money", "wallet", "payments", "finance", "financial", "savings"],
  ["loan", "loans", "lending", "credit", "borrow", "microfinance"],
  ["property", "properties", "real", "estate", "homes", "houses", "apartments", "realtor", "rent", "rental", "listings"],
  ["hotel", "hotels", "guesthouse", "rooms", "stay", "resort", "lodging", "airbnb"],
  ["booking", "bookings", "book", "reservations", "reservation", "appointments", "appointment", "schedule", "scheduling"],
  ["portfolio", "showcase", "designer", "photographer", "artist", "creative"],
  ["blog", "magazine", "articles", "publication", "newsletter", "writing"],
  ["event", "events", "conference", "summit", "festival", "meetup", "tickets"],
  ["community", "club", "church", "association", "members", "membership", "group"],
  ["charity", "nonprofit", "ngo", "foundation", "donations", "donate"],
  ["project", "projects", "tasks", "task", "kanban", "board", "todo", "workflow", "productivity"],
  ["support", "helpdesk", "tickets", "ticket", "customer service"],
  ["hiring", "recruiting", "recruitment", "jobs", "careers", "candidates", "hr", "applicants"],
  ["marketing", "campaign", "campaigns", "social", "content", "agency", "brand"],
  ["budget", "budgeting", "expenses", "spending", "personal finance"],
  ["company", "business", "corporate", "firm", "consultancy", "consulting", "professional"],
  ["saas", "software", "startup", "product", "tech"],
  ["travel", "tours", "tourism", "trips", "holidays", "holiday"],
  ["landing", "waitlist", "launch"],
  ["personal", "cv", "resume", "freelancer", "myself"],
];
const GROUP = new Map<string, string>();
for (const g of SYNONYMS) for (const w of g) if (!GROUP.has(w)) GROUP.set(w, g[0]!);

/** Words that say what kind of project is wanted. */
const TYPE_WORDS: [RegExp, ProjectType[]][] = [
  [/^(website|site|webpage|homepage|web)$/, ["Website", "Landing page"]],
  [/^(landing|waitlist)$/, ["Landing page"]],
  [/^(dashboard|analytics|reporting|metrics|kpis?)$/, ["Dashboard"]],
  [/^(shop|store|ecommerce|e-commerce)$/, ["Online store"]],
  [/^(portal)$/, ["Portal"]],
  [/^(app|application|platform|system|software|tool)$/, ["Web app", "Portal", "Internal tool", "Dashboard"]],
  [/^(internal|admin|backoffice|back-office)$/, ["Internal tool"]],
];

const stem = (w: string) => w.replace(/(ies)$/, "y").replace(/(ing|es|s)$/, "").replace(/'s$/, "");

function norm(word: string): string {
  const w = word.toLowerCase();
  return GROUP.get(w) ?? GROUP.get(stem(w)) ?? stem(w);
}

function words(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9à-ÿọẹṣ\s-]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
}

export type Parsed = { terms: string[]; types: ProjectType[] };

export function parseQuery(q: string): Parsed {
  const raw = words(q);
  const types = new Set<ProjectType>();
  for (const w of raw) for (const [re, ts] of TYPE_WORDS) if (re.test(w)) ts.forEach((t) => types.add(t));
  const terms = [...new Set(raw.filter((w) => !/^(website|site|webpage|homepage|web|app|application|platform|system|tool)$/.test(w)).map(norm))];
  return { terms, types: [...types] };
}

const FIELDS: [keyof Entry, number][] = [["name", 6], ["keywords", 5], ["industry", 4], ["category", 3], ["tagline", 2], ["features", 1.5], ["parts", 1], ["description", 1]];

function index(e: Entry): [Set<string>, number][] {
  return FIELDS.map(([f, w]) => {
    const v = e[f];
    const text = Array.isArray(v) ? v.join(" ") : String(v ?? "");
    return [new Set(words(text).map(norm)), w];
  });
}
const CACHE = new WeakMap<Entry, [Set<string>, number][]>();

export function score(e: Entry, p: Parsed): number {
  let fields = CACHE.get(e);
  if (!fields) { fields = index(e); CACHE.set(e, fields); }
  let s = 0;
  let matched = 0;
  for (const t of p.terms) {
    let best = 0;
    for (const [set, w] of fields) if (set.has(t)) best = Math.max(best, w);
    if (best) { matched++; s += best; }
  }
  if (p.terms.length && !matched) return 0;
  // Reward matching more of what was asked for: "sales dashboard" beats "dashboard".
  if (p.terms.length > 1) s *= 0.5 + matched / p.terms.length;
  if (p.types.length) s += p.types.includes(e.type) ? 4 : p.terms.length ? 0 : -1;
  return s;
}

/** Entries ranked for a query; with no meaningful words, the list is returned unchanged. */
export function searchCatalog(list: Entry[], q: string): Entry[] {
  const p = parseQuery(q);
  if (!p.terms.length && !p.types.length) return list;
  return list.map((e, i) => ({ e, s: score(e, p), i })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s || a.i - b.i).map((r) => r.e);
}

/** Example searches shown under the search box. */
export const SEARCH_EXAMPLES = ["A website for my restaurant", "Dashboard for my sales team", "Construction company", "Online shop for clothing", "Platform for students", "Patient booking portal"];
