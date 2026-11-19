import "server-only";
import { signPreviewToken, previewOriginFor } from "./token";

/** A one-hour signed link into the project's live preview, or null when previews aren't configured. */
export function previewLinkFor(projectId: string, next = "/"): { url: string; origin: string } | null {
  const secret = process.env.PREVIEW_SECRET;
  const base = process.env.PREVIEW_BASE_DOMAIN;
  if (!secret || !base) return null;
  const origin = previewOriginFor(projectId, base);
  const token = signPreviewToken(secret, projectId);
  return { url: `${origin}/__kw/enter?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`, origin };
}
