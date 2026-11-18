import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTemplate } from "./load";
import { adaptTemplate } from "../stack/adapt";
import { BACKENDS, DEPLOY_TARGETS, backendRules, isBackend, migrationsDirFor } from "../stack/backends";

test("the starter template loads with its conventions and without secrets", async () => {
  const t = await loadTemplate("next-supabase");
  for (const f of ["AGENTS.md", "package.json", "app/kw-inspector.tsx", "app/kw-analytics.tsx", "app/api/health/route.ts", ".gitignore", ".env.example"]) assert.ok(t.has(f), f);
  assert.ok(![...t.keys()].some((k) => /(^|\/)\.env(?!\.example$)/.test(k)));
  assert.match(t.get(".gitignore")!, /^\.env\*$/m);
  await assert.rejects(loadTemplate("../etc"), /invalid/);
  await assert.rejects(loadTemplate("missing-template"));
});

test("adaptTemplate: supabase + cloudflare keeps the starter and adds OpenNext", async () => {
  const out = adaptTemplate(await loadTemplate("next-supabase"), { backend: "supabase", deployTarget: "cloudflare", projectName: "Studio Bookings!" });
  const pkg = JSON.parse(out.get("package.json")!);
  assert.equal(pkg.name, "studio-bookings");
  assert.equal(pkg.devDependencies["@opennextjs/cloudflare"], "latest");
  assert.equal(pkg.devDependencies.wrangler, "latest");
  assert.ok(out.has("wrangler.jsonc") && out.has("open-next.config.ts"));
  assert.ok(out.has("lib/supabase/server.ts"));
  assert.match(out.get("AGENTS.md")!, /Cloudflare Workers/);
});

test("adaptTemplate: postgres writes lib/db.ts with the sql template and no Supabase", async () => {
  const out = adaptTemplate(await loadTemplate("next-supabase"), { backend: "postgres", deployTarget: "vercel", projectName: "x" });
  const db = out.get("lib/db.ts")!;
  assert.match(db, /max: 5, idle_timeout: 20, prepare: false/);
  assert.match(db, /DATABASE_URL/);
  assert.match(db, /isn't connected yet/);
  assert.ok(out.has("db/migrations/.gitkeep"));
  assert.ok(![...out.keys()].some((k) => k.startsWith("lib/supabase/") || k.startsWith("supabase/")));
  const pkg = JSON.parse(out.get("package.json")!);
  assert.equal(pkg.dependencies.postgres, "latest");
  assert.equal(pkg.dependencies["@supabase/ssr"], undefined);
  assert.ok(!out.has("wrangler.jsonc"));
  assert.match(out.get("AGENTS.md")!, /parameterised queries/);
  assert.match(out.get(".env.example")!, /^DATABASE_URL=$/m);
});

test("adaptTemplate: appwrite and cloudbase keep server keys in server-only modules", async () => {
  const aw = adaptTemplate(await loadTemplate("next-supabase"), { backend: "appwrite", deployTarget: "cloudflare", projectName: "x" });
  assert.match(aw.get("lib/appwrite.ts")!, /^"use client"/);
  assert.ok(!aw.get("lib/appwrite.ts")!.includes("APPWRITE_API_KEY"));
  assert.match(aw.get("lib/appwrite-server.ts")!, /APPWRITE_API_KEY/);
  const cb = adaptTemplate(await loadTemplate("next-supabase"), { backend: "cloudbase", deployTarget: "cloudflare", projectName: "x" });
  assert.ok(!cb.get("lib/cloudbase.ts")!.includes("TCB_SECRET"));
  assert.match(cb.get("lib/cloudbase-server.ts")!, /TCB_SECRET_KEY/);
  assert.ok(cb.has("cloudbaserc.json"));
  assert.equal(JSON.parse(cb.get("package.json")!).dependencies["@cloudbase/js-sdk"], "latest");
});

test("backend and deploy-target catalogue", () => {
  assert.deepEqual(BACKENDS.map((b) => b.id), ["supabase", "postgres", "appwrite", "cloudbase"]);
  assert.equal(BACKENDS.find((b) => b.default)?.id, "supabase");
  assert.equal(DEPLOY_TARGETS.find((d) => d.default)?.id, "cloudflare");
  assert.equal(migrationsDirFor("postgres"), "db/migrations");
  assert.equal(migrationsDirFor("appwrite"), null);
  assert.match(backendRules("cloudbase"), /security rules/);
  assert.ok(!isBackend("mysql"));
});
