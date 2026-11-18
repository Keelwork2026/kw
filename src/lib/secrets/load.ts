import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, type MasterKeys, type Environment, type Envelope } from "./vault";

/**
 * Decrypts a project's secrets for one environment. Only trusted services
 * call this (the agent worker, the deploy service, the automation runner)
 * with a service-role client; values never travel to a browser.
 */
export async function decryptProjectSecrets(db: SupabaseClient, projectId: string, environment: Environment, keys: MasterKeys): Promise<Record<string, string>> {
  const { data, error } = await db.from("project_secrets")
    .select("name, environment, ciphertext, iv, auth_tag, wrapped_key, key_version")
    .eq("project_id", projectId).eq("environment", environment);
  if (error) throw new Error("couldn't load secrets");
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    out[row.name as string] = decryptSecret(keys, { projectId, name: row.name as string, environment }, row as unknown as Envelope);
  }
  return out;
}
