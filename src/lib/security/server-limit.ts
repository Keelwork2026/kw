import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { LIMITS, bucketKey, type Scope } from "./rate-limit";

/**
 * Applies a rate limit through take_tokens. Returns a message to show when
 * the caller is limited, or null. If the database isn't reachable the
 * request is refused for sign-in (fail closed) and allowed elsewhere.
 */
export async function limitOrMessage(scope: Scope, identity: string): Promise<string | null> {
  const r = await takeToken(scope, identity);
  if (r.allowed) return null;
  const wait = r.retryAfterSeconds;
  return `Too many attempts. Try again in ${wait >= 60 ? `${Math.ceil(wait / 60)} minute${wait >= 120 ? "s" : ""}` : `${wait} seconds`}.`;
}

export async function takeToken(scope: Scope, identity: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const limit = LIMITS[scope];
  try {
    const db = createServiceClient();
    const { data, error } = await db.rpc("take_tokens", { p_key: bucketKey(scope, identity), p_capacity: limit.capacity, p_refill_per_second: limit.refillPerSecond, p_cost: 1 });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as { allowed: boolean; retry_after_seconds: number };
    return { allowed: row.allowed, retryAfterSeconds: row.retry_after_seconds };
  } catch {
    return scope === "signIn" ? { allowed: false, retryAfterSeconds: 30 } : { allowed: true, retryAfterSeconds: 0 };
  }
}
