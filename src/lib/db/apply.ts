import { createHash } from "node:crypto";
import { checkMigration } from "@/lib/agents/policy";
import { isPublicAddress, type Resolver } from "@/lib/import/safe-fetch";
import { splitStatements, stripComments } from "./schema";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type Risk = "additive" | "destructive" | "denied";

export function migrationRisk(sql: string): Risk {
  return checkMigration(sql).risk;
}

/** Statements that can't run inside the single transaction the applier uses. */
export function unsupportedReason(statement: string): string | null {
  const s = stripComments(statement).trim().toLowerCase().replace(/\s+/g, " ");
  if (/^(begin|start transaction|commit|end|rollback|savepoint|release)\b/.test(s)) return "transaction control is handled by Keelwork; remove it";
  if (/\bconcurrently\b/.test(s)) return "CONCURRENTLY can't run inside a transaction";
  if (/^(vacuum|cluster|reindex( database| system)?)\b/.test(s)) return `${s.split(" ")[0]!.toUpperCase()} can't run inside a transaction`;
  if (/^(create|drop|alter) (database|tablespace)\b/.test(s)) return "databases and tablespaces are managed by your provider";
  if (/^alter system\b/.test(s)) return "server settings are managed by your provider";
  if (/^copy\b.*\b(program|stdin|stdout)\b/.test(s)) return "COPY with PROGRAM/STDIN isn't supported";
  if (/^\\/.test(s)) return "psql meta-commands aren't SQL";
  if (/^alter type\b.*\badd value\b/.test(s)) return "ALTER TYPE … ADD VALUE needs its own transaction; put it in a separate migration file";
  return null;
}

export type StatementExplanation = { statement: string; explanation: string; risk: Risk; unsupported: string | null };

