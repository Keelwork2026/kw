import { checkPath } from "@/lib/agents/policy";

export type TreeNode = { name: string; path: string; type: "dir" | "file"; open?: boolean; children?: TreeNode[] };

/** Parses `git ls-files` output into safe, sorted paths. */
export function parseEntries(output: string): string[] {
  return [...new Set(output.split("\n").map((l) => l.trim()).filter((p) => p && checkPath(p) === null))].sort();
}

/**
 * Builds the file tree. Top-level folders with fewer than 12 children start
 * open, and so does every folder on the current path.
 */
export function buildTree(paths: string[], current?: string | null): TreeNode[] {
  const root: TreeNode = { name: "", path: "", type: "dir", children: [] };
  for (const p of paths) {
    const parts = p.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");
      let child = node.children!.find((c) => c.name === part && c.type === (isFile ? "file" : "dir"));
      if (!child) {
        child = isFile ? { name: part, path, type: "file" } : { name: part, path, type: "dir", children: [] };
        node.children!.push(child);
      }
      node = child;
    });
  }
  const sort = (n: TreeNode) => {
    n.children?.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    n.children?.forEach(sort);
  };
  sort(root);
  const openPath = (n: TreeNode, depth: number) => {
    if (n.type !== "dir") return;
    const onCurrent = Boolean(current && (current === n.path || current.startsWith(`${n.path}/`)));
    n.open = onCurrent || (depth === 0 && (n.children?.length ?? 0) < 12);
    n.children?.forEach((c) => openPath(c, depth + 1));
  };
  root.children!.forEach((c) => openPath(c, 0));
  return root.children!;
}

const LANGS: [RegExp, string][] = [
  [/\.(tsx)$/, "tsx"], [/\.(ts|mts|cts)$/, "typescript"], [/\.(jsx)$/, "jsx"], [/\.(js|mjs|cjs)$/, "javascript"],
  [/\.json$|\.jsonc$/, "json"], [/\.css$/, "css"], [/\.sql$/, "sql"], [/\.(md|mdx)$/, "markdown"], [/\.html?$/, "html"],
  [/\.ya?ml$/, "yaml"], [/\.toml$/, "toml"], [/(^|\/)Dockerfile$|\.dockerfile$/i, "dockerfile"], [/\.sh$/, "shell"],
];
export function languageFor(path: string): string {
  for (const [re, lang] of LANGS) if (re.test(path)) return lang;
  return "text";
}

export function isMigrationPath(path: string): boolean {
  return /^(supabase\/migrations|db\/migrations)\//.test(path);
}
