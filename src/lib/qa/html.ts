/**
 * A small, forgiving HTML reader for QA. It isn't a browser: it reads tags,
 * attributes and text well enough to check structure, labels, links, forms
 * and headings in server-rendered pages. Things it can't judge (contrast,
 * focus visibility, layout) are left to the browser suite or flagged for
 * manual review.
 */
export type Tag = { name: string; attrs: Record<string, string>; text: string; index: number; inLabel: boolean; inForm: number; inLink: boolean };

export type Doc = {
  lang: string | null;
  title: string;
  metaDescription: string | null;
  viewport: string | null;
  headings: { level: number; text: string }[];
  links: { href: string; text: string; attrs: Record<string, string> }[];
  images: Record<string, string>[];
  buttons: { text: string; attrs: Record<string, string> }[];
  inputs: { tag: string; attrs: Record<string, string>; labelled: boolean; form: number }[];
  forms: { attrs: Record<string, string>; fields: number; required: number; hasSubmit: boolean }[];
  scripts: string[];
  stylesheets: string[];
  iframes: Record<string, string>[];
  landmarks: Set<string>;
  ids: Map<string, number>;
  text: string;
  bodyText: string;
};

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

export function attrsOf(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) out[m[1]!.toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  return out;
}
export function decode(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function parse(html: string): Doc {
  const src = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi, (m, t: string) => (t.toLowerCase() === "script" ? m.replace(/>[\s\S]*<\/script>$/i, "></script>") : ""));
  const doc: Doc = { lang: null, title: "", metaDescription: null, viewport: null, headings: [], links: [], images: [], buttons: [], inputs: [], forms: [], scripts: [], stylesheets: [], iframes: [], landmarks: new Set(), ids: new Map(), text: "", bodyText: "" };
  const labelFor = new Set<string>();
  type Open = { name: string; attrs: Record<string, string>; start: number; text: string[] };
  const stack: Open[] = [];
  let formIndex = -1;
  let inBody = false;
  const texts: string[] = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>|([^<]+)/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m[5] !== undefined) {
      const t = decode(m[5]).replace(/\s+/g, " ");
      if (t.trim()) { for (const o of stack) o.text.push(t); if (inBody) texts.push(t); }
      continue;
    }
    const closing = m[1] === "/";
    const name = m[2]!.toLowerCase();
    const attrs = closing ? {} : attrsOf(m[3] ?? "");
    if (!closing) {
      if (attrs.id) doc.ids.set(attrs.id, (doc.ids.get(attrs.id) ?? 0) + 1);
      if (attrs.role) doc.landmarks.add(attrs.role);
      switch (name) {
        case "html": doc.lang = attrs.lang ?? null; break;
        case "body": inBody = true; break;
        case "meta": if (attrs.name === "description") doc.metaDescription = attrs.content ?? ""; if (attrs.name === "viewport") doc.viewport = attrs.content ?? ""; break;
        case "img": doc.images.push(attrs); break;
        case "script": if (attrs.src) doc.scripts.push(attrs.src); break;
        case "link": if ((attrs.rel ?? "").includes("stylesheet") && attrs.href) doc.stylesheets.push(attrs.href); break;
        case "iframe": doc.iframes.push(attrs); break;
        case "main": case "nav": case "header": case "footer": case "aside": doc.landmarks.add(name); break;
        case "label": if (attrs.for) labelFor.add(attrs.for); break;
        case "form": formIndex = doc.forms.push({ attrs, fields: 0, required: 0, hasSubmit: false }) - 1; break;
        case "input": case "select": case "textarea": {
          const type = (attrs.type ?? "text").toLowerCase();
          if (name === "input" && ["hidden"].includes(type)) break;
          if (name === "input" && ["submit", "image"].includes(type)) { const f = doc.forms[formIndex]; if (f && stack.some((o) => o.name === "form")) f.hasSubmit = true; doc.buttons.push({ text: attrs.value ?? "", attrs }); break; }
          if (name === "input" && type === "button") { doc.buttons.push({ text: attrs.value ?? "", attrs }); break; }
          const inForm = stack.some((o) => o.name === "form");
          const wrapped = stack.some((o) => o.name === "label");
          doc.inputs.push({ tag: name, attrs, labelled: wrapped || !!attrs["aria-label"] || !!attrs["aria-labelledby"] || !!attrs.title, form: inForm ? formIndex : -1 });
          if (inForm && doc.forms[formIndex]) { doc.forms[formIndex]!.fields++; if ("required" in attrs || attrs["aria-required"] === "true") doc.forms[formIndex]!.required++; }
          break;
        }
      }
      if (!VOID.has(name) && m[4] !== "/") stack.push({ name, attrs, start: m.index, text: [] });
      continue;
    }
    // closing tag: pop to the matching element (forgiving of bad nesting)
    let i = stack.length - 1;
    while (i >= 0 && stack[i]!.name !== name) i--;
    if (i < 0) continue;
    const el = stack[i]!;
    stack.length = i;
    const text = el.text.join("").replace(/\s+/g, " ").trim();
    switch (name) {
      case "title": doc.title = text; break;
      case "h1": case "h2": case "h3": case "h4": case "h5": case "h6": doc.headings.push({ level: Number(name[1]), text: text || el.attrs["aria-label"] || "" }); break;
      case "a": if (el.attrs.href !== undefined) doc.links.push({ href: el.attrs.href, text: text || el.attrs["aria-label"] || el.attrs.title || "", attrs: el.attrs }); break;
      case "button": {
        doc.buttons.push({ text: text || el.attrs["aria-label"] || el.attrs.title || "", attrs: el.attrs });
        const f = doc.forms[formIndex];
        if (f && stack.some((o) => o.name === "form") && (el.attrs.type ?? "submit") === "submit") f.hasSubmit = true;
        break;
      }
      case "body": inBody = false; break;
    }
  }
  for (const inp of doc.inputs) if (!inp.labelled && inp.attrs.id && labelFor.has(inp.attrs.id)) inp.labelled = true;
  doc.bodyText = texts.join("").replace(/\s+/g, " ").trim();
  doc.text = doc.bodyText;
  return doc;
}

/** Same-origin links as clean paths. */
export function internalPaths(doc: Doc, base: string): string[] {
  const out = new Set<string>();
  for (const l of doc.links) {
    const h = l.href.trim();
    if (!h || h.startsWith("#") || /^(mailto:|tel:|javascript:|data:)/i.test(h)) continue;
    try {
      const u = new URL(h, base);
      if (u.origin !== new URL(base).origin) continue;
      out.add((u.pathname.replace(/\/+$/, "") || "/") + (u.search || ""));
    } catch { /* malformed href */ }
  }
  return [...out];
}

export const GENERIC_LINK_TEXT = /^(click here|here|read more|more|learn more|link|this|go)$/i;
export const ACTION_WORDS = /\b(get started|start|sign up|join|buy|shop|order|book|reserve|try|create|request|contact|apply|subscribe|donate|download|enrol|enroll|register|add to (cart|basket)|checkout|continue)\b/i;