function explainOne(stmt: string): string {
  const s = stripComments(stmt).trim().replace(/\s+/g, " ");
  const name = (re: RegExp) => (re.exec(s)?.[1] ?? "").replace(/"/g, "").replace(/^public\./i, "");
  let m: RegExpExecArray | null;
  if (/^create (unlogged )?table/i.test(s)) return `Creates the table ${name(/table (?:if not exists )?("?[\w.]+"?)/i)}.`;
  if (/^alter table .* enable row level security/i.test(s)) return `Turns on row-level security for ${name(/alter table (?:only )?("?[\w.]+"?)/i)}: nobody sees rows unless a policy allows it.`;
  if (/^create policy/i.test(s)) return `Adds the access rule "${name(/create policy ("?[^"]+"?|\S+)/i)}" on ${name(/ on ("?[\w.]+"?)/i)}.`;
  if ((m = /^alter table (?:only )?("?[\w.]+"?) add (?:column )?(?:if not exists )?("?\w+"?)/i.exec(s))) return `Adds the column ${m[2]!.replace(/"/g, "")} to ${m[1]!.replace(/"/g, "").replace(/^public\./, "")}.`;
  if ((m = /^alter table (?:only )?("?[\w.]+"?) drop (?:column )?(?:if exists )?("?\w+"?)/i.exec(s))) return `Removes ${m[2]!.replace(/"/g, "")} from ${m[1]!.replace(/"/g, "").replace(/^public\./, "")} — its data is deleted.`;
  if (/^drop table/i.test(s)) return `Deletes the table ${name(/drop table (?:if exists )?("?[\w.]+"?)/i)} and all its rows.`;
  if (/^create (unique )?index/i.test(s)) return "Adds an index to speed up lookups.";
  if (/^create (or replace )?function/i.test(s)) return `Defines the function ${name(/function ("?[\w.]+"?)/i)}.`;
  if (/^create trigger/i.test(s)) return `Adds a trigger that runs automatically on changes.`;
  if (/^insert into/i.test(s)) return `Inserts rows into ${name(/insert into ("?[\w.]+"?)/i)}.`;
  if (/^update/i.test(s)) return /\bwhere\b/i.test(s) ? "Updates some rows." : "Updates every row of a table.";
  if (/^delete from/i.test(s)) return /\bwhere\b/i.test(s) ? "Deletes some rows." : "Deletes every row of a table.";
  if (/^truncate/i.test(s)) return "Empties a table.";
  if (/^grant/i.test(s)) return "Grants database privileges.";
  if (/^create type/i.test(s)) return "Defines a new type.";
  return "Runs a SQL statement.";
}

/** Plain-language explanation and risk per statement. */
export function explainMigration(sql: string): StatementExplanation[] {
  const statements = splitStatements(sql);
  // RLS for a new table may be enabled by a later statement in the same file.
  const rlsStatements = statements.filter((s) => /enable\s+row\s+level\s+security/i.test(s)).join(";\n");
  return statements.map((stmt) => {
    const creates = /^\s*create\s+(unlogged\s+)?table/i.test(stripComments(stmt));
    return {
      statement: stmt.length > 400 ? `${stmt.slice(0, 400)}…` : stmt,
      explanation: explainOne(stmt),
      risk: checkMigration(creates ? `${stmt};\n${rlsStatements}` : stmt).risk,
      unsupported: unsupportedReason(stmt),
    };
  });
}

export function checksum(sql: string): string {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

/** DATABASE_URL must be postgres:// and its host must resolve to public addresses only. */
export async function checkConnectionString(raw: string, resolver: Resolver = async (h) => lookup(h, { all: true, verbatim: true })): Promise<{ ok: true; host: string } | { ok: false; reason: string }> {
  let u: URL;
  try { u = new URL(raw); } catch { return { ok: false, reason: "DATABASE_URL is not a valid URL" }; }
  if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") return { ok: false, reason: "DATABASE_URL must start with postgres://" };
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host) return { ok: false, reason: "DATABASE_URL has no host" };
  let addrs: { address: string }[];
  try { addrs = isIP(host) ? [{ address: host }] : await resolver(host); } catch { return { ok: false, reason: `couldn't resolve ${host}` }; }
  if (!addrs.length) return { ok: false, reason: `couldn't resolve ${host}` };
  if (addrs.some((a) => !isPublicAddress(a.address))) return { ok: false, reason: `${host} resolves to a private address; Keelwork only connects to public database hosts` };
  return { ok: true, host };
}

/** Minimal client interface (satisfied by the postgres package's sql.begin / tx.unsafe). */
export type Tx = { unsafe: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]> };
export type SqlClient = { begin: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T> };

export const TARGET_LEDGER = "_keelwork_migrations";

/**
 * Applies one migration file to the project's own database, once, in a
 * transaction, with a ledger in the target database as well as in
 * project_migrations. Drift (same name, different checksum) and
 * double-apply are refused; unsupported statements are refused with a reason.
 */
export async function applyMigration(sql: SqlClient, file: { filename: string; content: string }): Promise<{ checksum: string }> {
  const sum = checksum(file.content);
  const risk = migrationRisk(file.content);
  if (risk === "denied") throw new Error(`refused: ${checkMigration(file.content).reasons.join("; ")}`);
  for (const stmt of splitStatements(file.content)) {
    const why = unsupportedReason(stmt);
    if (why) throw new Error(`unsupported statement: ${why}`);
  }
  await sql.begin(async (tx) => {
    await tx.unsafe(`create table if not exists public.${TARGET_LEDGER} (filename text primary key, checksum text not null, applied_at timestamptz not null default now())`);
    await tx.unsafe(`alter table public.${TARGET_LEDGER} enable row level security`);
    await tx.unsafe(`lock table public.${TARGET_LEDGER} in exclusive mode`);
    const rows = await tx.unsafe(`select checksum from public.${TARGET_LEDGER} where filename = $1`, [file.filename]);
    if (rows.length) {
      if (rows[0]!.checksum !== sum) throw new Error(`drift: ${file.filename} was applied with different contents`);
      throw new Error(`${file.filename} was already applied to this database`);
    }
    await tx.unsafe(file.content);
    await tx.unsafe(`insert into public.${TARGET_LEDGER}(filename, checksum) values ($1, $2)`, [file.filename, sum]);
  });
  return { checksum: sum };
}
