import { createServiceClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/nav";
import { verifyWebhook, webhookSecretName, HEADER } from "@/lib/automation/webhook";
import { decryptSecret, loadMasterKeys, type Envelope } from "@/lib/secrets/vault";
import { takeToken } from "@/lib/security/server-limit";

export const dynamic = "force-dynamic";
const MAX_BODY = 256_000;

function reply(status: number, error?: string) {
  return Response.json(error ? { error } : { ok: true }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Signed inbound webhook: verify, refuse replays, queue a run. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return reply(404, "unknown endpoint");
  const limited = await takeToken("webhook", id);
  if (!limited.allowed) return new Response(JSON.stringify({ error: "rate limited" }), { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds), "Content-Type": "application/json" } });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return reply(413, "body too large");
  const body = await request.text();
  if (body.length > MAX_BODY) return reply(413, "body too large");

  const keys = (() => { try { return loadMasterKeys(process.env.SECRETS_MASTER_KEYS); } catch { return null; } })();
  if (!keys) return reply(503, "webhooks are not configured");
  const db = createServiceClient();
  const { data: ep } = await db.from("webhook_endpoints").select("id, workflow_id, project_id, ciphertext, iv, auth_tag, wrapped_key, key_version").eq("id", id).maybeSingle();
  if (!ep) return reply(404, "unknown endpoint");

  let secret: string;
  try {
    secret = decryptSecret(keys, { projectId: ep.project_id, name: webhookSecretName(ep.workflow_id), environment: "production" }, ep as unknown as Envelope);
  } catch {
    return reply(500, "endpoint misconfigured");
  }
  const check = verifyWebhook(secret, request.headers.get(HEADER), body);
  if (!check.ok) return reply(401, check.reason);

  let parsed: unknown = body;
  try { parsed = JSON.parse(body); } catch { /* keep text bodies as text */ }
  const { error } = await db.rpc("record_webhook_delivery", { p_endpoint: ep.id, p_signature_hash: check.signatureHash, p_body: parsed });
  if (error) {
    if (/replayed/.test(error.message)) return reply(409, "replayed delivery");
    if (/switched off/.test(error.message)) return reply(423, "workflow is switched off");
    return reply(500, "couldn't queue the run");
  }
  return reply(202);
}
