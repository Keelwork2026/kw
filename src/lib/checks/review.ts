import { createHash } from "node:crypto";
import type { Schema } from "@/lib/db/schema";
import type { RouteReport } from "@/lib/backend/routes";

export type ReviewFinding = { rule: string; severity: "critical" | "high" | "medium" | "low" | "info"; title: string; location: string; hint: string; fingerprint: string };
const fp = (...parts: string[]) => createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);

export function reviewDatabase(schema: Schema): ReviewFinding[] {
  const out: ReviewFinding[] = [];
  for (const t of schema.tables) {
    if (!t.rls) { out.push({ rule: "table-without-rls", severity: "high", title: `Table ${t.name} has row-level security off`, location: `table ${t.name}`, hint: `alter table public.${t.name} enable row level security; then add policies.`, fingerprint: fp("rls", t.name) }); continue; }
    if (t.policies.length === 0) out.push({ rule: "rls-without-policies", severity: "info", title: `Table ${t.name} has no policies`, location: `table ${t.name}`, hint: "Nobody can use this table from the browser until a policy allows it.", fingerprint: fp("nopol", t.name) });
    for (const p of t.policies) {
      const always = (e: string | null) => e !== null && /^\s*\(?\s*true\s*\)?\s*$/i.test(e);
      const toEveryone = /\b(public|anon)\b/.test(p.roles);
      if ((always(p.using) || always(p.check)) && p.command !== "select") {
        out.push({ rule: "permissive-write-policy", severity: toEveryone ? "critical" : "high", title: `Policy "${p.name}" lets ${toEveryone ? "anyone" : "any signed-in user"} ${p.command === "all" ? "change" : p.command} every row of ${t.name}`, location: `table ${t.name}`, hint: "Restrict it to the row's owner, e.g. using (auth.uid() = user_id).", fingerprint: fp("permw", t.name, p.name) });
      } else if (always(p.using) && toEveryone) {
        out.push({ rule: "public-read-policy", severity: "medium", title: `Policy "${p.name}" makes every row of ${t.name} public`, location: `table ${t.name}`, hint: "Fine for public content; otherwise restrict it.", fingerprint: fp("permr", t.name, p.name) });
      }
    }
  }
  return out;
}

export function reviewRoutes(reports: RouteReport[]): ReviewFinding[] {
  const out: ReviewFinding[] = [];
  for (const r of reports) {
    const where = r.path ? `${r.path} (${r.file})` : r.file;
    if (r.serviceRole && r.clientReachable) out.push({ rule: "service-role-in-client", severity: "critical", title: "Service-role credentials in client code", location: where, hint: "Move this to a server action or route handler.", fingerprint: fp("svc", r.file) });
    for (const issue of r.issues) {
      if (/caller/.test(issue)) out.push({ rule: "route-no-auth", severity: r.methods.some((m) => m !== "GET") || r.kind === "action" ? "high" : "medium", title: `${r.kind === "route" ? "Route" : "Server action"} doesn't check the caller`, location: where, hint: "Check the signed-in user (or a signature) before doing anything.", fingerprint: fp("auth", r.file) });
      if (/validate/.test(issue)) out.push({ rule: "route-no-validation", severity: "medium", title: `${r.kind === "route" ? "Route" : "Server action"} doesn't validate input`, location: where, hint: "Validate the body with a schema before using it.", fingerprint: fp("val", r.file) });
      if (/NEXT_PUBLIC_/.test(issue)) out.push({ rule: "secret-in-public-env", severity: "critical", title: "A secret is exposed through a NEXT_PUBLIC_ variable", location: where, hint: "Rename it without NEXT_PUBLIC_ and read it only on the server.", fingerprint: fp("pub", r.file) });
    }
  }
  return out;
}

/**
 * Reconciles a scan with stored findings: new fingerprints open, missing
 * open ones resolve, returning resolved ones reopen. Accepted findings stay
 * accepted — a rescan never reopens a risk a person accepted.
 */
export function reconcile(existing: { fingerprint: string; status: "open" | "resolved" | "accepted" }[], found: { fingerprint: string }[]): { insert: string[]; resolve: string[]; reopen: string[]; touch: string[] } {
  const now = new Set(found.map((f) => f.fingerprint));
  const byFp = new Map(existing.map((e) => [e.fingerprint, e.status]));
  const insert = [...now].filter((f) => !byFp.has(f));
  const resolve = existing.filter((e) => e.status === "open" && !now.has(e.fingerprint)).map((e) => e.fingerprint);
  const reopen = existing.filter((e) => e.status === "resolved" && now.has(e.fingerprint)).map((e) => e.fingerprint);
  const touch = existing.filter((e) => now.has(e.fingerprint)).map((e) => e.fingerprint);
  return { insert, resolve, reopen, touch };
}
