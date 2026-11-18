/**
 * Backend Studio: finds API routes and server actions and reports, per
 * route, its HTTP methods, whether the caller is checked, whether input is
 * validated, and any service-role use in client-reachable code.
 */
export type RouteReport = {
  file: string;
  kind: "route" | "action";
  path: string | null;
  methods: string[];
  checksCaller: boolean;
  validatesInput: boolean;
  serviceRole: boolean;
  clientReachable: boolean;
  issues: string[];
};

const ROUTE_RE = /^(?:src\/)?app\/(.+\/)?route\.(ts|tsx|js|mjs)$/;

export function candidateFiles(paths: string[]): string[] {
  return paths.filter((p) => ROUTE_RE.test(p) || (/\.(ts|tsx|js|mjs)$/.test(p) && /^(src\/)?(app|lib|actions|server)\//.test(p) && !/\.test\./.test(p) && !p.includes("node_modules/")));
}

/** "app/(shop)/api/orders/[id]/route.ts" → "/api/orders/[id]". */
export function routePath(file: string): string | null {
  const m = ROUTE_RE.exec(file);
  if (!m) return null;
  const segs = (m[1] ?? "").split("/").filter(Boolean).filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith("@"));
  return "/" + segs.join("/");
}

function firstDirective(src: string): string | null {
  const body = src.replace(/^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/, "");
  return /^\s*["']use (server|client)["']/.exec(body)?.[1] ?? null;
}

export function analyzeSource(file: string, src: string): RouteReport | null {
  const directive = firstDirective(src);
  const isRoute = ROUTE_RE.test(file);
  if (!isRoute && directive !== "server" && directive !== "client") return null;
  const methods = isRoute
    ? [...new Set([...src.matchAll(/export\s+(?:async\s+)?(?:function\s+|const\s+)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map((m) => m[1]!))]
    : [];
  const checksCaller = /\b(auth\.getUser|getUser|requireOrg|loadProject|getSession|requireUser|currentUser|verify\w*Signature|verifyPreviewToken|has_permission)\s*\(/.test(src);
  const validatesInput = /\b(safeParse|\.parse)\s*\(|\bz\.\w+\(|\bvalidate\w*\s*\(|\bisUuid\s*\(|\.test\(\s*\w+\s*\)|typeof\s+[\w.]+\s*[!=]==\s*["']/.test(src);
  const serviceRole = /SERVICE_ROLE|service_role|createServiceClient|APPWRITE_API_KEY|TCB_SECRET_(ID|KEY)|serviceRoleKey/.test(src);
  const clientReachable = directive === "client";
  const issues: string[] = [];
  if (serviceRole && clientReachable) issues.push("Service-role credentials are used in client code; anyone could read them.");
  if (/NEXT_PUBLIC_[A-Z_]*(SERVICE_ROLE|SECRET|API_KEY)/.test(src)) issues.push("A secret is exposed through a NEXT_PUBLIC_ variable.");
  if ((isRoute || directive === "server") && !checksCaller) issues.push("Doesn't check who the caller is.");
  if ((isRoute && methods.some((m) => m !== "GET" && m !== "HEAD" && m !== "OPTIONS") || directive === "server") && !validatesInput) issues.push("Doesn't validate its input.");
  if (directive === "client" && !serviceRole && issues.length === 0) return null;
  return {
    file, kind: isRoute ? "route" : "action", path: routePath(file), methods,
    checksCaller, validatesInput, serviceRole, clientReachable, issues,
  };
}
