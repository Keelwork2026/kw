import { test } from "node:test";
import assert from "node:assert/strict";
import { checkEnv, parseEnvFile } from "./preflight";

const key = Buffer.alloc(32, 7).toString("base64");
const good = {
  NEXT_PUBLIC_SITE_URL: "https://app.keelwork.dev", NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co", KW_APP_ORIGIN: "https://app.keelwork.dev",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-qq1", SUPABASE_SERVICE_ROLE_KEY: "srk-zz9-secret", SECRETS_MASTER_KEYS: `1:${key}`,
  BROKER_TOKEN: "a".repeat(64), SANDBOX_BROKER_TOKEN: "a".repeat(64), PREVIEW_SECRET: "b".repeat(64), STRIPE_SECRET_KEY: "sk_live_x", STRIPE_WEBHOOK_SECRET: "whsec_x",
  AI_MODEL_CATALOG: "{}", SANDBOX_RUNTIME: "runsc", HOST: "127.0.0.1",
};
const names = Object.keys(good);

test("preflight: a sound production file passes", () => {
  assert.deepEqual(checkEnv(good, names).filter((f) => f.level === "error"), []);
});

test("preflight: catches what would break or weaken production, without printing values", () => {
  const bad = { ...good, NEXT_PUBLIC_SITE_URL: "http://localhost:3000", SECRETS_MASTER_KEYS: "1:short", PREVIEW_SECRET: "abc", SANDBOX_BROKER_TOKEN: "c".repeat(64),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "srk-zz9-secret", AI_MODEL_CATALOG: "{nope", STRIPE_WEBHOOK_SECRET: "changeme", HOST: "0.0.0.0", SANDBOX_RUNTIME: "runc" };
  const f = checkEnv(bad, [...names, "RESEND_API_KEY"]);
  const errs = (n: string) => f.filter((x) => x.name === n && x.level === "error").map((x) => x.message).join(" | ");
  assert.match(errs("NEXT_PUBLIC_SITE_URL"), /https/);
  assert.match(errs("NEXT_PUBLIC_SITE_URL"), /this machine/);
  assert.match(errs("SECRETS_MASTER_KEYS"), /32 bytes/);
  assert.match(errs("PREVIEW_SECRET"), /too short/);
  assert.match(errs("SANDBOX_BROKER_TOKEN"), /match/);
  assert.match(errs("NEXT_PUBLIC_SUPABASE_ANON_KEY"), /service-role/);
  assert.match(errs("AI_MODEL_CATALOG"), /JSON/);
  assert.match(errs("STRIPE_WEBHOOK_SECRET"), /placeholder/);
  assert.match(errs("RESEND_API_KEY"), /missing/);
  assert.ok(f.some((x) => x.name === "HOST" && x.level === "warning"));
  assert.ok(f.some((x) => x.name === "SANDBOX_RUNTIME" && x.level === "warning"));
  for (const x of f) for (const v of Object.values(bad)) if (v.length > 6) assert.ok(!x.message.includes(v), "no values in messages");
  assert.ok(checkEnv({ ...good, STRIPE_SECRET_KEY: "sk_test_x" }, names).some((x) => x.name === "STRIPE_SECRET_KEY" && x.level === "warning"));
  assert.ok(checkEnv(good, [...names, "SANDBOX_IMAGE"]).some((x) => x.name === "SANDBOX_IMAGE" && x.level === "warning"));
});

test("preflight: env files parse like dotenv", () => {
  assert.deepEqual(parseEnvFile('# c\nexport A="1 2"\nB=\'x\'\nC=3\nbad line\n'), { A: "1 2", B: "x", C: "3" });
});
