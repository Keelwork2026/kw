import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptSecret, loadMasterKeys, SECRET_NAME_RE, ENVIRONMENTS, type Environment, VaultError } from "./vault";

export function vaultReady(): boolean {
  try { return loadMasterKeys(process.env.SECRETS_MASTER_KEYS) !== null; } catch { return false; }
}

/**
 * Encrypts on the server, then stores through set_project_secret as the
 * signed-in person (which checks secret.manage and audits by name only).
 */
export async function storeSecret(input: { supabase: SupabaseClient; projectId: string; name: string; environment: string; value: string }): Promise<{ ok: true } | { ok: false; message: string }> {
  let keys;
  try { keys = loadMasterKeys(process.env.SECRETS_MASTER_KEYS); } catch (e) { return { ok: false, message: (e as Error).message }; }
  if (!keys) return { ok: false, message: "Secrets can't be added: this installation has no SECRETS_MASTER_KEYS." };
  if (!SECRET_NAME_RE.test(input.name)) return { ok: false, message: "Secret names look like STRIPE_SECRET_KEY (capitals, digits, underscores)." };
  if (!ENVIRONMENTS.includes(input.environment as Environment)) return { ok: false, message: "Choose an environment." };
  try {
    const envelope = encryptSecret(keys, { projectId: input.projectId, name: input.name, environment: input.environment as Environment }, input.value);
    const { error } = await input.supabase.rpc("set_project_secret", { p_project: input.projectId, p_name: input.name, p_environment: input.environment, p_envelope: envelope });
    if (error) return { ok: false, message: /permission/.test(error.message) ? "Only owners and admins can change secrets." : error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof VaultError ? e.message : "Couldn't encrypt the secret." };
  }
}
