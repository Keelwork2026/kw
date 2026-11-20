import { createHash } from "node:crypto";

/** Token-bucket limits. The math lives here; the state lives in Postgres (take_tokens). */
export const LIMITS = {
  signIn: { capacity: 10, refillPerSecond: 1 / 60 },
  webhook: { capacity: 60, refillPerSecond: 1 },
  collect: { capacity: 120, refillPerSecond: 2 },
  invite: { capacity: 20, refillPerSecond: 1 / 180 },
  aiMessage: { capacity: 30, refillPerSecond: 1 / 10 },
  report: { capacity: 5, refillPerSecond: 1 / 600 },
} as const;
export type Scope = keyof typeof LIMITS;

export type Bucket = { tokens: number; updatedAt: number };

/** Pure token-bucket step: refill since the last update, then try to take `cost`. */
export function takeFromBucket(bucket: Bucket | null, limit: { capacity: number; refillPerSecond: number }, now: number, cost = 1): { allowed: boolean; bucket: Bucket; retryAfterSeconds: number } {
  const prev = bucket ?? { tokens: limit.capacity, updatedAt: now };
  const elapsed = Math.max(0, (now - prev.updatedAt) / 1000);
  const tokens = Math.min(limit.capacity, prev.tokens + elapsed * limit.refillPerSecond);
  if (tokens >= cost) return { allowed: true, bucket: { tokens: tokens - cost, updatedAt: now }, retryAfterSeconds: 0 };
  return { allowed: false, bucket: { tokens, updatedAt: now }, retryAfterSeconds: Math.ceil((cost - tokens) / limit.refillPerSecond) };
}

/** Keys are hashed before they reach the database: no raw IPs or emails are stored. */
export function bucketKey(scope: Scope, parts: string): string {
  return createHash("sha256").update(`${scope}:${parts}`).digest("hex");
}
