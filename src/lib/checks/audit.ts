export type Advisory = { id: string; module: string; severity: "critical" | "high" | "moderate" | "low" | "info"; title: string; url: string | null; fixAvailable: boolean };
export type AuditResult = { advisories: Advisory[]; counts: Record<Advisory["severity"], number> };

const SEV = new Set(["critical", "high", "moderate", "low", "info"]);
const sev = (s: unknown): Advisory["severity"] => (SEV.has(String(s)) ? (String(s) as Advisory["severity"]) : "info");

/** Parses `pnpm audit --json` and `npm audit --json` (v6 advisories or v7+ vulnerabilities). */
export function parseAudit(raw: string): AuditResult | null {
  let data: Record<string, unknown>;
  try { data = JSON.parse(raw.slice(raw.indexOf("{"))); } catch { return null; }
  const advisories: Advisory[] = [];
  if (data.advisories && typeof data.advisories === "object") {
    for (const [id, a] of Object.entries(data.advisories as Record<string, Record<string, unknown>>)) {
      advisories.push({ id: String(a.github_advisory_id ?? id), module: String(a.module_name ?? "?"), severity: sev(a.severity), title: String(a.title ?? "Advisory"), url: typeof a.url === "string" ? a.url : null, fixAvailable: Boolean(a.patched_versions && a.patched_versions !== "<0.0.0") });
    }
  } else if (data.vulnerabilities && typeof data.vulnerabilities === "object") {
    for (const [name, v] of Object.entries(data.vulnerabilities as Record<string, Record<string, unknown>>)) {
      const via = Array.isArray(v.via) ? v.via.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null) : [];
      if (via.length === 0) continue; // only transitive: reported under the root advisory
      for (const a of via) advisories.push({ id: String(a.source ?? a.url ?? name), module: name, severity: sev(a.severity ?? v.severity), title: String(a.title ?? "Advisory"), url: typeof a.url === "string" ? a.url : null, fixAvailable: Boolean(v.fixAvailable) });
    }
  } else {
    return null;
  }
  const counts = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };
  for (const a of advisories) counts[a.severity]++;
  return { advisories, counts };
}
