import { createHash } from "node:crypto";

export type SecretFinding = {
  rule: string; severity: "critical" | "high" | "medium"; title: string;
  file: string; line: number; masked: string; fingerprint: string; isCredential: true; hint: string;
};

type Rule = { id: string; title: string; severity: SecretFinding["severity"]; re: RegExp; hint: string };

const RULES: Rule[] = [
  { id: "private-key", title: "Private key", severity: "critical", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g, hint: "Remove the key, rotate it, and load it from a secret." },
  { id: "aws-access-key", title: "AWS access key", severity: "critical", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, hint: "Deactivate the key in AWS IAM and use a secret instead." },
  { id: "stripe-live-key", title: "Stripe live secret key", severity: "critical", re: /\b(?:sk|rk)_live_[0-9A-Za-z]{10,}\b/g, hint: "Roll the key in the Stripe dashboard; keep it in the Secrets tab." },
  { id: "stripe-test-key", title: "Stripe test secret key", severity: "medium", re: /\b(?:sk|rk)_test_[0-9A-Za-z]{10,}\b/g, hint: "Test keys still grant API access; move it to the Secrets tab." },
  { id: "github-token", title: "GitHub token", severity: "critical", re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/g, hint: "Revoke the token on GitHub." },
  { id: "slack-token", title: "Slack token", severity: "high", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g, hint: "Revoke the token in Slack." },
  { id: "slack-webhook", title: "Slack webhook URL", severity: "high", re: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]{20,}/g, hint: "Regenerate the webhook; store it as SLACK_WEBHOOK_URL." },
  { id: "google-api-key", title: "Google API key", severity: "high", re: /\bAIza[0-9A-Za-z_-]{35}\b/g, hint: "Restrict or regenerate the key in Google Cloud." },
  { id: "anthropic-key", title: "Anthropic API key", severity: "critical", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g, hint: "Revoke the key in the Anthropic console." },
  { id: "openai-key", title: "OpenAI API key", severity: "critical", re: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}\b/g, hint: "Revoke the key in the OpenAI dashboard." },
  { id: "resend-key", title: "Resend API key", severity: "high", re: /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}\b/g, hint: "Revoke the key in Resend." },
  { id: "database-url", title: "Database URL with a password", severity: "critical", re: /\bpostgres(?:ql)?:\/\/[^:\s/@'"]+:[^@\s'"]{3,}@[^\s'"]+/g, hint: "Change the database password; store DATABASE_URL as a secret." },
  { id: "supabase-service-role", title: "Supabase service-role key", severity: "critical", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, hint: "Rotate the JWT secret / service key in Supabase." },
  { id: "hardcoded-secret", title: "Hard-coded secret", severity: "high", re: /\b(?:api[_-]?key|secret|password|passwd|token|auth[_-]?token|client[_-]?secret)\b["']?\s*[:=]\s*["']([^"'\s]{12,})["']/gi, hint: "Move the value to a secret and read it from process.env." },
];

export function mask(s: string): string {
  if (s.length <= 8) return "•".repeat(s.length);
  return `${s.slice(0, 4)}${"•".repeat(Math.min(12, s.length - 8))}${s.slice(-4)}`;
}

function fingerprint(rule: string, file: string, secret: string): string {
  return createHash("sha256").update(`${rule}|${file}|${createHash("sha256").update(secret).digest("hex")}`).digest("hex").slice(0, 32);
}

function isServiceRoleJwt(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString("utf8"));
    return payload?.role === "service_role";
  } catch { return false; }
}

const PLACEHOLDER = /^(x+|\*+|\.\.\.|your[_-]|example|changeme|placeholder|<|\$\{|process\.env|env\()/i;
/** Documented example URLs like postgres://user:password@host/db are not credentials. */
const EXAMPLE_DB_URL = /^postgres(?:ql)?:\/\/(user|username|postgres):(password|pass|secret)@(host|localhost|db)(?=[:/])/i;

/** Scans one file. Exact vault values (knownValues) are always flagged. */
export function scanText(file: string, content: string, knownValues: readonly string[] = []): SecretFinding[] {
  if (content.length > 2_000_000 || content.includes("\u0000")) return [];
  const out: SecretFinding[] = [];
  const lineOf = (idx: number) => content.slice(0, idx).split("\n").length;
  const seen = new Set<string>();
  const push = (rule: Rule | { id: string; title: string; severity: SecretFinding["severity"]; hint: string }, secret: string, idx: number) => {
    const fp = fingerprint(rule.id, file, secret);
    if (seen.has(fp)) return;
    seen.add(fp);
    out.push({ rule: rule.id, severity: rule.severity, title: rule.title, file, line: lineOf(idx), masked: mask(secret), fingerprint: fp, isCredential: true, hint: rule.hint });
  };
  for (const rule of RULES) {
    for (const m of content.matchAll(rule.re)) {
      const secret = rule.id === "hardcoded-secret" ? m[1]! : m[0];
      if (rule.id === "hardcoded-secret" && PLACEHOLDER.test(secret)) continue;
      if (rule.id === "database-url" && EXAMPLE_DB_URL.test(secret)) continue;
      if (rule.id === "supabase-service-role" && !isServiceRoleJwt(secret)) continue;
      push(rule, secret, m.index!);
    }
  }
  for (const v of knownValues) {
    if (!v || v.length < 8) continue;
    const idx = content.indexOf(v);
    if (idx >= 0) push({ id: "vault-value", title: "A value from this project's secrets vault", severity: "critical", hint: "Remove it from the code and rotate it; the app reads it from the environment." }, v, idx);
  }
  return out;
}

/** Committed env files are findings in themselves (only .env.example is allowed). */
export function trackedEnvFiles(paths: readonly string[]): SecretFinding[] {
  return paths.filter((p) => { const base = p.split("/").pop()!; return base.startsWith(".env") && base !== ".env.example"; }).map((p) => ({
    rule: "committed-env-file", severity: "critical" as const, title: "Committed env file", file: p, line: 1, masked: p,
    fingerprint: fingerprint("committed-env-file", p, p), isCredential: true as const, hint: "Delete the file from Git, rotate every value in it, and use the Secrets tab.",
  }));
}

export function scanFiles(files: readonly { path: string; content: string }[], knownValues: readonly string[] = []): SecretFinding[] {
  return [...trackedEnvFiles(files.map((f) => f.path)), ...files.flatMap((f) => scanText(f.path, f.content, knownValues))];
}
