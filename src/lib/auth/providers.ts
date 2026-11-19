/**
 * Which sign-in providers the auth pages offer. AUTH_PROVIDERS is a comma
 * list of google, azure, github; unset means all three (they're enabled in
 * supabase/config.toml), and an empty value means email only. Providers
 * that aren't configured in Supabase would only fail after a redirect, so
 * installations without OAuth apps set AUTH_PROVIDERS= to hide them.
 */
export const OAUTH_PROVIDERS = ["google", "azure", "github"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export function enabledProviders(value: string | undefined): OAuthProvider[] {
  if (value === undefined) return [...OAUTH_PROVIDERS];
  const wanted = new Set(value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
  return OAUTH_PROVIDERS.filter((p) => wanted.has(p));
}
