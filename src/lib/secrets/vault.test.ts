import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { loadMasterKeys, encryptSecret, decryptSecret, rewrap, toDotenv, redactSecrets, VaultError } from "./vault";

const k1 = randomBytes(32).toString("base64"), k2 = randomBytes(32).toString("base64");
const ctx = { projectId: "3f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f", name: "STRIPE_SECRET_KEY", environment: "production" as const };

test("round trip with a fresh data key per value", () => {
  const mk = loadMasterKeys(`1:${k1}`)!;
  const a = encryptSecret(mk, ctx, "sk_live_abc");
  const b = encryptSecret(mk, ctx, "sk_live_abc");
  assert.equal(decryptSecret(mk, ctx, a), "sk_live_abc");
  assert.notEqual(a.ciphertext + a.wrapped_key, b.ciphertext + b.wrapped_key);
  assert.ok(!JSON.stringify(a).includes("sk_live_abc"));
});

test("tampering and wrong keys fail to decrypt", () => {
  const mk = loadMasterKeys(`1:${k1}`)!;
  const e = encryptSecret(mk, ctx, "value-1234");
  const flip = (s: string) => { const b = Buffer.from(s, "base64"); b[0]! ^= 1; return b.toString("base64"); };
  assert.throws(() => decryptSecret(mk, ctx, { ...e, ciphertext: flip(e.ciphertext) }), VaultError);
  assert.throws(() => decryptSecret(mk, ctx, { ...e, auth_tag: flip(e.auth_tag) }), VaultError);
  assert.throws(() => decryptSecret(mk, ctx, { ...e, wrapped_key: flip(e.wrapped_key) }), VaultError);
  assert.throws(() => decryptSecret(loadMasterKeys(`1:${k2}`)!, ctx, e), VaultError);
  assert.throws(() => decryptSecret(mk, ctx, { ...e, key_version: 9 }), /not configured/);
});

test("a copied envelope fails under another project, name or environment", () => {
  const mk = loadMasterKeys(`1:${k1}`)!;
  const e = encryptSecret(mk, ctx, "value-1234");
  assert.throws(() => decryptSecret(mk, { ...ctx, name: "OTHER_KEY" }, e), VaultError);
  assert.throws(() => decryptSecret(mk, { ...ctx, environment: "preview" }, e), VaultError);
  assert.throws(() => decryptSecret(mk, { ...ctx, projectId: "9f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f" }, e), VaultError);
});

test("rotation: the highest version encrypts, older versions still decrypt", () => {
  const old = loadMasterKeys(`1:${k1}`)!;
  const e1 = encryptSecret(old, ctx, "rotate-me");
  const both = loadMasterKeys(`1:${k1},2:${k2}`)!;
  assert.equal(both.current, 2);
  assert.equal(decryptSecret(both, ctx, e1), "rotate-me");
  const e2 = rewrap(both, ctx, e1);
  assert.equal(e2.key_version, 2);
  assert.equal(decryptSecret(loadMasterKeys(`2:${k2}`)!, ctx, e2), "rotate-me");
});

test("master key parsing", () => {
  assert.equal(loadMasterKeys(""), null);
  assert.throws(() => loadMasterKeys("1:short"), /32 bytes/);
  assert.throws(() => loadMasterKeys(`x:${k1}`), /look like/);
  assert.throws(() => loadMasterKeys(`1:${k1},1:${k2}`), /twice/);
  assert.throws(() => encryptSecret(loadMasterKeys(`1:${k1}`)!, { ...ctx, name: "bad name" }, "v"), /secret names/);
});

test("toDotenv quotes values so they can't inject variables or lines", () => {
  const out = toDotenv({ B: 'a"b\\c', A: "line1\nINJECTED=1", C: "$HOME ${PATH}" });
  assert.equal(out.split("\n").filter((l) => l && !l.startsWith("#")).length, 3);
  assert.match(out, /^A="line1\\nINJECTED=1"$/m);
  assert.match(out, /^B="a\\"b\\\\c"$/m);
  assert.match(out, /^C="\\\$HOME \\\$\{PATH\}"$/m);
  assert.throws(() => toDotenv({ "BAD-NAME": "x" }));
  assert.throws(() => toDotenv({ X: "a\u0000b" }));
});

test("redactSecrets scrubs exact values and their base64", () => {
  const v = ["sk", "live", "51HxyzSECRET"].join("_");
  const out = redactSecrets(`token ${v} and ${Buffer.from(v).toString("base64")} ok`, [v, "abc"]);
  assert.ok(!out.includes(v) && !out.includes(Buffer.from(v).toString("base64").slice(0, 20)));
  assert.match(out, /\[secret\]/);
  assert.equal(redactSecrets("abc stays", ["abc"]), "abc stays", "values shorter than 4 characters are ignored");
});
