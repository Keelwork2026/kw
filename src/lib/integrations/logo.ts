import { INTEGRATIONS } from "./catalog";

/** Largest logo the proxy will pass on. Favicons are a few KB. */
export const MAX_LOGO_BYTES = 100_000;

/** The upstream icon URL for a connector id, or null. Only ids in the catalog are ever fetched. */
export function logoSource(id: string): string | null {
  const i = INTEGRATIONS.find((x) => x.id === id);
  if (!i?.logo || !i.logo.startsWith("https://")) return null;
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(i.logo)}`;
}

/** Identifies a raster image by its first bytes. SVG is refused: it can carry script. */
export function sniffImage(b: Uint8Array): string | null {
  const at = (...xs: number[]) => xs.every((x, k) => b[k] === x);
  if (at(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (at(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (at(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (at(0x00, 0x00, 0x01, 0x00)) return "image/x-icon";
  return null;
}
