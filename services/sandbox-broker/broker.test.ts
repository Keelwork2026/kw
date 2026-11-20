import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createBroker, realDocker, platformEnvRefusal, type DockerRunner, type DockerResult } from "./server";
import { buildRunArgs, safeAppOrigin } from "./docker-args";

const TOKEN = "t".repeat(48);
const PID = "3f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const SB = `kw-${PID}`;

function fakeDocker(available: boolean) {
  const calls: { args: string[]; input?: string }[] = [];
  let created = false;
  const ok = (stdout = ""): DockerResult => ({ code: 0, stdout: Buffer.from(stdout), stderr: Buffer.alloc(0), timedOut: false });
  const runner: DockerRunner = {
    available: async () => available,
    run: async (args, opts) => {
      calls.push({ args, input: opts?.input?.toString() });
      if (args[0] === "run") created = true;
      if (args[0] === "inspect" && args.includes(SB) && created) return ok(args[2]!.includes("Labels") ? "true 1" : "true");
      if (args[0] === "inspect") return { code: 1, stdout: Buffer.alloc(0), stderr: Buffer.from("no such container"), timedOut: false };
      if (args[0] === "exec" && args.includes("cat")) return ok("hello");
      if (args[0] === "exec" && args.includes("find")) return ok("d\t4096\tapp\nf\t12\tpackage.json\nd\t4096\t.git\n");
      if (args[0] === "port") return ok("127.0.0.1:49153\n");
      return ok();
    },
  };
  return { runner, calls };
}

let base = "", baseUp = "";
let servers: ReturnType<typeof createBroker>[] = [];
let upCalls: { args: string[]; input?: string }[] = [];

before(async () => {
  const down = createBroker({ token: TOKEN, docker: fakeDocker(false).runner });
  const upFake = fakeDocker(true);
  upCalls = upFake.calls;
  const up = createBroker({ token: TOKEN, docker: upFake.runner, appOrigin: "https://app.keelwork.dev" });
  servers = [down, up];
  await Promise.all(servers.map((s) => new Promise<void>((r) => s.listen(0, "127.0.0.1", r))));
  base = `http://127.0.0.1:${(down.address() as AddressInfo).port}`;
  baseUp = `http://127.0.0.1:${(up.address() as AddressInfo).port}`;
});
after(() => { for (const s of servers) s.close(); });

