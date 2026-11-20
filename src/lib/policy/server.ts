import "server-only";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { classifyRequest, plannerNote, refusalMessage, type PolicyResult } from "./classify";

export type Screened = {
  result: PolicyResult;
  /** Set when the request is refused (level 4): what to tell the person. */
  refusal: string | null;
  /** Instructions for the planner about declined or unclear features (levels 2–3). */
  note: string;
  eventId: string | null;
};

const normalize = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Screens a project description or chat message against the policy. Most
 * requests pass untouched. Refusals (level 4) and declined features (level 3)
 * are recorded so the person can ask for a review; if staff have overturned
 * a decision for this exact text in this organization, it passes.
 */
export async function screenRequest(text: string, ctx: { orgId: string; userId: string; projectId?: string | null; source: "project_create" | "chat" | "site" | "agent" }): Promise<Screened> {
  const result = classifyRequest(text);
  if (result.level < 2) return { result, refusal: null, note: "", eventId: null };
  const hash = createHash("sha256").update(normalize(text)).digest("hex");
  const db = createServiceClient();
  const { data: cleared } = await db.from("policy_events").select("id").eq("org_id", ctx.orgId).eq("text_hash", hash).eq("status", "overturned").limit(1).maybeSingle();
  if (cleared) return { result: { level: 0, findings: [] }, refusal: null, note: "", eventId: null };

  const refusal = result.level >= 4 ? refusalMessage(result) : null;
  let eventId: string | null = null;
  if (result.level >= 3) {
    const declined = result.findings.filter((f) => f.level >= 3);
    const { data } = await db.from("policy_events").insert({
      org_id: ctx.orgId, project_id: ctx.projectId ?? null, user_id: ctx.userId, source: ctx.source, level: result.level,
      rules: declined.map((f) => f.rule), categories: [...new Set(declined.map((f) => f.category))],
      summary: (refusal ?? `Declined: ${declined.map((f) => f.feature).join("; ")}.`).slice(0, 1000),
      excerpt: text.replace(/\s+/g, " ").trim().slice(0, 300), text_hash: hash,
    }).select("id").single();
    eventId = (data?.id as string | undefined) ?? null;
  }
  return { result, refusal, note: plannerNote(result), eventId };
}

export const REVIEW_HINT = "If this is a mistake, you can ask for a review under Settings → Policy reviews.";
