import { createHmac, createHash, timingSafeEqual } from "node:crypto";

/**
 * Signed inbound webhooks. Header: keelwork-signature: t=<unix seconds>,v1=<hex>
 * where v1 = HMAC-SHA256(secret, `${t}.${body}`). A 300-second tolerance
 * window applies and the comparison is constant-time; the replay ledger
 * refuses a signature it has seen before.
 */
export const HEADER = "keelwork-signature";
export const TOLERANCE_SECONDS = 300;

export function signWebhook(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)): string {
  return `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

export type WebhookCheck = { ok: true; signatureHash: string } | { ok: false; reason: string };

export function verifyWebhook(secret: string, header: string | null, body: string, now = Math.floor(Date.now() / 1000), tolerance = TOLERANCE_SECONDS): WebhookCheck {
  if (!header || header.length > 600) return { ok: false, reason: "missing signature" };
  let t: number | null = null;
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.trim().split("=", 2);
    if (k === "t" && /^\d{1,12}$/.test(v ?? "")) t = Number(v);
    if (k === "v1" && /^[0-9a-f]{64}$/.test(v ?? "")) sigs.push(v!);
  }
  if (t === null || sigs.length === 0) return { ok: false, reason: "malformed signature" };
  if (Math.abs(now - t) > tolerance) return { ok: false, reason: "timestamp outside the tolerance window" };
  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest();
  const match = sigs.find((s) => timingSafeEqual(Buffer.from(s, "hex"), expected));
  if (!match) return { ok: false, reason: "signature mismatch" };
  return { ok: true, signatureHash: createHash("sha256").update(`${t}.${match}`).digest("hex") };
}

/** Vault name for a workflow's signing secret (binds the envelope to the workflow). */
export function webhookSecretName(workflowId: string): string {
  return `WEBHOOK_${workflowId.replace(/-/g, "").toUpperCase()}`;
}
