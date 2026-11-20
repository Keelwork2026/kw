import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, makeNonce } from "./lib/csp.ts";

/**
 * Sends a Content-Security-Policy with a per-request nonce. Next.js reads the
 * nonce from the request header and adds it to its own scripts; read it in a
 * server component with `(await headers()).get("x-nonce")` if you add a
 * <Script> of your own.
 */
export function middleware(request: NextRequest) {
  const nonce = makeNonce();
  const csp = buildCsp({
    nonce,
    dev: process.env.NODE_ENV !== "production",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    backendUrls: [process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT],
    // CloudBase's browser SDK talks to Tencent Cloud API hosts.
    extraConnect: process.env.NEXT_PUBLIC_TCB_ENV_ID ? ["https://*.tencentcloudapi.com", "wss://*.tencentcloudapi.com", "https://*.tcloudbase.com"] : [],
    analyticsUrl: process.env.NEXT_PUBLIC_KW_ANALYTICS_URL,
    appOrigin: process.env.NEXT_PUBLIC_KW_APP_ORIGIN,
  });
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Skip static files, images and the health check; everything else gets the policy.
  matcher: [{ source: "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|txt|xml)$).*)" }],
};
