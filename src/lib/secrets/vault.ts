/**
 * Envelope encryption for project secrets.
 *
 * Each value is encrypted with AES-256-GCM under a fresh 32-byte data key.
 * The data key is wrapped with AES-256-GCM by master key vN. Master keys come
 * from SECRETS_MASTER_KEYS ("1:<base64 32 bytes>,2:<…>") and never enter the
 * database. The highest version encrypts; older versions still decrypt, which
 * allows rotation. The AAD binds each envelope to its project, name and
 * environment, so a copied envelope fails to decrypt.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
export { redactSecrets } from "./redact";

export type Envelope = { ciphertext: string; iv: string; auth_tag: string; wrapped_key: string; key_version: number };
export type MasterKeys = { keys: Map<number, Buffer>; current: number };
export type SecretContext = { projectId: string; name: string; environment: Environment };
export type Environment = "development" | "preview" | "production";

export const ENVIRONMENTS: Environment[] = ["development", "preview", "production"];
export const SECRET_NAME_RE = /^[A-Z][A-Z0-9_]{1,63}$/;
const ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;

export class VaultError extends Error {}

export function loadMasterKeys(spec: string | undefined): MasterKeys | null {
  if (!spec || !spec.trim()) return null;
  const keys = new Map<number, Buffer>();
  for (const part of spec.split(",")) {
    const m = /^\s*(\d{1,4}):([A-Za-z0-9+/=]+)\s*$/.exec(part);
    if (!m) throw new VaultError("SECRETS_MASTER_KEYS must look like 1:<base64>,2:<base64>");
    const version = Number(m[1]);
    const key = Buffer.from(m[2]!, "base64");
    if (version < 1 || key.length !== 32) throw new VaultError(`master key ${m[1]} must be 32 bytes (openssl rand -base64 32)`);
    if (keys.has(version)) throw new VaultError(`master key ${version} is listed twice`);
    keys.set(version, key);
  }
  return { keys, current: Math.max(...keys.keys()) };
}

function aad(ctx: SecretContext): Buffer {
  if (!SECRET_NAME_RE.test(ctx.name)) throw new VaultError("secret names look like STRIPE_SECRET_KEY");
  if (!ENVIRONMENTS.includes(ctx.environment)) throw new VaultError("unknown environment");
  return Buffer.from(`keelwork:secret:v1:${ctx.projectId}:${ctx.name}:${ctx.environment}`, "utf8");
}

function seal(key: Buffer, plaintext: Buffer, associated: Buffer) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(associated);
  const ct = Buffer.concat([c.update(plaintext), c.final()]);
  return { iv, ct, tag: c.getAuthTag() };
}

function open(key: Buffer, iv: Buffer, ct: Buffer, tag: Buffer, associated: Buffer): Buffer {
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAAD(associated);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

export function encryptSecret(mk: MasterKeys, ctx: SecretContext, value: string): Envelope {
  if (typeof value !== "string" || value.length === 0) throw new VaultError("secret value is empty");
  if (value.length > 32_768) throw new VaultError("secret values are limited to 32 KB");
  const associated = aad(ctx);
  const dataKey = randomBytes(32);
  try {
    const body = seal(dataKey, Buffer.from(value, "utf8"), associated);
    const master = mk.keys.get(mk.current)!;
    const wrap = seal(master, dataKey, associated);
    return {
      ciphertext: body.ct.toString("base64"),
      iv: body.iv.toString("base64"),
      auth_tag: body.tag.toString("base64"),
      wrapped_key: Buffer.concat([wrap.iv, wrap.tag, wrap.ct]).toString("base64"),
      key_version: mk.current,
    };
  } finally {
    dataKey.fill(0);
  }
}

export function decryptSecret(mk: MasterKeys, ctx: SecretContext, env: Envelope): string {
  const master = mk.keys.get(env.key_version);
  if (!master) throw new VaultError(`master key version ${env.key_version} is not configured`);
  const associated = aad(ctx);
  try {
    const wrapped = Buffer.from(env.wrapped_key, "base64");
    const dataKey = open(master, wrapped.subarray(0, 12), wrapped.subarray(28), wrapped.subarray(12, 28), associated);
    const value = open(dataKey, Buffer.from(env.iv, "base64"), Buffer.from(env.ciphertext, "base64"), Buffer.from(env.auth_tag, "base64"), associated);
    dataKey.fill(0);
    return value.toString("utf8");
  } catch {
    throw new VaultError("secret could not be decrypted (wrong key, wrong project/name/environment, or tampered)");
  }
}

/** Re-encrypts under the current master key (rotation). */
export function rewrap(mk: MasterKeys, ctx: SecretContext, env: Envelope): Envelope {
  return env.key_version === mk.current ? env : encryptSecret(mk, ctx, decryptSecret(mk, ctx, env));
}

/**
 * Serialises variables as a .env file with injection-safe quoting: every
 * value is double-quoted with backslash, quote, newline, carriage return and
 * "$" (variable expansion) escaped. Invalid names and NUL bytes are refused.
 */
export function toDotenv(vars: Record<string, string>): string {
  const lines = ["# Written by Keelwork from the project's secrets vault. Do not commit."];
  for (const [name, value] of Object.entries(vars).sort(([a], [b]) => a.localeCompare(b))) {
    if (!ENV_NAME_RE.test(name)) throw new VaultError(`invalid variable name ${name}`);
    if (typeof value !== "string" || value.includes("\u0000")) throw new VaultError(`invalid value for ${name}`);
    const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\$/g, "\\$");
    lines.push(`${name}="${escaped}"`);
  }
  return lines.join("\n") + "\n";
}
