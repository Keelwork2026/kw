/**
 * The policy engine. Every tool call an agent makes is decided here before
 * it runs: allow, require_approval (a person must say yes) or deny. Unknown
 * tools and malformed arguments are denied. The sandbox broker re-checks
 * paths and commands with the same functions as defence in depth.
 */

export type Decision =
  | { decision: "allow"; reason?: string }
  | { decision: "require_approval"; reason: string; approvalKind: ApprovalKind; details?: Record<string, unknown> }
  | { decision: "deny"; reason: string };

export type ApprovalKind =
  | "install_package" | "publish_code" | "discard_changes" | "destructive_migration" | "delete_file"
  | "send_message" | "deploy_production" | "fetch_host" | "secret_request" | "reset_database";

export type ToolCall = { tool: string; args: unknown };
export type PolicyContext = {
  /** Packages a person approved before for this project. */
  approvedPackages?: ReadonlySet<string>;
  /** Hosts a person approved before for net.fetch. */
  approvedHosts?: ReadonlySet<string>;
};

export const TOOLS = [
  "fs.list", "fs.read", "fs.write", "fs.delete", "shell.run", "db.migrate", "net.fetch", "web.search",
  "secrets.request", "message.send", "deploy",
] as const;

const allow = (reason?: string): Decision => ({ decision: "allow", reason });
const deny = (reason: string): Decision => ({ decision: "deny", reason });
const ask = (approvalKind: ApprovalKind, reason: string, details?: Record<string, unknown>): Decision =>
  ({ decision: "require_approval", approvalKind, reason, details });

// ---------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------

/** Returns a reason when the path is not acceptable, or null when it is. */
export function checkPath(path: unknown, opts: { write?: boolean } = {}): string | null {
  if (typeof path !== "string") return "path must be text";
  if (path.length < 1 || path.length > 300) return "path must be 1-300 characters";
  if (/[\u0000-\u001f\u007f]/.test(path)) return "path contains control characters";
  if (path.includes("\\")) return "path contains a backslash";
  if (path.startsWith("/") || /^[a-zA-Z]:/.test(path) || path.startsWith("~")) return "absolute paths are not allowed";
  const segments = path.split("/");
  if (path !== "." && segments.some((s) => s === "" || s === "." || s === "..")) return "path has empty, '.' or '..' segments";
  if (segments.some((s) => s.toLowerCase() === ".git")) return ".git is off limits";
  const base = segments.at(-1)!.toLowerCase();
  if (base.startsWith(".env") && base !== ".env.example") return "env files hold secrets; use secrets.request instead";
  if (opts.write && (segments[0] === "node_modules" || segments[0] === ".next")) return `${segments[0]} is generated; don't write to it`;
  return null;
}

/** .gitignore writes must keep env files ignored. */
export function gitignoreKeepsEnvIgnored(content: string): boolean {
  const lines = content.split(/\r?\n/).map((l) => l.trim());
  const ignoresAll = lines.includes(".env*") || (lines.includes(".env") && (lines.includes(".env.*") || lines.includes(".env*.local")));
  const unignores = lines.some((l) => l.startsWith("!.env") && l !== "!.env.example");
  return ignoresAll && !unignores;
}

// ---------------------------------------------------------------------
// Commands (argv only)
// ---------------------------------------------------------------------

