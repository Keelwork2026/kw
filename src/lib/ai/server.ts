import "server-only";
import { createGateway } from "./gateway";
import { loadCatalog, type Catalog } from "./catalog";
import { createServiceClient } from "@/lib/supabase/server";

let cached: { raw: string | undefined; catalog: Catalog | null; error: string | null } | null = null;

/** The catalogue, or null with a reason when AI isn't configured or the JSON is invalid. */
export function serverCatalog(): { catalog: Catalog | null; error: string | null } {
  const raw = process.env.AI_MODEL_CATALOG;
  if (cached && cached.raw === raw) return cached;
  try {
    cached = { raw, catalog: loadCatalog(), error: null };
  } catch (e) {
    cached = { raw, catalog: null, error: (e as Error).message };
  }
  return cached;
}

/**
 * A gateway bound to one organization (and optionally a project and user).
 * Spend is checked with assert_can_spend; usage is written to usage_events,
 * whose trigger debits the credit ledger.
 */
export function gatewayFor(ctx: { orgId: string; projectId?: string; userId?: string }) {
  const { catalog } = serverCatalog();
  const db = createServiceClient();
  return createGateway({
    catalog,
    env: process.env,
    assertCanSpend: async (estimate) => {
      const { error } = await db.rpc("assert_can_spend", { p_org: ctx.orgId, p_estimate_micros: estimate });
      if (error) throw new Error(/limit/.test(error.message) ? "Your organization's monthly spending limit is reached." : "Your organization is out of credits. Add credits on the Billing page.");
    },
    meter: async (u) => {
      const { error } = await db.from("usage_events").insert({
        org_id: ctx.orgId, project_id: ctx.projectId ?? null, user_id: ctx.userId ?? null,
        kind: "ai", route: u.route, model: u.model, input_tokens: u.inputTokens, output_tokens: u.outputTokens, cost_micros: u.costMicros,
      });
      if (error) throw new Error("Couldn't record AI usage; the result was discarded.");
    },
  });
}
