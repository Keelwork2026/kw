/** Per-project stack choice: backend and deploy target, fixed after the first build. */
export type BackendId = "supabase" | "postgres" | "appwrite" | "cloudbase";
export type DeployTargetId = "cloudflare" | "vercel";

export const BACKENDS: { id: BackendId; name: string; summary: string; migrationsDir: string | null; default?: boolean }[] = [
  { id: "supabase", name: "Supabase", summary: "Postgres, auth, storage and row-level security.", migrationsDir: "supabase/migrations", default: true },
  { id: "postgres", name: "PostgreSQL", summary: "Plain PostgreSQL; server code does all data access.", migrationsDir: "db/migrations" },
  { id: "appwrite", name: "Appwrite", summary: "Open-source and self-hostable, with document collections.", migrationsDir: null },
  { id: "cloudbase", name: "Tencent CloudBase", summary: "For apps whose users are in China; document database with security rules.", migrationsDir: null },
];

export const DEPLOY_TARGETS: { id: DeployTargetId; name: string; summary: string; default?: boolean }[] = [
  { id: "cloudflare", name: "Cloudflare Workers", summary: "Built with OpenNext and deployed to your own Cloudflare account.", default: true },
  { id: "vercel", name: "Vercel", summary: "Deployed to your own Vercel account." },
];

export function isBackend(v: unknown): v is BackendId {
  return typeof v === "string" && BACKENDS.some((b) => b.id === v);
}
export function isDeployTarget(v: unknown): v is DeployTargetId {
  return typeof v === "string" && DEPLOY_TARGETS.some((d) => d.id === v);
}
export function migrationsDirFor(backend: BackendId): string | null {
  return BACKENDS.find((b) => b.id === backend)?.migrationsDir ?? null;
}

/** Rules given to the planner and every agent for the chosen backend. */
export function backendRules(backend: BackendId): string {
  const common = [
    "Server-only keys (service keys, admin API keys, database URLs) are read only in server code — never in a file with \"use client\" or a NEXT_PUBLIC_ variable.",
    "Validate every input on the server before using it.",
    "Check who the caller is in every server action and API route.",
  ];
  const specific: Record<BackendId, string[]> = {
    supabase: [
      "Write SQL migrations in supabase/migrations. Every table enables row level security in the same migration and has policies.",
      "Use the anon key in the browser and @supabase/ssr on the server. The service-role key is only for trusted server jobs.",
    ],
    postgres: [
      "Write SQL migrations in db/migrations. All data access happens in server code through lib/db.ts.",
      "Use parameterised queries only: the postgres sql tagged template. Never build SQL by concatenating strings.",
      "Enforce access rules in server code for every query, because there is no row-level security for browser clients.",
    ],
    appwrite: [
      "Data lives in Appwrite document collections; set collection and document permissions for every collection.",
      "The browser uses lib/appwrite.ts (endpoint and project id only). APPWRITE_API_KEY is used only in lib/appwrite-server.ts.",
    ],
    cloudbase: [
      "Data lives in the CloudBase document database; write security rules for every collection in cloudbaserc.json.",
      "The browser uses @cloudbase/js-sdk via lib/cloudbase.ts. TCB_SECRET_ID and TCB_SECRET_KEY are used only in lib/cloudbase-server.ts.",
    ],
  };
  return [...specific[backend], ...common].map((r) => `- ${r}`).join("\n");
}
