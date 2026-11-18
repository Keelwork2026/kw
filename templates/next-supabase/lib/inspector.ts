/** Pure helpers for Design mode's in-preview inspector. */
export type Selection = {
  type: "kw:select";
  tag: string;
  text: string;
  selector: string;
  source: { file: string; line: number } | null;
};

/** Parses data-kw-source="app/page.tsx:12". */
export function parseSource(attr: string | null | undefined): { file: string; line: number } | null {
  if (!attr) return null;
  const m = /^([A-Za-z0-9_./@()[\]-]{1,200}\.(?:tsx|jsx|ts|js|mdx)):(\d{1,6})$/.exec(attr.trim());
  if (!m || m[1]!.includes("..") || m[1]!.startsWith("/")) return null;
  return { file: m[1]!, line: Number(m[2]) };
}

type ElLike = { tagName: string; id?: string; classList?: { length: number; [i: number]: string }; parentElement: ElLike | null; getAttribute(n: string): string | null; textContent: string | null; children?: { length: number; [i: number]: ElLike } };

/** A short, stable CSS selector for an element (id, else tag + classes + nth-of-type chain). */
export function selectorFor(el: ElLike, maxDepth = 5): string {
  const parts: string[] = [];
  let cur: ElLike | null = el;
  for (let d = 0; cur && d < maxDepth; d++) {
    const tag = cur.tagName.toLowerCase();
    if (cur.id && /^[A-Za-z][\w-]*$/.test(cur.id)) { parts.unshift(`${tag}#${cur.id}`); break; }
    let part = tag;
    const classes = cur.classList ? Array.from({ length: Math.min(cur.classList.length, 2) }, (_, i) => cur!.classList![i]!).filter((c) => /^[A-Za-z][\w-]*$/.test(c)) : [];
    if (classes.length) part += `.${classes.join(".")}`;
    const parent: ElLike | null = cur.parentElement;
    if (parent?.children) {
      const same = Array.from({ length: parent.children.length }, (_, i) => parent.children![i]!).filter((c) => c.tagName === cur!.tagName);
      if (same.length > 1) part += `:nth-of-type(${same.indexOf(cur) + 1})`;
    }
    parts.unshift(part);
    if (tag === "body") break;
    cur = parent;
  }
  return parts.join(" > ").slice(0, 300);
}

export function buildSelection(el: ElLike): Selection {
  let src: ElLike | null = el;
  let source: Selection["source"] = null;
  while (src && !source) { source = parseSource(src.getAttribute("data-kw-source")); src = src.parentElement; }
  return {
    type: "kw:select",
    tag: el.tagName.toLowerCase().slice(0, 20),
    text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
    selector: selectorFor(el),
    source,
  };
}

/** The inspector only runs inside Keelwork's preview frame with ?kw-inspect=1. */
export function inspectorActive(search: string, inFrame: boolean, appOrigin: string | undefined): boolean {
  return inFrame && Boolean(appOrigin) && new URLSearchParams(search).get("kw-inspect") === "1";
}
