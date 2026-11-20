/**
 * Quick start: turn a one-line idea into a project name so starting takes a
 * single field. The name is only a default — it can be renamed any time.
 */
export const IDEA_KINDS = [
  { key: "website", label: "Website", starter: "A website for " },
  { key: "web-app", label: "Web app", starter: "A web app that " },
  { key: "dashboard", label: "Dashboard", starter: "A dashboard that shows " },
  { key: "ai-tool", label: "AI tool", starter: "An AI tool that " },
  { key: "saas", label: "SaaS", starter: "A SaaS product for " },
] as const;

const LEAD = /^(?:(?:please|pls)\s+)?(?:(?:i\s+(?:want|need|would\s+like)(?:\s+to)?|can\s+you|let'?s|help\s+me)\s+)?(?:(?:build|make|create|design|develop|generate)\s+)?(?:me\s+)?(?:(?:a|an|the|my|our)\s+)?/i;
const SMALL = new Set(["a", "an", "and", "the", "for", "of", "to", "in", "on", "with", "my", "our", "that", "which", "where", "who", "by", "at", "from"]);
const LOWER = new Set(["a", "an", "and", "the", "for", "of", "to", "in", "on", "with", "by", "at", "from"]);

export function nameFromIdea(idea: string, kindLabel?: string): string {
  const text = idea.replace(/\s+/g, " ").trim();
  if (!text) return kindLabel ? `New ${kindLabel.toLowerCase()}` : "New project";
  const rest = text.replace(LEAD, "");
  // Stop at the first clause break, then keep up to five meaningful words.
  const parts = rest.split(/[.,;:!?()\n]| - | — | that | which | where | so | to help /i);
  let clause = parts[0] ?? rest;
  // "A web app that tracks reading goals" — the generic noun says nothing; name it after what it does.
  const generic = /^(?:web ?app|app|application|website|web ?site|site|dashboard|ai tool|tool|saas(?: product| app)?|platform|product|service)$/i.exec(clause.trim());
  if (generic && parts[1]?.trim()) {
    const doing = parts[1].trim().split(" ");
    if (doing.length > 1 && /^(?:[a-z]+s|lets|helps|allows)$/i.test(doing[0]!)) doing.shift();
    clause = doing.filter((w) => !SMALL.has(w.toLowerCase())).length >= 2 ? doing.join(" ") : `${generic[0]} for ${doing.join(" ")}`;
  }
  const words = clause.split(" ").filter(Boolean).slice(0, 6);
  while (words.length > 1 && SMALL.has(words.at(-1)!.toLowerCase())) words.pop();
  const titled = words.map((w, i) => (i > 0 && LOWER.has(w.toLowerCase()) ? w.toLowerCase() : /^[a-z]/.test(w) ? w[0]!.toUpperCase() + w.slice(1) : w)).join(" ");
  const name = titled.replace(/[^\p{L}\p{N}\s&'’+-]/gu, "").trim().slice(0, 60).trim();
  return name.length >= 2 ? name : kindLabel ? `New ${kindLabel.toLowerCase()}` : "New project";
}
