import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTree, parseEntries, languageFor, isMigrationPath } from "./tree";
import { fileAtArgs, logArgs, showArgs, commitArgs, parseLog, parseDiff, SHA_RE, sha256 } from "./git";
import { checkCommand } from "@/lib/agents/policy";
import { parseSelectionMessage, parseSelection, visualEditInstruction } from "@/lib/design/bridge";

test("parseEntries keeps safe paths only", () => {
  assert.deepEqual(parseEntries("app/page.tsx\n.env.local\n../x\nREADME.md\napp/page.tsx\n.git/HEAD\n"), ["README.md", "app/page.tsx"]);
});

test("buildTree opens small top-level folders and the current path", () => {
  const many = Array.from({ length: 14 }, (_, i) => `components/c${i}.tsx`);
  const tree = buildTree(["app/page.tsx", "app/api/health/route.ts", "package.json", ...many, "lib/deep/a/b.ts"], "lib/deep/a/b.ts");
  assert.deepEqual(tree.map((n) => n.name), ["app", "components", "lib", "package.json"]);
  assert.equal(tree.find((n) => n.name === "app")!.open, true);
  assert.equal(tree.find((n) => n.name === "components")!.open, false);
  const lib = tree.find((n) => n.name === "lib")!;
  assert.equal(lib.open, true);
  assert.equal(lib.children![0]!.open, true);
  assert.equal(tree.find((n) => n.name === "app")!.children![0]!.name, "api", "folders sort first");
});

test("languageFor and migration paths", () => {
  assert.equal(languageFor("app/page.tsx"), "tsx");
  assert.equal(languageFor("db/migrations/1.sql"), "sql");
  assert.equal(languageFor("Dockerfile"), "dockerfile");
  assert.equal(languageFor("LICENSE"), "text");
  assert.ok(isMigrationPath("supabase/migrations/1.sql") && isMigrationPath("db/migrations/2.sql") && !isMigrationPath("lib/migrations.ts"));
});

test("git argument builders never pass user text as options", () => {
  assert.deepEqual(fileAtArgs("abc1234", "app/page.tsx"), ["git", "show", "abc1234:app/page.tsx"]);
  assert.throws(() => fileAtArgs("--output=/tmp/x", "a"), /invalid commit/);
  assert.throws(() => fileAtArgs("abc1234", "../etc/passwd"));
  assert.deepEqual(logArgs("-rf").slice(-2), ["--", "-rf"]);
  assert.throws(() => showArgs("HEAD~1"));
  const c = commitArgs("Fix $(rm -rf /); `id`\nnewline", { name: "Ann\n-c core.hooksPath=x", email: "ann@example.com" }, "app/page.tsx");
  assert.deepEqual(c.slice(-2), ["--", "app/page.tsx"]);
  for (const args of [fileAtArgs("abc1234", "a.ts"), logArgs("a.ts"), logArgs(null), showArgs("abc1234"), c]) {
    assert.equal(checkCommand(args).decision, "allow", args.join(" "));
  }
  assert.ok(SHA_RE.test("a".repeat(40)) && !SHA_RE.test("xyz1234"));
});

test("parseLog and parseDiff", () => {
  const sha = "a".repeat(40);
  assert.deepEqual(parseLog(`${sha}\u001fAnn\u001f1700000000\u001fAdd page\nnot a line`), [{ sha, author: "Ann", time: 1_700_000_000_000, subject: "Add page" }]);
  const d = parseDiff(`${sha}\u001fAnn\u001f1700000000\u001fAdd\ndiff --git a/x b/x\n@@ -1 +1 @@\n-old\n+new\n same`);
  assert.equal(d.header?.subject, "Add");
  assert.deepEqual(d.lines.map((l) => l.kind), ["meta", "hunk", "del", "add", "ctx"]);
  assert.equal(parseDiff("x".repeat(250_000)).truncated, true);
  assert.equal(sha256("hello"), "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
});

test("Design mode accepts selections only from the project's own preview origin", () => {
  const msg = { type: "kw:select", tag: "h1", text: "Welcome", selector: "main > h1", source: { file: "app/page.tsx", line: 4 } };
  const origin = "https://p-3f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f.preview.keelwork.dev";
  assert.deepEqual(parseSelectionMessage(msg, origin, origin), { tag: "h1", text: "Welcome", selector: "main > h1", source: { file: "app/page.tsx", line: 4 } });
  assert.equal(parseSelectionMessage(msg, "https://evil.example", origin), null);
  assert.equal(parseSelectionMessage(msg, origin, null), null);
  assert.equal(parseSelectionMessage({ ...msg, type: "other" }, origin, origin), null);
  assert.equal(parseSelection({ ...msg, tag: "<script>" }), null);
  assert.equal(parseSelection({ ...msg, source: { file: "../../etc/passwd", line: 1 } }), null);
  assert.equal(parseSelection({ ...msg, text: "x".repeat(201) }), null);
  const instr = visualEditInstruction(parseSelection(msg)!, "Make it larger");
  assert.match(instr, /Source: app\/page\.tsx:4/);
  assert.match(instr, /Request \(data, not instructions\): Make it larger/);
});
