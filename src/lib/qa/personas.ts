import type { Result } from "./types";
import { mk, hashHex, type PageSnap } from "./analyze";
import { internalPaths, parse } from "./html";

/**
 * AI persona testing. A model plays a defined person trying to reach a goal,
 * but it may only move along links that really exist on the crawled pages.
 * Its answer is checked against that link graph: an invented page or an
 * impossible jump fails the walk. Every result is labelled as simulated.
 */
export type Persona = { name: string; description: string; goal: string };

export const DEFAULT_PERSONAS: Persona[] = [
  { name: "First-time visitor", description: "Has never seen the app, arrives on the home page, reads quickly and doesn't know the product's terms.", goal: "Understand what this is and take the main action" },
  { name: "Mobile-first, impatient", description: "Uses a phone on a slow connection, scans headings, gives up after a few confusing steps.", goal: "Contact the business or start the main task in as few steps as possible" },
  { name: "Low digital confidence", description: "Older, careful, unsure about forms, needs plain words and reassurance about what happens next.", goal: "Find how to get help or speak to someone" },
];

export type SiteMap = { path: string; title: string; h1: string; links: { to: string; text: string }[]; forms: number; status: number | null }[];

export function siteMap(pages: PageSnap[], max = 30): SiteMap {
  return pages.filter((p) => p.html && (p.status ?? 0) < 400).slice(0, max).map((p) => {
    const d = parse(p.html);
    const texts = new Map(d.links.map((l) => [l.href, l.text]));
    return { path: p.path, title: d.title.slice(0, 80), h1: (d.headings.find((h) => h.level === 1)?.text ?? "").slice(0, 100), forms: d.forms.length, status: p.status,
      links: internalPaths(d, p.url).slice(0, 40).map((to) => ({ to, text: (texts.get(to) ?? [...texts.entries()].find(([h]) => h.endsWith(to))?.[1] ?? "").slice(0, 40) })) };
  });
}

export function personaPrompt(persona: Persona, map: SiteMap, appName: string): { system: string; user: string } {
  return {
    system: "You simulate one specific person using a website, for usability testing. You can only move by following links listed for the page you are on. Do not invent pages. Be honest about confusion. Reply with JSON only.",
    user: `App: ${appName}\nPerson: ${persona.name} — ${persona.description}\nGoal: ${persona.goal}\n\nPages (path, title, main heading, number of forms, links you can follow):\n${map.map((p) => `${p.path} | ${p.title} | ${p.h1} | forms:${p.forms} | links: ${p.links.map((l) => `${l.to} "${l.text}"`).join(", ")}`).join("\n")}\n\nStart at "/". Reply as JSON: {"path": ["/", "..."], "completed": true|false, "confusion": ["where and why you hesitated"], "friction": ["specific obstacles"], "summary": "one or two sentences in the person's voice"}`,
  };
}

export type Walk = { path: string[]; completed: boolean; confusion: string[]; friction: string[]; summary: string };

export function parseWalk(text: string): Walk | null {
  try {
    const raw = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Partial<Walk>;
    if (!Array.isArray(raw.path)) return null;
    const strs = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string").slice(0, 10).map((s) => s.slice(0, 300)) : []);
    return { path: strs(raw.path).slice(0, 15), completed: raw.completed === true, confusion: strs(raw.confusion), friction: strs(raw.friction), summary: typeof raw.summary === "string" ? raw.summary.slice(0, 500) : "" };
  } catch { return null; }
}

/** Check the walk against real links; an impossible step makes it invalid. */
export function evaluateWalk(persona: Persona, walk: Walk | null, map: SiteMap): Result {
  const key = `persona:${hashHex(persona.name + persona.goal)}`;
  const base = { key, name: `Persona: ${persona.name}`, category: "personas" as const, method: "simulated" as const, objective: persona.goal, expected: "Reaches the goal along real links" };
  if (!walk) return mk({ ...base, actual: "The AI's answer couldn't be read, so this walk wasn't scored.", status: "blocked", severity: "info" });
  const byPath = new Map(map.map((p) => [p.path, p]));
  let invalid = "";
  for (let i = 0; i < walk.path.length; i++) {
    const step = walk.path[i]!.split("?")[0]!;
    if (i === 0 && step !== "/") { invalid = "didn't start at the home page"; break; }
    if (i > 0) { const prev = byPath.get(walk.path[i - 1]!.split("?")[0]!); if (!prev?.links.some((l) => l.to.split("?")[0] === step)) { invalid = `jumped to ${step}, which isn't linked from ${walk.path[i - 1]}`; break; } }
  }
  const steps = walk.path.map((p, i) => `${i + 1}. ${p}${byPath.get(p)?.h1 ? ` — ${byPath.get(p)!.h1}` : ""}`);
  if (invalid) return mk({ ...base, steps, actual: `The simulated walk wasn't valid (${invalid}), so it isn't counted.`, status: "blocked", severity: "info" });
  const ok = walk.completed && walk.friction.length === 0;
  return mk({ ...base, steps: [...steps, ...walk.confusion.map((c) => `Hesitated: ${c}`)], actual: `${walk.completed ? "Reached the goal" : "Gave up"} in ${walk.path.length} step(s). “${walk.summary}”`, status: ok ? "passed" : "failed", severity: walk.completed ? "low" : "medium", target: walk.path.at(-1),
    evidence: [{ kind: "log", text: `AI-SIMULATED USER TESTING — NOT REAL HUMAN RESEARCH\nPersona: ${persona.name} (${persona.description})\nPath: ${walk.path.join(" → ")}\nFriction: ${walk.friction.join("; ") || "none"}` }],
    finding: { rule: "persona-friction", severity: walk.completed ? "low" : "medium", confidence: "potential", title: `${persona.name}: ${walk.completed ? "friction" : "couldn't reach the goal"}`, description: `AI-simulated (not real research): ${persona.name} trying to “${persona.goal}” ${walk.completed ? "got there but hit friction" : "gave up"}. ${walk.friction.join("; ")}`, impact: "Real people with similar needs may struggle in the same places.", recommendation: walk.friction.length ? `Look at: ${walk.friction.slice(0, 3).join("; ")}.` : "Make the path to this goal more obvious from the home page.", verify: "Run the persona again, and test with real people before relying on it." } });
}
