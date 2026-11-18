import { healthBody } from "../../../lib/health.ts";

export const dynamic = "force-dynamic";

/** Used by Keelwork's deploy verification. Always 200 while the app runs. */
export function GET() {
  return Response.json(healthBody(), { headers: { "Cache-Control": "no-store" } });
}