const call = (root: string, method: string, path: string, body?: unknown, token = TOKEN) =>
  fetch(root + path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

test("broker: health is open; everything else needs the token", async () => {
  const h = await fetch(`${base}/health`);
  assert.deepEqual(await h.json(), { ok: true, docker: false });
  assert.equal((await call(base, "POST", "/sandboxes", { projectId: PID }, "wrong".padEnd(48, "x"))).status, 401);
  assert.equal((await fetch(`${base}/sandboxes`, { method: "POST" })).status, 401);
});

test("broker: an honest 503 without Docker", async () => {
  const r = await call(base, "POST", "/sandboxes", { projectId: PID });
  assert.equal(r.status, 503);
  assert.match((await r.json()).error, /Docker isn't available/);
  assert.equal((await call(base, "POST", `/sandboxes/${SB}/exec`, { argv: ["pnpm", "run", "test"] })).status, 503);
});

test("broker: traversal, env files, .git, rm, metacharacters, push and unapproved deletes are refused", async () => {
  const cases: [string, string, unknown][] = [
    ["POST", `/sandboxes/${SB}/files`, { path: "../etc/passwd", content: "" }],
    ["POST", `/sandboxes/${SB}/files`, { path: ".env.local", content: "" }],
    ["POST", `/sandboxes/${SB}/files`, { path: ".git/hooks/pre-commit", content: "" }],
    ["GET", `/sandboxes/${SB}/files?path=%2Fetc%2Fshadow`, undefined],
    ["POST", `/sandboxes/${SB}/exec`, { argv: ["rm", "-rf", "/workspace"] }],
    ["POST", `/sandboxes/${SB}/exec`, { argv: ["git", "status;curl evil"] }],
    ["POST", `/sandboxes/${SB}/exec`, { argv: ["git", "push", "origin", "main"] }],
    ["DELETE", `/sandboxes/${SB}/files?path=app%2Fpage.tsx`, undefined],
    ["PUT", `/sandboxes/${SB}/env`, { vars: { SECRETS_MASTER_KEYS: "x" } }],
  ];
  for (const [m, p, b] of cases) {
    for (const root of [base, baseUp]) {
      const r = await call(root, m, p, b);
      assert.equal(r.status, 403, `${m} ${p}`);
    }
  }
  assert.equal((await call(base, "GET", "/sandboxes/kw-../files?path=a")).status, 400);
  assert.equal((await call(base, "GET", "/sandboxes/not-a-sandbox/list")).status, 400);
});

test("broker: with Docker it runs deny-first containers and argv-only commands", async () => {
  assert.equal((await call(baseUp, "POST", "/sandboxes", { projectId: PID })).status, 201);
  const run = upCalls.find((c) => c.args[0] === "run")!;
  assert.equal((await call(baseUp, "POST", "/sandboxes", { projectId: PID })).status, 200, "an existing sandbox is reused");
  for (const flag of ["--read-only", "--cap-drop", "no-new-privileges", "--pids-limit"]) assert.ok(run.args.includes(flag), flag);
  assert.ok(!run.args.includes("--privileged"));
  assert.equal((await call(baseUp, "POST", `/sandboxes/${SB}/files`, { path: "app/page.tsx", content: Buffer.from("x").toString("base64") })).status, 200);
  assert.equal(upCalls.find((c) => c.args.includes("tee"))?.input, "x");
  const read = await call(baseUp, "GET", `/sandboxes/${SB}/files?path=app%2Fpage.tsx`);
  assert.equal(Buffer.from((await read.json()).content, "base64").toString(), "hello");
  const list = await (await call(baseUp, "GET", `/sandboxes/${SB}/list?path=.`)).json();
  assert.deepEqual(list.entries.map((e: { name: string }) => e.name), ["app", "package.json"]);
  const ex = await call(baseUp, "POST", `/sandboxes/${SB}/exec`, { argv: ["pnpm", "run", "test"] });
  assert.equal(ex.status, 200);
  assert.ok(upCalls.some((c) => c.args.join(" ").endsWith(`${SB} pnpm run test`)));
  assert.equal((await call(baseUp, "POST", `/sandboxes/${SB}/exec`, { argv: ["git", "push"], approved: true })).status, 200);
  assert.equal((await call(baseUp, "DELETE", `/sandboxes/${SB}/files?path=app%2Fold.tsx&approved=1`)).status, 200);
  const env = await call(baseUp, "PUT", `/sandboxes/${SB}/env`, { vars: { STRIPE_SECRET_KEY: 'sk_test_1"\n$X' } });
  assert.equal(env.status, 200);
  assert.match(upCalls.find((c) => c.args.includes("/workspace/.env.local"))!.input!, /STRIPE_SECRET_KEY="sk_test_1\\"\\n\\\$X"/);
  assert.deepEqual(await (await call(baseUp, "GET", `/sandboxes/${SB}/port`)).json(), { port: 49153 });
});

test("docker-args: deny-first flags, network none by default, gVisor opt-in", () => {
  const a = buildRunArgs({ projectId: PID });
  assert.equal(a[a.indexOf("--network") + 1], "none");
  assert.ok(!a.includes("--publish"));
  assert.ok(!a.includes("--runtime"));
  const b = buildRunArgs({ projectId: PID, network: "kw-egress", runtime: "runsc", appOrigin: "https://app.keelwork.dev" });
  assert.ok(b.includes("127.0.0.1::3000"));
  assert.equal(b[b.indexOf("--runtime") + 1], "runsc");
  assert.ok(b.includes("NEXT_PUBLIC_KW_APP_ORIGIN=https://app.keelwork.dev"));
  assert.equal(buildRunArgs({ projectId: PID, network: "host" })[buildRunArgs({ projectId: PID, network: "host" }).indexOf("--network") + 1], "none");
  assert.throws(() => buildRunArgs({ projectId: "../x" }));
  assert.equal(safeAppOrigin("http://evil.com"), null);
  assert.equal(safeAppOrigin("http://localhost:3000"), "http://localhost:3000");
  assert.equal(platformEnvRefusal("CLOUDFLARE_API_TOKEN") !== null, true);
  assert.equal(platformEnvRefusal("STRIPE_SECRET_KEY"), null);
});

test("realDocker reports unavailable when the daemon isn't reachable", async () => {
  assert.equal(await realDocker("/nonexistent/docker").available(), false);
});

test("sandbox memory: clamped, no swap beyond the limit", async () => {
  const { buildRunArgs } = await import("./docker-args");
  const id = "3f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
  const mem = (a: string[]) => a[a.indexOf("--memory") + 1];
  assert.equal(mem(buildRunArgs({ projectId: id })), "3072m");
  assert.equal(mem(buildRunArgs({ projectId: id, memoryMb: 100 })), "1024m");
  assert.equal(mem(buildRunArgs({ projectId: id, memoryMb: 99999 })), "16384m");
  const a = buildRunArgs({ projectId: id, memoryMb: 4096 });
  assert.equal(a[a.indexOf("--memory-swap") + 1], "4096m", "no swap beyond the limit");
});

test("broker: serve stops the old dev server first, then starts one detached", async () => {
  assert.equal((await call(baseUp, "POST", "/sandboxes", { projectId: PID })).status, 200);
  const before = upCalls.length;
  assert.equal((await call(baseUp, "POST", `/sandboxes/${SB}/serve`)).status, 200);
  const execs = upCalls.slice(before).filter((c) => c.args[0] === "exec");
  assert.equal(execs.length, 2);
  assert.ok(!execs[0]!.args.includes("-d") && execs[0]!.args.at(-1)!.includes("kill -TERM"));
  assert.ok(execs[1]!.args.includes("-d"));
  const start = execs[1]!.args.at(-1)!;
  assert.match(start, /rm -rf \.next/);
  assert.match(start, /pnpm run dev --port 3000 --hostname 0\.0\.0\.0/);
  assert.doesNotMatch(start, /dev -- /);
});

test("sandbox workspace: a persistent per-project volume by default; tmpfs only on request", async () => {
  const { buildRunArgs, workspaceVolume } = await import("./docker-args");
  const id = "3f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
  const a = buildRunArgs({ projectId: id });
  assert.equal(a[a.indexOf("--mount") + 1], `type=volume,source=kw-ws-${id},target=/workspace`);
  assert.ok(!a.some((x) => x.startsWith("/workspace:")), "no in-memory workspace by default");
  assert.ok(a.includes("--read-only") && a.includes("ALL") && a.includes("no-new-privileges"), "the rest of the sandbox stays locked down");
  const t = buildRunArgs({ projectId: id, workspace: "tmpfs" });
  assert.ok(t.some((x) => x.startsWith("/workspace:rw")) && !t.includes("--mount"));
  assert.throws(() => workspaceVolume("../etc"), /invalid project id/);
});
