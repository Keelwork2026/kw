import { createServiceClient } from "@/lib/supabase/server";
import { cleanPath, referrerHost, deviceFrom, isBot, optedOut, originAllowed, visitorHash } from "@/lib/analytics/collect";
import { takeToken } from "@/lib/security/server-limit";

export const dynamic = "force-dynamic";

function cors(origin: string | null, status = 204, body: BodyInit | null = null) {
  return new Response(body, { status, headers: { ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}), "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "no-store" } });
}

export async function OPTIONS(request: Request) {
  return cors(request.headers.get("origin"));
}

/** Cookieless page views from apps built with Keelwork. Nothing identifying is stored. */
export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const origin = request.headers.get("origin");
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(key)) return cors(null, 404);
  if (optedOut(request.headers)) return cors(origin, 204);
  const ua = request.headers.get("user-agent");
  if (isBot(ua)) return cors(origin, 204);

  const db = createServiceClient();
  const { data: site } = await db.from("analytics_sites").select("id, org_id, allowed_origins").eq("site_key", key).maybeSingle();
  if (!site || !originAllowed(origin, site.allowed_origins as string[])) return cors(null, 403);

  const ip = (request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim();
  const day = new Date().toISOString().slice(0, 10);
  const { data: salt } = await db.rpc("analytics_salt_for", { p_day: day });
  if (!salt) return cors(origin, 503);
  const saltBuf = Buffer.from(String(salt).replace(/^\\x/, ""), "hex");
  const visitor = visitorHash(saltBuf, site.id, ip, ua!);
  const limited = await takeToken("collect", `${key}|${visitor}`);
  if (!limited.allowed) return cors(origin, 429);

  let body: { path?: unknown; referrer?: unknown } = {};
  try { body = JSON.parse((await request.text()).slice(0, 4000)); } catch { return cors(origin, 400); }
  await db.from("analytics_events").insert({
    site_id: site.id, org_id: site.org_id, day,
    path: cleanPath(body.path), referrer_host: referrerHost(body.referrer, origin ? new URL(origin).hostname : undefined),
    device: deviceFrom(ua!), visitor_hash: visitor,
  });
  return cors(origin, 204);
}
