import { backendRules, type BackendId, type DeployTargetId } from "./backends";

/**
 * Adapts the Next + Supabase starter to the chosen backend and deploy
 * target: dependencies, .env.example, client modules, the stack section of
 * AGENTS.md, and the OpenNext/Wrangler config for Cloudflare.
 * Backend SDKs use "latest" so the lockfile pins them on first install.
 */
export function adaptTemplate(input: Map<string, string>, o: { backend: BackendId; deployTarget: DeployTargetId; projectName: string }): Map<string, string> {
  const files = new Map(input);
  const pkg = JSON.parse(files.get("package.json") ?? "{}") as { name?: string; scripts: Record<string, string>; dependencies: Record<string, string>; devDependencies: Record<string, string> };
  const slug = o.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "keelwork-app";
  pkg.name = slug;

  const envLines: string[] = ["# Names only. Keelwork writes real values to .env.local from the project's Secrets tab."];
  const dropSupabase = () => {
    delete pkg.dependencies["@supabase/ssr"];
    delete pkg.dependencies["@supabase/supabase-js"];
    for (const p of [...files.keys()]) if (p.startsWith("lib/supabase/") || p.startsWith("supabase/")) files.delete(p);
  };

  switch (o.backend) {
    case "supabase":
      envLines.push("NEXT_PUBLIC_SUPABASE_URL=", "NEXT_PUBLIC_SUPABASE_ANON_KEY=");
      break;
    case "postgres":
      dropSupabase();
      pkg.dependencies.postgres = "latest";
      envLines.push("# Server-only. Never prefix with NEXT_PUBLIC_.", "DATABASE_URL=");
      files.set("db/migrations/.gitkeep", "");
      files.set("lib/db.ts", `// Server-only database access. Import this only from server code.
import postgres from "postgres";

let client: ReturnType<typeof postgres> | null = null;

/** Parameterised queries only: use the sql tagged template, never string concatenation. */
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("The database isn't connected yet: add DATABASE_URL on the Secrets tab.");
  client ??= postgres(url, { max: 5, idle_timeout: 20, prepare: false });
  return client;
}
`);
      break;
    case "appwrite":
      dropSupabase();
      pkg.dependencies.appwrite = "latest";
      pkg.dependencies["node-appwrite"] = "latest";
      envLines.push("NEXT_PUBLIC_APPWRITE_ENDPOINT=", "NEXT_PUBLIC_APPWRITE_PROJECT_ID=", "# Server-only:", "APPWRITE_API_KEY=");
      files.set("lib/appwrite.ts", `"use client";
import { Client, Account, Databases } from "appwrite";

/** Browser client: endpoint and project id only — never an API key. */
export function appwrite() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!endpoint || !project) throw new Error("Appwrite isn't connected yet: add the endpoint and project id on the Secrets tab.");
  const client = new Client().setEndpoint(endpoint).setProject(project);
  return { client, account: new Account(client), databases: new Databases(client) };
}
`);
      files.set("lib/appwrite-server.ts", `// Server-only admin client. Import this only from server code.
import { Client, Databases, Users } from "node-appwrite";

export function appwriteAdmin() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const key = process.env.APPWRITE_API_KEY;
  if (!endpoint || !project || !key) throw new Error("Appwrite isn't connected yet: add APPWRITE_API_KEY on the Secrets tab.");
  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
  return { databases: new Databases(client), users: new Users(client) };
}
`);
      break;
    case "cloudbase":
      dropSupabase();
      pkg.dependencies["@cloudbase/js-sdk"] = "latest";
      pkg.dependencies["@cloudbase/node-sdk"] = "latest";
      envLines.push("NEXT_PUBLIC_TCB_ENV_ID=", "# Server-only:", "TCB_SECRET_ID=", "TCB_SECRET_KEY=");
      files.set("lib/cloudbase.ts", `"use client";
import cloudbase from "@cloudbase/js-sdk";

let app: ReturnType<typeof cloudbase.init> | null = null;

/** Browser SDK. Access is controlled by the security rules in cloudbaserc.json. */
export function tcb() {
  const env = process.env.NEXT_PUBLIC_TCB_ENV_ID;
  if (!env) throw new Error("CloudBase isn't connected yet: add NEXT_PUBLIC_TCB_ENV_ID on the Secrets tab.");
  app ??= cloudbase.init({ env });
  return app;
}
`);
      files.set("lib/cloudbase-server.ts", `// Server-only. TCB_SECRET_ID / TCB_SECRET_KEY never reach the browser.
import tcb from "@cloudbase/node-sdk";

export function tcbAdmin() {
  const env = process.env.NEXT_PUBLIC_TCB_ENV_ID;
  const secretId = process.env.TCB_SECRET_ID;
  const secretKey = process.env.TCB_SECRET_KEY;
  if (!env || !secretId || !secretKey) throw new Error("CloudBase isn't connected yet: add TCB_SECRET_ID and TCB_SECRET_KEY on the Secrets tab.");
  return tcb.init({ env, secretId, secretKey });
}
`);
      files.set("cloudbaserc.json", JSON.stringify({ version: "2.0", envId: "{{env.NEXT_PUBLIC_TCB_ENV_ID}}", framework: { name: slug }, database: { rules: {} } }, null, 2) + "\n");
      break;
  }

  if (o.deployTarget === "cloudflare") {
    pkg.devDependencies["@opennextjs/cloudflare"] = "latest";
    pkg.devDependencies.wrangler = "latest";
    pkg.scripts["cf:build"] = "opennextjs-cloudflare build";
    files.set("open-next.config.ts", `import { defineCloudflareConfig } from "@opennextjs/cloudflare";\n\nexport default defineCloudflareConfig();\n`);
    files.set("wrangler.jsonc", JSON.stringify({
      name: slug, main: ".open-next/worker.js", compatibility_date: "2026-11-01", compatibility_flags: ["nodejs_compat"],
      assets: { directory: ".open-next/assets", binding: "ASSETS" },
    }, null, 2) + "\n");
  }

  files.set("package.json", JSON.stringify(pkg, null, 2) + "\n");
  files.set(".env.example", envLines.join("\n") + "\n");
  const agents = files.get("AGENTS.md");
  if (agents) {
    const block = `<!-- kw:stack:start -->\n- Deploy target: ${o.deployTarget === "cloudflare" ? "Cloudflare Workers (OpenNext)" : "Vercel"}.\n${backendRules(o.backend)}\n<!-- kw:stack:end -->`;
    files.set("AGENTS.md", agents.replace(/<!-- kw:stack:start -->[\s\S]*?<!-- kw:stack:end -->/, block));
  }
  return files;
}
