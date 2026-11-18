"use server";
import { revalidatePath } from "next/cache";
import { loadProject } from "@/lib/project";
import { brokerConfig, createBrokerClient, sandboxIdFor } from "@/lib/sandbox/client";
import { createServiceClient } from "@/lib/supabase/server";
import { loadMasterKeys, type Environment } from "@/lib/secrets/vault";
import { decryptProjectSecrets } from "@/lib/secrets/load";
import { applyMigration, checkConnectionString, checksum, migrationRisk, type SqlClient } from "@/lib/db/apply";
import { migrationsDirFor, isBackend } from "@/lib/stack/backends";
import type { ActionResult } from "@/components/action-form";

/**
 * A person applies one pending migration to the project's own database
 * (DATABASE_URL from the vault), once, in a transaction, recorded in both
 * ledgers. Destructive migrations need the file name typed to confirm.
 */
export async function applyPendingMigration(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const filename = String(form.get("filename") ?? "");
  const environment = String(form.get("environment") ?? "production") as Environment;
  const confirmation = String(form.get("confirmation") ?? "") || null;
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,150}\.sql$/.test(filename)) return { ok: false, message: "Invalid migration file." };
  if (!["development", "preview", "production"].includes(environment)) return { ok: false, message: "Choose an environment." };
  const { supabase, project, can } = await loadProject(String(form.get("projectId") ?? ""));
  if (!can("project.manage")) return { ok: false, message: "Only owners and admins can apply migrations." };
  const dir = isBackend(project.backend) ? migrationsDirFor(project.backend) : null;
  if (!dir) return { ok: false, message: "This backend has no SQL migrations." };
  const cfg = brokerConfig();
  if (!cfg) return { ok: false, message: "The sandbox service isn't connected, so migration files can't be read." };
  let keys;
  try { keys = loadMasterKeys(process.env.SECRETS_MASTER_KEYS); } catch { keys = null; }
  if (!keys) return { ok: false, message: "The vault isn't configured, so DATABASE_URL can't be read." };

  const content = await createBrokerClient(cfg).readFile(sandboxIdFor(project.id), `${dir}/${filename}`).catch(() => null);
  if (content === null) return { ok: false, message: "That migration file couldn't be read from the sandbox." };
  const risk = migrationRisk(content);
  if (risk === "denied") return { ok: false, message: "This migration is refused by policy (see the explanation). Write a new one." };

  const secrets = await decryptProjectSecrets(createServiceClient(), project.id, environment, keys);
  const url = secrets.DATABASE_URL;
  if (!url) return { ok: false, message: `Add DATABASE_URL for ${environment} on the Secrets tab first.` };
  const conn = await checkConnectionString(url);
  if (!conn.ok) return { ok: false, message: conn.reason };

  const { data: attempt, error } = await supabase.rpc("request_migration_apply", { p_project: project.id, p_filename: filename, p_checksum: checksum(content), p_risk: risk, p_confirmation: confirmation });
  if (error) return { ok: false, message: error.message };

  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 10, prepare: false, ssl: "require" });
  try {
    await applyMigration(sql as unknown as SqlClient, { filename, content });
    await supabase.rpc("complete_migration_apply", { p_attempt: attempt, p_ok: true });
    revalidatePath(`/projects/${project.id}/database`);
    return { ok: true, message: `${filename} was applied to the ${environment} database.` };
  } catch (e) {
    const message = (e as Error).message.replace(url, "[DATABASE_URL]").slice(0, 500);
    await supabase.rpc("complete_migration_apply", { p_attempt: attempt, p_ok: false, p_error: message });
    return { ok: false, message: `Not applied: ${message}` };
  } finally {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}
