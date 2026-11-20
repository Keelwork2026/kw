import { CATALOG, CATALOG_CATEGORIES, PROJECT_TYPES, STYLES } from "@/lib/catalog";
import { siteBySlug } from "@/lib/sites";
import { starterBySlug } from "@/lib/site/starters";
import { appBySlug } from "@/lib/apps";
import { SiteThumb } from "@/components/sites/site-card";
import { AppThumb } from "@/components/apps/thumb";
import { TemplatePreview } from "@/components/site/template-preview";
import { TemplateGallery, type GalleryEntry } from "./gallery";

/** Server side of the gallery: draws every thumbnail once and hands the client plain data. */
export function CatalogGallery({ signedIn, usage }: { signedIn: boolean; usage?: Record<string, number> }) {
  const thumbs: Record<string, React.ReactNode> = {};
  for (const e of CATALOG) {
    const site = e.kind === "website" ? siteBySlug(e.slug) : undefined;
    const app = e.kind === "app" ? appBySlug(e.slug) : undefined;
    const starter = e.kind === "starter" ? starterBySlug(e.slug) : undefined;
    thumbs[e.slug] = site ? <SiteThumb site={site} /> : app ? <AppThumb app={app} /> : starter ? <TemplatePreview starter={starter} idSuffix={`-${e.slug}`} /> : null;
  }
  const entries: GalleryEntry[] = CATALOG.map(({ brief: _brief, ...rest }) => rest);
  return <TemplateGallery entries={entries} thumbs={thumbs} categories={CATALOG_CATEGORIES} types={PROJECT_TYPES} styles={STYLES} usage={usage && Object.keys(usage).length ? usage : undefined} signedIn={signedIn} />;
}
