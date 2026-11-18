export const dynamic = "force-dynamic";

/** Liveness: always 200, no details. */
export function GET() {
  return new Response("ok", { status: 200, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" } });
}
