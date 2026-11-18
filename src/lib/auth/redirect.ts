/**
 * Validates a post-auth redirect target. Only same-site absolute paths are
 * allowed: "/projects/1" is fine; "//evil.com", "/\\evil.com",
 * "https://evil.com" and anything with control characters fall back.
 */
export function safeRedirectPath(input: unknown, fallback = "/dashboard"): string {
  if (typeof input !== "string") return fallback;
  const value = input.trim();
  if (value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  try {
    const parsed = new URL(value, "https://keelwork.invalid");
    if (parsed.origin !== "https://keelwork.invalid") return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}

/** Carries ?prompt= and ?template= from sign-up into the first project. */
export function onboardingParams(input: { prompt?: unknown; template?: unknown }) {
  const out: { prompt?: string; template?: string } = {};
  if (typeof input.prompt === "string" && input.prompt.trim()) out.prompt = input.prompt.trim().slice(0, 2000);
  if (typeof input.template === "string" && /^[a-z0-9-]{1,48}$/.test(input.template)) out.template = input.template;
  return out;
}
