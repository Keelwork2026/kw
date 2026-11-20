import { logoSource, sniffImage, MAX_LOGO_BYTES } from "@/lib/integrations/logo";

/**
 * Same-origin proxy for connector logos, so browsers never contact a third
 * party and the page's CSP stays narrow. Only catalog ids are accepted; the
 * upstream URL is never taken from the request. Logos are cached in memory.
 */
const cache = new Map<string, { body: Uint8Array; type: string } | null>();
const failedAt = new Map<string, number>();
const RETRY_MS = 10 * 60_000;
const MAX_CACHE = 300;

function notFound() {
  return new Response("Not found", { status: 404, headers: { "cache-control": "public, max-age=600", "x-content-type-options": "nosniff" } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const src = /^[a-z0-9-]{1,40}$/.test(id) ? logoSource(id) : null;
  if (!src) return notFound();
  let hit = cache.get(id);
  if (hit === null && Date.now() - (failedAt.get(id) ?? 0) > RETRY_MS) hit = undefined;
  if (hit === undefined) {
    hit = null;
    try {
      const res = await fetch(src, { redirect: "follow", signal: AbortSignal.timeout(5000), cache: "no-store" });
      const len = Number(res.headers.get("content-length") ?? 0);
      if (res.ok && len <= MAX_LOGO_BYTES) {
        const body = new Uint8Array(await res.arrayBuffer());
        const type = body.byteLength <= MAX_LOGO_BYTES ? sniffImage(body) : null;
        if (type) hit = { body, type };
      }
    } catch { /* fall back to the monogram */ }
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
    cache.set(id, hit);
    if (hit) failedAt.delete(id); else failedAt.set(id, Date.now());
  }
  if (!hit) return notFound();
  return new Response(hit.body as BodyInit, {
    headers: { "content-type": hit.type, "cache-control": "public, max-age=604800, stale-while-revalidate=86400", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'" },
  });
}
