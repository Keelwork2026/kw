/**
 * Database Studio's schema browser. The schema is replayed from the
 * project's migration files (not read from a live database), so it shows
 * what the migrations define.
 */

/** Splits SQL into statements, respecting quotes, dollar quotes and comments. */
export function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let cur = "", i = 0;
  while (i < sql.length) {
    const c = sql[i]!, n = sql[i + 1];
    if (c === "-" && n === "-") { const end = sql.indexOf("\n", i); const stop = end < 0 ? sql.length : end; cur += sql.slice(i, stop); i = stop; continue; }
    if (c === "/" && n === "*") { const end = sql.indexOf("*/", i + 2); const stop = end < 0 ? sql.length : end + 2; cur += sql.slice(i, stop); i = stop; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < sql.length) { if (sql[j] === c && sql[j + 1] === c) { j += 2; continue; } if (sql[j] === c) break; j++; }
      cur += sql.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === "$") {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) { const end = sql.indexOf(m[0], i + m[0].length); const stop = end < 0 ? sql.length : end + m[0].length; cur += sql.slice(i, stop); i = stop; continue; }
    }
    if (c === ";") { if (stripComments(cur).trim()) out.push(cur.trim()); cur = ""; i++; continue; }
    cur += c; i++;
  }
  if (stripComments(cur).trim()) out.push(cur.trim());
  return out;
}

export function stripComments(s: string): string {
  return s.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

export type Column = { name: string; type: string; nullable: boolean; default: string | null; primaryKey: boolean; references: string | null };
export type Policy = { name: string; command: string; roles: string; using: string | null; check: string | null };
export type Table = { name: string; columns: Column[]; rls: boolean; policies: Policy[] };
export type Schema = { tables: Table[] };

const ident = (s: string) => s.trim().replace(/^"|"$/g, "").replace(/^public\./i, "").replace(/"/g, "");

/** Splits on commas that are not inside parentheses. */
function topLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function balancedAfter(s: string, start: number): string | null {
  const open = s.indexOf("(", start);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") depth++;
    if (s[i] === ")") { depth--; if (depth === 0) return s.slice(open + 1, i); }
  }
  return null;
}

function parseColumn(def: string): Column | null {
  const m = /^("?[A-Za-z_][A-Za-z0-9_]*"?)\s+(.+)$/s.exec(def.trim());
  if (!m) return null;
  const name = ident(m[1]!);
  if (/^(constraint|primary|unique|check|foreign|exclude)$/i.test(name)) return null;
  const rest = m[2]!;
  const type = (/^([a-z_][a-z0-9_ ]*?(\([^)]*\))?(\[\])?)(?=\s+(not|null|default|primary|references|unique|check|generated|constraint|collate)\b|$)/i.exec(rest)?.[1] ?? rest.split(/\s+/)[0]!).trim().toLowerCase();
  const def_ = /\bdefault\s+((?:[^,()]|\([^()]*\))+?)(?=\s+(not|null|primary|references|unique|check|constraint)\b|$)/i.exec(rest)?.[1]?.trim() ?? null;
  const ref = /\breferences\s+("?[\w.]+"?)(?:\s*\(\s*("?\w+"?)\s*\))?/i.exec(rest);
  const primaryKey = /\bprimary\s+key\b/i.test(rest);
  return { name, type, nullable: !/\bnot\s+null\b/i.test(rest) && !primaryKey, default: def_, primaryKey, references: ref ? `${ident(ref[1]!)}${ref[2] ? `.${ident(ref[2])}` : ""}` : null };
}

