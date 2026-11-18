import { createServiceClient } from "@/lib/supabase/server";
import { EXPECTED_MIGRATIONS } from "@/lib/security/readiness";

export const dynamic = "force-dynamic";

/** Readiness: 200 only when the database answers and every expected migration is applied. Leaks no details. */
export async function GET() {
  try {
    const { data, error } = await createServiceClient().rpc("readiness");
    const applied = new Set(((data as { migrations?: string[] } | null)?.migrations ?? []));
    const ok = !error && EXPECTED_MIGRATIONS.every((m) => applied.has(m));
    return new Response(ok ? "ready" : "not ready", { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" } });
  } catch {
    return new Response("not ready", { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" } });
  }
}
