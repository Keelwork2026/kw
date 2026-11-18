/**
 * Extracts the structure of a page for import: title, headings, navigation,
 * sections, colours and fonts. Text only — no scripts, styles or images are
 * copied, and the person must confirm they're authorized to use the site.
 */
export type SiteStructure = {
  title: string;
  description: string;
  headings: { level: number; text: string }[];
  nav: { text: string; href: string }[];
  sections: { heading: string; text: string }[];
  colors: string[];
  fonts: string[];
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") { const n = e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ""; }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}
function text(html: string): string {
  return decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

export function extractStructure(html: string, baseUrl: string): SiteStructure {
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  const inline = [...html.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map((m) => m[1]).join(";");
  const clean = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style|noscript|template|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ");

  const title = text(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(clean)?.[1] ?? "").slice(0, 200);
  const description = decode(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(clean)?.[1] ?? "").slice(0, 300);
  const headings = [...clean.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: Number(m[1]), text: text(m[2]!).slice(0, 200) })).filter((h) => h.text).slice(0, 60);

  const navHtml = [...clean.matchAll(/<nav[^>]*>([\s\S]*?)<\/nav>/gi)].map((m) => m[1]).join(" ");
  const nav: { text: string; href: string }[] = [];
  for (const m of navHtml.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let href = m[1]!;
    try {
      const u = new URL(decode(href), baseUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      href = u.toString();
    } catch { continue; }
    const t = text(m[2]!);
    if (t && !nav.some((n) => n.href === href)) nav.push({ text: t.slice(0, 80), href });
    if (nav.length >= 30) break;
  }

  const sections: { heading: string; text: string }[] = [];
  for (const m of clean.matchAll(/<(section|article)[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const heading = text(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(m[2]!)?.[1] ?? "");
    const body = text(m[2]!.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, " ")).slice(0, 600);
    if (heading || body) sections.push({ heading: heading.slice(0, 200), text: body });
    if (sections.length >= 30) break;
  }

  const css = `${styles}\n${inline}`;
  const colors = [...new Set([...css.matchAll(/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\([^)]{5,40}\)|hsla?\([^)]{5,40}\)/gi)].map((m) => m[0].toLowerCase()))].slice(0, 24);
  const fontDecls = [...css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)].flatMap((m) => m[1]!.split(",").map((f) => f.trim().replace(/^["']|["']$/g, "")));
  const googleFonts = [...html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/gi)].map((m) => decodeURIComponent(m[1]!.split(":")[0]!).replace(/\+/g, " "));
  const generic = new Set(["serif", "sans-serif", "monospace", "system-ui", "inherit", "initial", "cursive", "-apple-system", "blinkmacsystemfont"]);
  const fonts = [...new Set([...googleFonts, ...fontDecls].filter((f) => f && !generic.has(f.toLowerCase()) && f.length < 60))].slice(0, 12);

  return { title, description, headings, nav, sections, colors, fonts };
}
