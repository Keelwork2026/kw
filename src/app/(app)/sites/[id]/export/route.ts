import { createElement } from "react";
import { requireOrg } from "@/lib/org";
import { SiteDocument } from "@/components/sites/render";
import { createZip } from "@/lib/export/zip";
import { plain } from "@/lib/sites/text";
import { slugify } from "@/lib/sites/engine/generate";
import type { Page, Site } from "@/lib/sites/types";

/**
 * Static HTML export: one folder per page with an index.html, ready for any
 * static host. Forms are plain HTML forms to connect to a form service.
 */
type Render = (el: ReturnType<typeof createElement>) => string;

/**
 * react-dom/server is loaded at run time from node_modules (Next forbids
 * bundling it into app routes). The static export renders no client
 * components, so a plain server render is all it needs.
 */
async function renderer(): Promise<Render> {
  const mod = (await import(/* webpackIgnore: true */ "react-dom/server")) as { renderToStaticMarkup: Render };
  return mod.renderToStaticMarkup;
}

function html(site: Site, page: Page, renderToStaticMarkup: Render): string {
  const title = plain(page.seo?.title ?? (page.slug ? `${page.title} · ${site.name}` : `${site.name} — ${page.title}`));
  const desc = plain(page.seo?.description ?? page.description);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const body = renderToStaticMarkup(createElement(SiteDocument, { site, page, base: "", live: false }));
  return `<!doctype html>
<html lang="${site.lang ?? "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(plain(page.seo?.ogTitle ?? title))}">
<meta property="og:description" content="${esc(plain(page.seo?.ogDescription ?? desc))}">
${page.seo?.keywords?.length ? `<meta name="keywords" content="${esc(page.seo.keywords.join(", "))}">\n` : ""}<style>body{margin:0}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireOrg();
  const { data } = await supabase.from("site_drafts").select("site").eq("id", id).maybeSingle();
  if (!data) return new Response("Not found", { status: 404 });
  const site = data.site as Site;
  const render = await renderer();
  const entries = site.pages.map((p) => ({ name: p.slug ? `${p.slug}/index.html` : "index.html", data: html(site, p, render) }));
  entries.push({ name: "README.txt", data: `${site.name} — static website export from Keelwork.\n\nUpload these files to any static host (Cloudflare Pages, Netlify, GitHub Pages, your own server).\nEach page is a folder with an index.html, so addresses look like /contact.\n\nBefore publishing:\n- Replace every highlighted "Add your ..." placeholder with your real details.\n- Replace anything marked "Sample" (reviews, figures) with real ones, or remove it.\n- Forms are plain HTML: point their action at a form service you trust.\n- Review the privacy, terms and cookie pages with your own advisers.\n` });
  const zip = createZip(entries);
  return new Response(new Uint8Array(zip), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${slugify(site.name)}-website.zip"`, "cache-control": "no-store" } });
}
