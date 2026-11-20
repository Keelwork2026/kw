/**
 * The project's own images: photos people upload and real screenshots of the
 * running app. Files live in the app at public/images and public/screenshots;
 * public/images/manifest.json records alt text and where each came from, so
 * agents can use them correctly. Nothing here fetches or invents images.
 */
export const MEDIA_DIRS = { upload: "public/images", screenshot: "public/screenshots" } as const;
export const MANIFEST = "public/images/manifest.json";
export const MAX_UPLOAD_BYTES = 1_500_000;
export const MAX_FILES = 60;

export type ImageType = "png" | "jpeg" | "webp" | "gif";
export type MediaEntry = { file: string; alt: string; source: "upload" | "screenshot"; width?: number; added: string; note?: string };

/** Detects the real format from the file's first bytes; SVG and anything else is refused (SVG can carry scripts). */
export function sniffImage(b: Uint8Array): ImageType | null {
  const at = (i: number, ...v: number[]) => v.every((x, j) => b[i + j] === x);
  if (b.length < 12) return null;
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (at(0, 0xff, 0xd8, 0xff)) return "jpeg";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "webp";
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return "gif";
  return null;
}

const EXT: Record<ImageType, string> = { png: "png", jpeg: "jpg", webp: "webp", gif: "gif" };

/** A safe, readable file name: lower-case words joined by dashes, with the extension the bytes deserve. */
export function safeName(original: string, type: ImageType, taken: string[] = []): string {
  const base = original.replace(/\.[a-z0-9]{1,5}$/i, "").normalize("NFKD").replace(/[^\w\s-]/g, "").trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "image";
  let name = `${base}.${EXT[type]}`;
  for (let i = 2; taken.includes(name); i++) name = `${base}-${i}.${EXT[type]}`;
  return name;
}

export function validateUpload(o: { bytes: Uint8Array; name: string; alt: string; rights: boolean }): { ok: true; type: ImageType } | { ok: false; error: string } {
  if (!o.rights) return { ok: false, error: "Confirm that you own this image or have permission to use it." };
  if (!o.bytes.length) return { ok: false, error: "Choose an image to upload." };
  if (o.bytes.length > MAX_UPLOAD_BYTES) return { ok: false, error: `That image is ${(o.bytes.length / 1_000_000).toFixed(1)} MB. The limit is 1.5 MB — export it smaller (2000 px wide is plenty) and try again.` };
  const type = sniffImage(o.bytes);
  if (!type) return { ok: false, error: "That file isn't a PNG, JPEG, WebP or GIF image. (SVG isn't accepted because it can contain scripts.)" };
  const alt = o.alt.trim();
  if (alt.length < 3) return { ok: false, error: "Describe the image in a few words (alt text) — people using screen readers rely on it." };
  if (alt.length > 200) return { ok: false, error: "Keep the description under 200 characters." };
  return { ok: true, type };
}

export function parseManifest(text: string | null | undefined): MediaEntry[] {
  if (!text) return [];
  try {
    const v = JSON.parse(text) as { images?: unknown };
    if (!Array.isArray(v.images)) return [];
    return v.images.filter((e): e is MediaEntry => !!e && typeof e === "object" && typeof (e as MediaEntry).file === "string" && typeof (e as MediaEntry).alt === "string" && /^(upload|screenshot)$/.test(String((e as MediaEntry).source))).slice(0, 500);
  } catch { return []; }
}

export function serializeManifest(entries: MediaEntry[]): string {
  return JSON.stringify({
    about: "Images for this app. Use these files with their alt text. Uploads were provided by the owner; screenshots are real captures of the app. Don't hotlink or invent other images; ask the owner to upload in Keelwork → Media.",
    images: entries,
  }, null, 2) + "\n";
}

/** Adds or replaces an entry (by file), newest first. */
export function upsertEntry(entries: MediaEntry[], e: MediaEntry): MediaEntry[] {
  return [e, ...entries.filter((x) => x.file !== e.file)];
}

/** Only files Media manages can be removed through it. */
export function isMediaPath(p: string): boolean {
  return /^public\/(images|screenshots)\/[a-z0-9][a-z0-9._-]{0,80}\.(png|jpg|webp|gif)$/.test(p) && !p.includes("..");
}

/** Pages to screenshot: app paths only, at most 6. */
export function parseShotPaths(input: string): string[] | null {
  const list = input.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  if (!list.length) return ["/"];
  if (list.length > 6) return null;
  for (const p of list) if (!/^\/[A-Za-z0-9/_\-.]*$/.test(p) || p.includes("..") || p.startsWith("//")) return null;
  return [...new Set(list)];
}

export function shotName(path: string, width: number): string {
  const slug = path.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "home";
  return `${slug.slice(0, 50)}-${width < 500 ? "mobile" : width < 1000 ? "tablet" : "desktop"}.png`;
}

export const VIEWPORTS: Record<string, number> = { desktop: 1440, tablet: 820, mobile: 390 };