export function buildSchema(files: { name: string; sql: string }[]): Schema {
  const tables = new Map<string, Table>();
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
  for (const f of sorted) {
    for (const raw of splitStatements(f.sql)) {
      const s = stripComments(raw).trim();
      let m: RegExpExecArray | null;
      if ((m = /^create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?("?[\w.]+"?)/i.exec(s))) {
        const name = ident(m[1]!);
        if (/^(auth|storage|extensions)\./i.test(m[1]!.replace(/"/g, ""))) continue;
        const body = balancedAfter(s, m[0].length) ?? "";
        const t: Table = tables.get(name) ?? { name, columns: [], rls: false, policies: [] };
        for (const part of topLevel(body)) {
          const col = parseColumn(part);
          if (col) t.columns.push(col);
          const pk = /^(?:constraint\s+\S+\s+)?primary\s+key\s*\(([^)]*)\)/i.exec(part);
          if (pk) for (const c of pk[1]!.split(",").map(ident)) { const col2 = t.columns.find((x) => x.name === c); if (col2) { col2.primaryKey = true; col2.nullable = false; } }
        }
        tables.set(name, t);
      } else if ((m = /^drop\s+table\s+(?:if\s+exists\s+)?(.+?)(?:\s+cascade|\s+restrict)?$/i.exec(s))) {
        for (const n of m[1]!.split(",")) tables.delete(ident(n));
      } else if ((m = /^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?("?[\w.]+"?)\s+(.*)$/is.exec(s))) {
        const t = tables.get(ident(m[1]!));
        if (!t) continue;
        const action = m[2]!;
        let a: RegExpExecArray | null;
        if (/^enable\s+row\s+level\s+security/i.test(action)) t.rls = true;
        else if (/^disable\s+row\s+level\s+security/i.test(action)) t.rls = false;
        else if ((a = /^rename\s+to\s+("?\w+"?)/i.exec(action))) { tables.delete(t.name); t.name = ident(a[1]!); tables.set(t.name, t); }
        else {
          for (const clause of topLevel(action)) {
            if ((a = /^add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?(.+)$/is.exec(clause))) { const col = parseColumn(a[1]!); if (col && !t.columns.some((c) => c.name === col.name)) t.columns.push(col); }
            else if ((a = /^drop\s+(?:column\s+)?(?:if\s+exists\s+)?("?\w+"?)/i.exec(clause)) && !/^drop\s+constraint/i.test(clause)) t.columns = t.columns.filter((c) => c.name !== ident(a![1]!));
            else if ((a = /^rename\s+(?:column\s+)?("?\w+"?)\s+to\s+("?\w+"?)/i.exec(clause))) { const col = t.columns.find((c) => c.name === ident(a![1]!)); if (col) col.name = ident(a[2]!); }
            else if ((a = /^alter\s+(?:column\s+)?("?\w+"?)\s+(?:set\s+data\s+)?type\s+(.+)$/i.exec(clause))) { const col = t.columns.find((c) => c.name === ident(a![1]!)); if (col) col.type = a[2]!.split(/\s+using\s+/i)[0]!.trim().toLowerCase(); }
            else if ((a = /^alter\s+(?:column\s+)?("?\w+"?)\s+set\s+not\s+null/i.exec(clause))) { const col = t.columns.find((c) => c.name === ident(a![1]!)); if (col) col.nullable = false; }
          }
        }
      } else if ((m = /^create\s+policy\s+("?[^"]+"?|\S+)\s+on\s+("?[\w.]+"?)(.*)$/is.exec(s))) {
        const t = tables.get(ident(m[2]!));
        if (!t) continue;
        const rest = m[3]!;
        const usingIdx = rest.search(/\busing\s*\(/i);
        const checkIdx = rest.search(/\bwith\s+check\s*\(/i);
        t.policies.push({
          name: m[1]!.replace(/"/g, ""),
          command: (/\bfor\s+(all|select|insert|update|delete)\b/i.exec(rest)?.[1] ?? "all").toLowerCase(),
          roles: (/\bto\s+([\w, ]+?)(?=\s+(using|with)\b|$)/i.exec(rest)?.[1] ?? "public").trim().toLowerCase(),
          using: usingIdx >= 0 ? balancedAfter(rest, usingIdx) : null,
          check: checkIdx >= 0 ? balancedAfter(rest, checkIdx) : null,
        });
      } else if ((m = /^drop\s+policy\s+(?:if\s+exists\s+)?("?[^"]+"?|\S+)\s+on\s+("?[\w.]+"?)/i.exec(s))) {
        const t = tables.get(ident(m[2]!));
        if (t) t.policies = t.policies.filter((p) => p.name !== m![1]!.replace(/"/g, ""));
      }
    }
  }
  return { tables: [...tables.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}
