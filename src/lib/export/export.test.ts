import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createZip, crc32, safeEntryName } from "./zip";
import { shouldInclude, collectForExport, envReadme, EXPORT_LIMITS } from "./collect";
import { canMove } from "@/lib/deploy/state";

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
});

test("ZIP archives are valid according to the system unzip", () => {
  const dir = mkdtempSync(join(tmpdir(), "kw-zip-"));
  try {
    const zip = createZip([
      { name: "README.md", data: "# Hello\n" },
      { name: "app/page.tsx", data: "export default function P() { return <main>héllo ✓</main>; }\n".repeat(50) },
      { name: "public/logo.bin", data: Buffer.from([0, 1, 2, 255, 254]) },
      { name: "empty.txt", data: "" },
    ]);
    const file = join(dir, "x.zip");
    writeFileSync(file, zip);
    const test = execFileSync("unzip", ["-t", file]).toString();
    assert.match(test, /No errors detected/);
    execFileSync("unzip", ["-q", file, "-d", join(dir, "out")]);
    assert.equal(readFileSync(join(dir, "out/app/page.tsx"), "utf8"), "export default function P() { return <main>héllo ✓</main>; }\n".repeat(50));
    assert.deepEqual([...readFileSync(join(dir, "out/public/logo.bin"))], [0, 1, 2, 255, 254]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("safeEntryName refuses traversal and absolute paths", () => {
  for (const bad of ["../x", "a/../b", "/etc/passwd", "C:/x", "a//b", "a\\b", "", "a\u0000b"]) assert.throws(() => safeEntryName(bad), bad);
  assert.throws(() => createZip([{ name: "../evil", data: "x" }]));
  assert.throws(() => createZip([{ name: "a", data: "x" }, { name: "a", data: "y" }]), /duplicate/);
});

test("export filtering: generated folders, logs and env files stay out", () => {
  for (const p of ["node_modules/x/index.js", ".next/server.js", ".git/HEAD", ".vercel/project.json", ".turbo/cache", "coverage/lcov.info", "dist/a.js", "logs/app.txt", "npm-debug.log", "tsconfig.tsbuildinfo", ".env", ".env.local", "app/.env.production"]) assert.equal(shouldInclude(p), false, p);
  for (const p of [".env.example", "app/page.tsx", "README.md", "supabase/migrations/1.sql"]) assert.equal(shouldInclude(p), true, p);
});

test("collectForExport blocks on any credential, including exact vault values", () => {
  const ok = collectForExport([{ path: "app/page.tsx", content: Buffer.from("x") }, { path: ".env.local", content: Buffer.from("SECRET=1") }], []);
  assert.ok(ok.ok && ok.files.length === 1);
  const leak = collectForExport([{ path: "lib/x.ts", content: Buffer.from(`const k = "my-vault-value-123";`) }], ["my-vault-value-123"]);
  assert.equal(leak.ok, false);
  if (!leak.ok && leak.reason === "credentials") assert.equal(leak.findings[0]!.rule, "vault-value");
  const big = collectForExport([{ path: "a.bin", content: Buffer.alloc(EXPORT_LIMITS.bytes + 1) }], []);
  assert.equal(big.ok, false);
  const readme = envReadme("Shop", ["STRIPE_SECRET_KEY", "DATABASE_URL", "STRIPE_SECRET_KEY"]);
  assert.match(readme, /- `DATABASE_URL`\n- `STRIPE_SECRET_KEY`/);
  assert.ok(!/=/.test(readme.split("## Environment variables")[1]!.split("## Run it")[0]!), "names only, never values");
});

test("deployment lifecycle mirror", () => {
  assert.ok(canMove("queued", "collecting"));
  assert.ok(!canMove("queued", "live"));
  assert.ok(!canMove("building", "live"));
  assert.ok(canMove("verifying", "live"));
  assert.ok(canMove("live", "superseded"));
  assert.ok(!canMove("failed", "live"));
});
