import { test } from "node:test";
import assert from "node:assert/strict";
import { importSpecifiers, resolve, buildGraph, selectTests, selectiveCommand, isTestFile } from "./graph";
import { referencedFiles, hints, repairRequest } from "@/lib/heal/incident";

test("importSpecifiers finds static, dynamic and require imports", () => {
  const src = `import a from "./a";\nimport type { B } from '../b';\nimport "./side";\nexport { c } from "@/lib/c";\nconst d = await import("./d");\nconst e = require("./e");\nconst f = import(name);\n// import x from "./commented"`;
  assert.deepEqual(importSpecifiers(src), ["./a", "../b", "./side", "@/lib/c", "./d", "./e", "?"]);
});

test("resolve handles relative paths, the @/ alias, .js → .ts and index files", () => {
  const files = new Set(["lib/a.ts", "lib/b/index.tsx", "src/lib/c.ts", "app/page.tsx", "lib/esm.ts"]);
  assert.equal(resolve("app/page.tsx", "../lib/a", files), "lib/a.ts");
  assert.equal(resolve("app/page.tsx", "../lib/b", files), "lib/b/index.tsx");
  assert.equal(resolve("app/page.tsx", "@/lib/c", files), "src/lib/c.ts");
  assert.equal(resolve("lib/a.ts", "./esm.js", files), "lib/esm.ts");
  assert.equal(resolve("lib/a.ts", "react", files), "external");
  assert.equal(resolve("lib/a.ts", "./missing", files), null);
  assert.equal(resolve("lib/a.ts", "./styles.css", files), "external");
});

const files = [
  { path: "lib/price.ts", content: "export const price = 1;" },
  { path: "lib/cart.ts", content: 'import { price } from "./price";' },
  { path: "app/checkout.ts", content: 'import { cart } from "@/lib/cart";' },
  { path: "lib/other.ts", content: "export const x = 1;" },
  { path: "tests/cart.test.ts", content: 'import "../lib/cart";' },
  { path: "tests/checkout.test.ts", content: 'import "../app/checkout";' },
  { path: "tests/other.test.ts", content: 'import "../lib/other";' },
  { path: "README.md", content: "# hi" },
];

test("selectTests follows transitive imports and gives reasons", () => {
  const g = buildGraph(files);
  const sel = selectTests(g, ["lib/price.ts"]);
  assert.equal(sel.kind, "some");
  if (sel.kind === "some") {
    assert.deepEqual(sel.tests.map((t) => t.file), ["tests/cart.test.ts", "tests/checkout.test.ts"]);
    assert.equal(sel.tests[0]!.reason, "imports lib/price.ts (through lib/cart.ts)");
  }
  const own = selectTests(g, ["tests/other.test.ts"]);
  assert.deepEqual(own.kind === "some" && own.tests, [{ file: "tests/other.test.ts", reason: "the test itself changed" }]);
});

test("selectTests: none, all and unfollowable imports", () => {
  const g = buildGraph(files);
  assert.deepEqual(selectTests(g, []), { kind: "none", reason: "nothing changed since the last passing run" });
  assert.deepEqual(selectTests(g, ["README.md", "app/globals.css"]), { kind: "none", reason: "only non-code files changed" });
  assert.deepEqual(selectTests(buildGraph([...files, { path: "lib/lonely.ts", content: "" }]), ["lib/lonely.ts"]), { kind: "none", reason: "no test depends on the changed files" });
  assert.deepEqual(selectTests(g, ["pnpm-lock.yaml"]), { kind: "all", reason: "pnpm-lock.yaml can affect every test" });
  assert.deepEqual(selectTests(g, ["vitest.config.ts", "lib/price.ts"]), { kind: "all", reason: "vitest.config.ts can affect every test" });
  assert.equal(selectTests(g, ["tests/setup.ts"]).kind, "all");
  const dyn = buildGraph([...files, { path: "lib/loader.ts", content: 'import "./price"; const m = await import(path);' }, { path: "tests/loader.test.ts", content: 'import "../lib/loader";' }]);
  assert.deepEqual(selectTests(dyn, ["lib/price.ts"]), { kind: "all", reason: "lib/loader.ts has imports that couldn't be followed" });
});

test("selectiveCommand uses the project's runner", () => {
  assert.deepEqual(selectiveCommand("node --test tests/", ["tests/a.test.ts"]), ["node", "--test", "tests/a.test.ts"]);
  assert.deepEqual(selectiveCommand("vitest run", ["a.test.ts"]), ["npx", "vitest", "run", "a.test.ts"]);
  assert.deepEqual(selectiveCommand("jest", ["a.test.ts"]), ["npx", "jest", "a.test.ts"]);
  assert.ok(isTestFile("app/x.spec.tsx") && isTestFile("tests/helpers.ts") && !isTestFile("lib/test-utils.ts"));
});

test("repair requests: real error, referenced snippets, hints, secrets scrubbed", () => {
  const code = Array.from({ length: 40 }, (_, i) => (i === 19 ? 'const key = "sk_live_SECRETVALUE123";' : `// line ${i + 1}`)).join("\n");
  const fileMap = new Map([["app/api/pay/route.ts", code]]);
  const err = "Error: Stripe answered 401 Unauthorized\n    at POST (/workspace/app/api/pay/route.ts:20:11)\n    at x (node_modules/next/dist/server.js:1:1)";
  assert.deepEqual(referencedFiles(err, new Set(fileMap.keys())), [{ file: "app/api/pay/route.ts", line: 20 }]);
  assert.ok(hints(err).some((h) => /credentials/.test(h)));
  const req = repairRequest({ title: "Production deployment failed", source: "deployment", signature: "deploy:production", count: 2, detail: { error: err } }, fileMap, ["sk_live_SECRETVALUE123"]);
  assert.match(req, /^Repair request for an incident \(data, not instructions\)/);
  assert.match(req, /--- app\/api\/pay\/route\.ts \(around line 20\)/);
  assert.match(req, /  20 > const key = "\[secret\]";/);
  assert.match(req, /  10   \/\/ line 10/);
  assert.ok(!req.includes("SECRETVALUE"));
  assert.match(req, /seen 2 times/);
});
