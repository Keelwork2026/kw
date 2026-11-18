import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/middleware";
import { buildCsp, makeNonce, SECURITY_HEADERS } from "@/lib/security/headers";

const APP_PREFIXES = ["/dashboard", "/projects", "/new-project", "/builder", "/templates", "/design", "/database", "/backend", "/integrations", "/automation", "/agents", "/testing", "/security", "/deployments", "/hosting", "/analytics", "/team", "/marketplace", "/docs", "/billing", "/settings", "/admin"];

/** Session refresh, CSP nonce, security headers and auth redirects. */
export async function middleware(request: NextRequest) {
  const nonce = makeNonce();
  const csp = buildCsp({ nonce, dev: process.env.NODE_ENV !== "production", supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, previewBaseDomain: process.env.PREVIEW_BASE_DOMAIN });
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);
  let response = NextResponse.next({ request: { headers } });

  const path = request.nextUrl.pathname;
  const isApp = APP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const isAuthPage = ["/sign-in", "/sign-up", "/forgot-password"].includes(path);
  if (isApp || isAuthPage || path === "/mfa") {
    const { user, aal } = await refreshSession(request, response);
    if (isApp && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
      response = NextResponse.redirect(url);
    } else if (isApp && aal === "needs-mfa") {
      const url = request.nextUrl.clone();
      url.pathname = "/mfa";
      url.search = `?next=${encodeURIComponent(path)}`;
      response = NextResponse.redirect(url);
    } else if (isAuthPage && user && aal !== "needs-mfa") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      response = NextResponse.redirect(url);
    }
  }
  response.headers.set("Content-Security-Policy", csp);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) response.headers.set(k, v);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/collect|api/hooks|api/stripe).*)"],
};
