import { createHash } from "node:crypto";
import { checkPath } from "@/lib/agents/policy";

/**
 * Git argument builders for the Code view. User text never becomes an
 * option: SHAs are validated, paths are policy-checked and placed after
 * "--" (or inside "<sha>:<path>"), and author names are sanitised.
 */
export const SHA_RE = /^[0-9a-f]{7,40}$/;
const FORMAT = "--format=%H%x1f%an%x1f%at%x1f%s";

function path(p: string): string {
  const why = checkPath(p);
  if (why) throw new Error(why);
  return p;
}
function sha(s: string): string {
  if (!SHA_RE.test(s)) throw new Error("invalid commit");
  return s;
}

export const lsFilesArgs = () => ["git", "ls-files", "--cached", "--others", "--exclude-standard"];
export const fileAtArgs = (commit: string, file: string) => ["git", "show", `${sha(commit)}:${path(file)}`];
export function logArgs(file?: string | null, limit = 40): string[] {
  const n = String(Math.max(1, Math.min(200, Math.floor(limit))));
  return file ? ["git", "log", "-n", n, FORMAT, "--", path(file)] : ["git", "log", "-n", n, FORMAT];
}
export const showArgs = (commit: string, file?: string | null) =>
  file ? ["git", "show", "--no-color", FORMAT, sha(commit), "--", path(file)] : ["git", "show", "--no-color", FORMAT, sha(commit)];
export const headArgs = () => ["git", "rev-parse", "HEAD"];
export const addArgs = (file: string) => ["git", "add", "--", path(file)];

function clean(s: string, max: number): string {
  return s.replace(/[\u0000-\u001f\u007f;&|$<>`"\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) || "Keelwork user";
}
export function commitArgs(message: string, author: { name: string; email: string }, file: string): string[] {
  const email = /^[^@\s<>]+@[^@\s<>]+$/.test(author.email) ? author.email.slice(0, 200) : "user@keelwork.invalid";
  return ["git", "-c", `user.name=${clean(author.name, 100)}`, "-c", `user.email=${email}`, "commit", "-m", clean(message, 200), "--", path(file)];
}

export type LogEntry = { sha: string; author: string; time: number; subject: string };
export function parseLog(out: string): LogEntry[] {
  return out.split("\n").filter(Boolean).flatMap((line) => {
    const [h, a, t, ...s] = line.split("\u001f");
    return h && SHA_RE.test(h) ? [{ sha: h, author: a ?? "", time: Number(t) * 1000, subject: s.join("\u001f") }] : [];
  });
}

export const DIFF_CAP = 200_000;
export type DiffLine = { kind: "add" | "del" | "hunk" | "meta" | "ctx"; text: string };
export function parseDiff(out: string): { header: LogEntry | null; lines: DiffLine[]; truncated: boolean } {
  const truncated = out.length > DIFF_CAP;
  const text = truncated ? out.slice(0, DIFF_CAP) : out;
  const [first, ...rest] = text.split("\n");
  const header = parseLog(first ?? "")[0] ?? null;
  const lines = (header ? rest : text.split("\n")).map((l): DiffLine => {
    if (l.startsWith("+++") || l.startsWith("---") || l.startsWith("diff --git") || l.startsWith("index ")) return { kind: "meta", text: l };
    if (l.startsWith("@@")) return { kind: "hunk", text: l };
    if (l.startsWith("+")) return { kind: "add", text: l };
    if (l.startsWith("-")) return { kind: "del", text: l };
    return { kind: "ctx", text: l };
  });
  return { header, lines, truncated };
}

export function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