const META = /[;&|$<>`\n\r]/;
const PKG_RE = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(@[a-zA-Z0-9.^~<>=*_-]+)?$/;
const RUN_SCRIPTS = new Set(["build", "lint", "typecheck", "test", "test:e2e", "format", "dev"]);
const NPX_TOOLS = new Set(["tsc", "eslint", "prettier", "vitest", "jest", "playwright", "next"]);
const GIT_SUBCOMMANDS = new Set(["init", "status", "diff", "add", "commit", "log", "show", "restore", "checkout", "branch", "ls-files", "rev-parse"]);
const GIT_RISKY_OPTS = /^--(output|upload-pack|receive-pack|exec|ext-diff|textconv|config|git-dir|work-tree|namespace|super-prefix)(=|$)/;

export function packageName(spec: string): string {
  const at = spec.lastIndexOf("@");
  return at > 0 ? spec.slice(0, at) : spec;
}

export function checkCommand(argv: unknown, ctx: PolicyContext = {}): Decision {
  if (!Array.isArray(argv) || argv.length === 0 || !argv.every((a) => typeof a === "string")) return deny("argv must be a non-empty list of strings");
  if (argv.length > 40) return deny("at most 40 arguments");
  if (argv.some((a: string) => a.length > 1000)) return deny("argument too long");
  if (argv.some((a: string) => META.test(a))) return deny("shell metacharacters are not allowed; commands run without a shell");
  const [cmd, ...rest] = argv as string[];

  switch (cmd) {
    case "pnpm":
    case "npm":
      return checkPackageManager(cmd, rest, ctx);
    case "npx":
      return checkNpx(rest);
    case "git":
      return checkGit(rest);
    case "node":
      return checkNode(rest);
    default:
      return deny(`${cmd} is not an allowed command`);
  }
}

function checkPackageManager(cmd: string, rest: string[], ctx: PolicyContext): Decision {
  const [sub, ...args] = rest;
  if ((sub === "install" || sub === "i") && args.length === 0) return allow();
  const adding = sub === "add" || (cmd === "npm" && (sub === "install" || sub === "i"));
  if (adding) {
    const flags = args.filter((a) => a.startsWith("-"));
    const pkgs = args.filter((a) => !a.startsWith("-"));
    if (flags.some((f) => !["-D", "--save-dev", "-E", "--save-exact", "--save-prod", "-P"].includes(f))) return deny("unsupported install flag");
    if (pkgs.length === 0) return deny("name the packages to add");
    for (const p of pkgs) if (!PKG_RE.test(p)) return deny(`not a package name: ${p}`);
    const fresh = pkgs.filter((p) => !ctx.approvedPackages?.has(packageName(p)));
    if (fresh.length === 0) return allow("packages approved before");
    return ask("install_package", `Install ${fresh.map(packageName).join(", ")}`, { packages: fresh.map(packageName) });
  }
  if (sub === "audit") {
    const ok = args.every((a) => a === "--json" || a === "--prod" || a === "--dev" || /^--audit-level=(low|moderate|high|critical)$/.test(a));
    return ok ? allow() : deny("only read-only audit flags are allowed");
  }
  if (sub === "run") {
    const [script, ...extra] = args;
    if (!script || !RUN_SCRIPTS.has(script)) return deny(`script ${script ?? "(none)"} is not allowed`);
    if (extra.length > 0) return deny("extra arguments to scripts are not allowed");
    return allow();
  }
  return deny(`${cmd} ${sub ?? ""} is not allowed`.trim());
}

function checkNpx(rest: string[]): Decision {
  const [tool, ...args] = rest;
  if (!tool || tool.startsWith("-")) return deny("npx flags are not allowed");
  if (tool === "appwrite") return deny("the Appwrite CLI is not available to agents");
  if (NPX_TOOLS.has(tool)) {
    if (args.some((a) => /^--(require|import|loader|eval)\b/.test(a) || a === "-e")) return deny("code-loading flags are not allowed");
    return allow();
  }
  if (tool === "supabase") {
    if (args[0] !== "db") return deny("only supabase db commands are allowed");
    if (args[1] === "reset") return ask("reset_database", "Reset the development database (deletes its data)");
    return allow();
  }
  if (tool === "opennextjs-cloudflare") {
    return args.length === 1 && args[0] === "build" ? allow() : deny("only opennextjs-cloudflare build is allowed");
  }
  if (tool === "wrangler") {
    if (args.length === 4 && args[0] === "deploy" && args[1] === "--dry-run" && args[2] === "--outdir" && checkPath(args[3], { write: true }) === null) return allow();
    return deny("only wrangler deploy --dry-run --outdir <folder> is allowed");
  }
  return deny(`npx ${tool} is not allowed`);
}

function checkGit(rest: string[]): Decision {
  let i = 0;
  while (i < rest.length && rest[i]!.startsWith("-")) {
    if (rest[i] === "-c") {
      const setting = rest[i + 1] ?? "";
      if (!/^user\.(name|email)=[^\n]{0,200}$/.test(setting)) return deny("git -c may set only user.name or user.email");
      i += 2;
    } else {
      return deny(`git option ${rest[i]} is not allowed`);
    }
  }
  const sub = rest[i];
  const args = rest.slice(i + 1);
  if (!sub) return deny("git needs a subcommand");
  if (args.some((a) => GIT_RISKY_OPTS.test(a))) return deny("that git option is not allowed");
  if (sub === "push") return ask("publish_code", "Push code to a remote repository");
  if (sub === "reset" || sub === "clean") return ask("discard_changes", `git ${sub} discards work`);
  if (sub === "checkout" && args.some((a) => a === "--force" || a === "-f")) return ask("discard_changes", "git checkout --force discards work");
  if (!GIT_SUBCOMMANDS.has(sub)) return deny(`git ${sub} is not allowed`);
  return allow();
}

function checkNode(rest: string[]): Decision {
  if (rest[0] === "--test") {
    const files = rest.slice(1);
    if (files.length === 0) return deny("name the test files");
    for (const f of files) {
      const why = checkPath(f);
      if (why || f.startsWith("-")) return deny(`bad test file ${f}: ${why ?? "flags are not allowed"}`);
    }
    return allow();
  }
  if (rest.length !== 1 || rest[0]!.startsWith("-")) return deny("only node <script> or node --test <files> is allowed");
  const why = checkPath(rest[0]);
  return why ? deny(why) : allow();
}

// ---------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------

/** Lower-cases SQL and strips comments and string literals (incl. dollar quotes). */
export function normalizeSql(sql: string): string {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const c = sql[i]!, n = sql[i + 1];
    if (c === "-" && n === "-") { while (i < sql.length && sql[i] !== "\n") i++; out += " "; continue; }
    if (c === "/" && n === "*") {
      let depth = 1; i += 2;
      while (i < sql.length && depth > 0) {
        if (sql[i] === "/" && sql[i + 1] === "*") { depth++; i += 2; }
        else if (sql[i] === "*" && sql[i + 1] === "/") { depth--; i += 2; }
        else i++;
      }
      out += " "; continue;
    }
    if (c === "'") {
      i++;
      while (i < sql.length) { if (sql[i] === "'" && sql[i + 1] === "'") { i += 2; continue; } if (sql[i] === "'") { i++; break; } i++; }
      out += "''"; continue;
    }
    if (c === "$") {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        i = end < 0 ? sql.length : end + tag.length;
        out += " $$ "; continue;
      }
    }
    out += c; i++;
  }
  return out.toLowerCase().replace(/\s+/g, " ").trim();
}

const PLATFORM = "(?:auth|storage|extensions|pg_catalog|information_schema|keelwork)";
const Q = '"?';

export type MigrationVerdict = { risk: "additive" | "destructive" | "denied"; reasons: string[] };

export function checkMigration(sql: unknown): MigrationVerdict {
  if (typeof sql !== "string" || sql.trim().length === 0) return { risk: "denied", reasons: ["empty migration"] };
  if (sql.length > 200_000) return { risk: "denied", reasons: ["migration is larger than 200 KB"] };
  const norm = normalizeSql(sql);
  const statements = norm.split(";").map((s) => s.trim()).filter(Boolean);
  const denied: string[] = [];
  const destructive: string[] = [];

  for (const s of statements) {
    if (/\bdisable row level security\b/.test(s) || /\bno force row level security\b/.test(s)) denied.push("disables row level security");
    if (/\b(create|alter|drop) (role|user|group)\b/.test(s)) denied.push("creates or changes database roles");
    if (/\bgrant\b.*\bto (public|anon)\b/.test(s)) denied.push("grants to public or anon");
    if (/\bsecurity definer\b/.test(s) && /\bsearch_path\s*(=|to)\s*("?public"?|"\$user")/.test(s)) denied.push("SECURITY DEFINER with search_path = public");
    const platform = new RegExp(
      `\\b(create|alter|drop|comment on)( or replace)? (table|view|materialized view|function|procedure|type|sequence|index|schema|trigger|extension|domain|policy)( if (not )?exists)? ${Q}${PLATFORM}\\b` +
      `|\\b(insert into|update|delete from|truncate( table)?)( only)? ${Q}${PLATFORM}${Q}\\.` +
      `|\\b(create|alter|drop) (index|trigger|policy|rule)\\b.* on( only)? ${Q}${PLATFORM}${Q}\\.` +
      `|\\b(grant|revoke)\\b.* on (schema |all tables in schema |all functions in schema )?${Q}${PLATFORM}\\b` +
      `|\\balter default privileges in schema ${Q}${PLATFORM}\\b` +
      `|\\balter table( if exists)?( only)? ${Q}${PLATFORM}${Q}\\.`,
    );
    if (platform.test(s)) denied.push("changes a platform schema (auth, storage, extensions, pg_catalog, information_schema or keelwork)");

    if (/^drop\b/.test(s)) destructive.push("drops an object");
    if (/^alter table\b.*\bdrop\b/.test(s)) destructive.push("drops a column or constraint");
    if (/^truncate\b/.test(s)) destructive.push("truncates a table");
    if (/^delete from\b/.test(s) && !/\bwhere\b/.test(s)) destructive.push("deletes every row");
    if (/^update\b.*\bset\b/.test(s) && !/\bwhere\b/.test(s)) destructive.push("updates every row");
    if (/\brename\b/.test(s)) destructive.push("renames an object");
    if (/^alter table\b.*\balter( column)? [a-z_"][a-z0-9_"]* (set data )?type\b/.test(s)) destructive.push("changes a column type");
  }

  const tableName = (raw: string) => raw.replace(/"/g, "").replace(/^public\./, "");
  const created = [...norm.matchAll(/\bcreate (?:unlogged )?table (?:if not exists )?("?[a-z0-9_]+"?(?:\."?[a-z0-9_]+"?)?)/g)].map((m) => tableName(m[1]!));
  const rls = new Set([...norm.matchAll(/\balter table (?:if exists )?(?:only )?("?[a-z0-9_]+"?(?:\."?[a-z0-9_]+"?)?) enable row level security/g)].map((m) => tableName(m[1]!)));
  for (const t of created) if (!rls.has(t)) denied.push(`table ${t} is created without enabling row level security in the same migration`);

  if (denied.length) return { risk: "denied", reasons: [...new Set(denied)] };
  if (destructive.length) return { risk: "destructive", reasons: [...new Set(destructive)] };
  return { risk: "additive", reasons: [] };
}

// ---------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------

export const DOC_HOSTS = new Set([
  "registry.npmjs.org", "nodejs.org", "nextjs.org", "react.dev", "supabase.com", "developer.mozilla.org", "postgresql.org",
  "appwrite.io", "docs.cloudbase.net", "cloud.tencent.com", "developers.cloudflare.com", "opennext.js.org", "tailwindcss.com",
  "motion.dev", "threejs.org", "r3f.docs.pmnd.rs", "docs.docker.com", "platform.kimi.ai", "api-docs.deepseek.com",
]);

export function checkUrl(url: unknown, ctx: PolicyContext = {}): Decision {
  if (typeof url !== "string" || url.length > 2048) return deny("url must be text of at most 2048 characters");
  let u: URL;
  try { u = new URL(url); } catch { return deny("not a URL"); }
  if (u.protocol !== "https:") return deny("only https URLs can be fetched");
  if (u.username || u.password) return deny("credentials in URLs are not allowed");
  if (u.port && u.port !== "443") return deny("only the default https port is allowed");
  const host = u.hostname.toLowerCase();
  if (/^[\d.]+$/.test(host) || host.startsWith("[")) return deny("IP-address URLs are not allowed");
  if (DOC_HOSTS.has(host) || ctx.approvedHosts?.has(host)) return allow();
  return ask("fetch_host", `Fetch from ${host}`, { host });
}

// ---------------------------------------------------------------------
// decide()
// ---------------------------------------------------------------------

function obj(args: unknown): Record<string, unknown> | null {
  return args && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : null;
}

export function decide(call: ToolCall, ctx: PolicyContext = {}): Decision {
  const a = obj(call.args);
  if (!a) return deny("arguments must be an object");
  switch (call.tool) {
    case "fs.list": {
      const why = checkPath(a.path ?? ".");
      return why ? deny(why) : allow();
    }
    case "fs.read": {
      const why = checkPath(a.path);
      return why ? deny(why) : allow();
    }
    case "fs.write": {
      const why = checkPath(a.path, { write: true });
      if (why) return deny(why);
      if (typeof a.content !== "string") return deny("content must be text");
      if (a.content.length > 1_000_000) return deny("files are limited to 1 MB");
      if ((a.path as string).split("/").at(-1) === ".gitignore" && !gitignoreKeepsEnvIgnored(a.content)) {
        return deny(".gitignore must keep env files ignored (.env* with only !.env.example allowed)");
      }
      return allow();
    }
    case "fs.delete": {
      const why = checkPath(a.path, { write: true });
      if (why) return deny(why);
      return ask("delete_file", `Delete ${a.path as string}`, { path: a.path });
    }
    case "shell.run":
      return checkCommand(a.argv, ctx);
    case "db.migrate": {
      const v = checkMigration(a.sql);
      if (v.risk === "denied") return deny(v.reasons.join("; "));
      if (v.risk === "destructive") return ask("destructive_migration", `Destructive migration: ${v.reasons.join("; ")}`, { reasons: v.reasons });
      return allow();
    }
    case "net.fetch":
      return checkUrl(a.url, ctx);
    case "web.search": {
      if (typeof a.query !== "string" || a.query.trim().length < 1 || a.query.length > 400) return deny("query must be 1-400 characters");
      return allow("bounded and metered");
    }
    case "secrets.request": {
      if (typeof a.name !== "string" || !/^[A-Z][A-Z0-9_]{1,63}$/.test(a.name)) return deny("secret names look like STRIPE_SECRET_KEY");
      if (typeof a.reason !== "string" || a.reason.trim().length < 5 || a.reason.length > 300) return deny("say why the secret is needed (5-300 characters)");
      return ask("secret_request", `Provide ${a.name}: ${a.reason.trim()}`, { name: a.name });
    }
    case "message.send": {
      if (typeof a.text !== "string" || !a.text.trim() || a.text.length > 4000) return deny("message text must be 1-4000 characters");
      return ask("send_message", "Send a message on your behalf", { preview: a.text.slice(0, 200) });
    }
    case "deploy": {
      if (a.environment === "preview") return allow();
      if (a.environment === "production") return ask("deploy_production", "Deploy to production");
      return deny("environment must be preview or production");
    }
    default:
      return deny(`unknown tool ${call.tool}`);
  }
}

// ---------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------

const SECRET_KEY_NAME = /(key|token|secret|password|passwd|authorization|cookie|credential)/i;
const SECRET_VALUE = /(sk-[A-Za-z0-9_-]{16,}|sk_(live|test)_[A-Za-z0-9]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}|re_[A-Za-z0-9]{16,}|postgres(ql)?:\/\/[^:\s]+:[^@\s]+@)/;

/** Masks secret-looking values before a tool call is logged. */
export function redactArgs(value: unknown, keyName = ""): unknown {
  if (typeof value === "string") {
    if (SECRET_KEY_NAME.test(keyName) && value.length > 0) return "[redacted]";
    return SECRET_VALUE.test(value) ? value.replace(new RegExp(SECRET_VALUE.source, "g"), "[redacted]") : value;
  }
  if (Array.isArray(value)) return value.map((v) => redactArgs(v, keyName));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redactArgs(v, k)]));
  }
  return value;
}

export function containsRedaction(value: unknown): boolean {
  return JSON.stringify(value ?? null).includes("[redacted]");
}
