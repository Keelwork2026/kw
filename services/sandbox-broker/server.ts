/**
 * Keelwork sandbox broker (`pnpm broker`).
 *
 * Runs on a DEDICATED Docker host, never on the web app's servers. The web
 * app and the agent worker call it with BROKER_TOKEN (compared in constant
 * time). Docker is driven with argument arrays only — no shell anywhere —
 * and every path and command is re-checked with the same policy engine the
 * worker uses. Without Docker every sandbox endpoint returns an honest 503.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import { posix } from "node:path";
import { checkPath, checkCommand } from "../../src/lib/agents/policy";
import { toDotenv } from "../../src/lib/secrets/vault";
import { buildRunArgs, containerName } from "./docker-args";

export type DockerResult = { code: number; stdout: Buffer; stderr: Buffer; timedOut: boolean };
export type DockerRunner = {
  available(): Promise<boolean>;
  run(args: string[], opts?: { input?: Buffer; timeoutMs?: number }): Promise<DockerResult>;
};

const MAX_OUTPUT = 2_000_000;

/** Runs the docker CLI with an argument array (no shell). */
export function realDocker(bin = "docker"): DockerRunner {
  const run = (args: string[], opts: { input?: Buffer; timeoutMs?: number } = {}) =>
    new Promise<DockerResult>((resolve) => {
      let child;
      try {
        child = spawn(bin, args, { shell: false, stdio: ["pipe", "pipe", "pipe"] });
      } catch {
        resolve({ code: 127, stdout: Buffer.alloc(0), stderr: Buffer.from("docker not found"), timedOut: false });
        return;
      }
      const out: Buffer[] = [], err: Buffer[] = [];
      let outLen = 0, errLen = 0, timedOut = false;
      child.stdout.on("data", (b: Buffer) => { if (outLen < MAX_OUTPUT) { out.push(b); outLen += b.length; } });
      child.stderr.on("data", (b: Buffer) => { if (errLen < MAX_OUTPUT) { err.push(b); errLen += b.length; } });
      const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, opts.timeoutMs ?? 60_000);
      child.on("error", () => { clearTimeout(timer); resolve({ code: 127, stdout: Buffer.alloc(0), stderr: Buffer.from("docker not found"), timedOut: false }); });
      child.on("close", (code) => { clearTimeout(timer); resolve({ code: code ?? 1, stdout: Buffer.concat(out), stderr: Buffer.concat(err), timedOut }); });
      child.stdin.on("error", () => undefined);
      if (opts.input) child.stdin.end(opts.input); else child.stdin.end();
    });
  return {
    run,
    async available() {
      const r = await run(["version", "--format", "{{.Server.Version}}"], { timeoutMs: 5000 });
      return r.code === 0 && r.stdout.toString().trim().length > 0;
    },
  };
}

/** Platform variables that must never be written into a sandbox. */
const PLATFORM_NAMES = new Set(["SECRETS_MASTER_KEYS", "SANDBOX_BROKER_TOKEN", "BROKER_TOKEN", "PREVIEW_SECRET", "CLOUDFLARE_API_TOKEN", "VERCEL_TOKEN", "SUPABASE_SERVICE_ROLE_KEY"]);
const SENSITIVE = /(KEY|TOKEN|SECRET|PASSWORD)/;

export function platformEnvRefusal(name: string, platformNames: ReadonlySet<string> = PLATFORM_NAMES): string | null {
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(name)) return `invalid variable name ${name}`;
  if (name.startsWith("KW_") || (SENSITIVE.test(name) && platformNames.has(name))) return `${name} belongs to the platform and can't be written into a sandbox`;
  return null;
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function tokenMatches(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b) && given.length === expected.length;
}

/**
 * Starts the sandbox's dev server, replacing one that is already running.
 * - The server runs in its own process group (setsid) whose id is kept in
 *   .keelwork/dev.pid, so a restart stops pnpm and Next together.
 * - .next is cleared on start: a production build ("next build") writes the
 *   same folder, and a dev server left on top of it fails with missing chunks.
 * - No "--" before the flags: pnpm 10 forwards it, and Next then reads
 *   "--port" as a project directory.
 * - Output goes to .keelwork/dev.log (git-ignored) for diagnosing a failed start.
 * With onlyIfRunning, nothing happens unless a dev server is currently running.
 * Stopping is synchronous so nothing can mistake the old server for the new one.
 */
export function stopDevScript(): string {
  return [
    "mkdir -p .keelwork",
    "[ -f .keelwork/.gitignore ] || echo '*' > .keelwork/.gitignore",
    // A server started before pid tracking existed is found through /proc.
    "if ! { [ -f .keelwork/dev.pid ] && kill -0 \"$(cat .keelwork/dev.pid)\" 2>/dev/null; }; then",
    // (Patterns are built from variables so this script's own command line doesn't match.)
    "  n=next; r=run; found=3",
    "  for d in /proc/[0-9]*; do q=${d#/proc/}; [ \"$q\" = $$ ] && continue; c=$(tr '\\0' ' ' < \"$d/cmdline\" 2>/dev/null); case \"$c\" in *\"$n dev\"*|*\"$n-server\"*|*\"pnpm $r dev\"*) kill -KILL \"$q\" 2>/dev/null; found=0;; esac; done",
    "  [ $found = 0 ] && sleep 1; exit $found",
    "fi",
    "p=$(cat .keelwork/dev.pid); kill -TERM -\"$p\" 2>/dev/null; i=0",
    "while kill -0 \"$p\" 2>/dev/null && [ $i -lt 20 ]; do sleep 0.5; i=$((i+1)); done",
    "kill -KILL -\"$p\" 2>/dev/null; exit 0",
  ].join("\n");
}
export function startDevScript(): string {
  return [
    "mkdir -p .keelwork",
    "[ -f .keelwork/.gitignore ] || echo '*' > .keelwork/.gitignore",
    "rm -rf .next",
    "exec setsid sh -c 'echo $$ > .keelwork/dev.pid; exec pnpm run dev --port 3000 --hostname 0.0.0.0' > .keelwork/dev.log 2>&1",
  ].join("\n");
}

async function readJson(req: IncomingMessage, limit = 4_000_000): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > limit) throw new HttpError(413, "request body is too large");
    chunks.push(c as Buffer);
  }
  if (size === 0) return {};
  try {
    const v = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error();
    return v;
  } catch {
    throw new HttpError(400, "body must be a JSON object");
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

const SANDBOX_RE = /^kw-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type BrokerOptions = {
  token: string;
  docker: DockerRunner;
  appOrigin?: string;
  image?: string;
  network?: string;
  runtime?: string;
  memoryMb?: number;
};

export function createBroker(opts: BrokerOptions) {
  if (!opts.token || opts.token.length < 32) throw new Error("BROKER_TOKEN must be at least 32 characters");
  const { docker } = opts;
  let dockerOk: { at: number; ok: boolean } | null = null;
  const dockerAvailable = async () => {
    if (dockerOk && Date.now() - dockerOk.at < 10_000) return dockerOk.ok;
    dockerOk = { at: Date.now(), ok: await docker.available() };
    return dockerOk.ok;
  };
  const requireDocker = async () => {
    if (!(await dockerAvailable())) throw new HttpError(503, "Docker isn't available on the sandbox host, so sandboxes can't run.");
  };

  async function requireSandbox(id: string) {
    const r = await docker.run(["inspect", "--format", "{{.State.Running}} {{index .Config.Labels \"keelwork.sandbox\"}}", id], { timeoutMs: 10_000 });
    const [running, label] = r.stdout.toString().trim().split(" ");
    if (r.code !== 0 || label !== "1") throw new HttpError(404, "sandbox not found");
    if (running !== "true") throw new HttpError(409, "sandbox is not running");
  }

  const ws = (p: string) => posix.join("/workspace", p);
  const exec = (id: string, argv: string[], extra: { input?: Buffer; timeoutMs?: number; detach?: boolean } = {}) =>
    docker.run(["exec", ...(extra.input ? ["-i"] : []), ...(extra.detach ? ["-d"] : []), "--workdir", "/workspace", id, ...argv], { input: extra.input, timeoutMs: extra.timeoutMs ?? 60_000 });

  async function writeFile(id: string, path: string, content: Buffer) {
    const dir = posix.dirname(path);
    if (dir !== ".") {
      const mk = await exec(id, ["mkdir", "-p", "--", ws(dir)]);
      if (mk.code !== 0) throw new HttpError(500, "couldn't create the folder");
    }
    const r = await exec(id, ["tee", "--", ws(path)], { input: content });
    if (r.code !== 0) throw new HttpError(500, "couldn't write the file");
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://broker.invalid");
    const method = req.method ?? "GET";

    if (method === "GET" && url.pathname === "/health") {
      return send(res, 200, { ok: true, docker: await dockerAvailable() });
    }
    const auth = req.headers.authorization ?? "";
    const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!given || !tokenMatches(given, opts.token)) throw new HttpError(401, "unauthorized");

    if (method === "POST" && url.pathname === "/sandboxes") {
      const body = await readJson(req);
      const projectId = String(body.projectId ?? "");
      let name: string;
      try { name = containerName(projectId); } catch { throw new HttpError(400, "invalid projectId"); }
      await requireDocker();
      const existing = await docker.run(["inspect", "--format", "{{.State.Running}}", name], { timeoutMs: 10_000 });
      if (existing.code === 0) {
        if (existing.stdout.toString().trim() !== "true") {
          const st = await docker.run(["start", name], { timeoutMs: 60_000 });
          if (st.code !== 0) throw new HttpError(500, "couldn't start the sandbox");
        }
        return send(res, 200, { id: name, status: "running" });
      }
      const r = await docker.run(buildRunArgs({ projectId, image: opts.image, network: opts.network, runtime: opts.runtime, appOrigin: opts.appOrigin, memoryMb: opts.memoryMb }), { timeoutMs: 120_000 });
      if (r.code !== 0) throw new HttpError(500, "couldn't create the sandbox");
      return send(res, 201, { id: name, status: "running" });
    }

    const m = /^\/sandboxes\/([^/]+)(?:\/(files|list|exec|env|serve|port))?$/.exec(url.pathname);
    if (!m) throw new HttpError(404, "not found");
    const id = decodeURIComponent(m[1]!);
    if (!SANDBOX_RE.test(id)) throw new HttpError(400, "invalid sandbox id");
    const sub = m[2];

    if (!sub && method === "DELETE") {
      await requireDocker();
      await docker.run(["rm", "--force", id], { timeoutMs: 60_000 });
      return send(res, 200, { ok: true });
    }

    if (sub === "files") {
      if (method === "POST") {
        const body = await readJson(req);
        const why = checkPath(body.path, { write: true });
        if (why) throw new HttpError(403, why);
        if (typeof body.content !== "string") throw new HttpError(400, "content must be base64 text");
        const content = Buffer.from(body.content, "base64");
        if (content.length > 1_000_000) throw new HttpError(413, "files are limited to 1 MB");
        await requireDocker(); await requireSandbox(id);
        await writeFile(id, body.path as string, content);
        return send(res, 200, { ok: true });
      }
      const path = url.searchParams.get("path");
      if (method === "GET") {
        const why = checkPath(path);
        if (why) throw new HttpError(403, why);
        await requireDocker(); await requireSandbox(id);
        const r = await exec(id, ["cat", "--", ws(path!)]);
        if (r.code !== 0) throw new HttpError(404, "file not found");
        return send(res, 200, { content: r.stdout.toString("base64"), encoding: "base64" });
      }
      if (method === "DELETE") {
        const why = checkPath(path, { write: true });
        if (why) throw new HttpError(403, why);
        if (url.searchParams.get("approved") !== "1") throw new HttpError(403, "deleting a file needs a person's approval");
        await requireDocker(); await requireSandbox(id);
        const r = await exec(id, ["rm", "-f", "--", ws(path!)]);
        if (r.code !== 0) throw new HttpError(500, "couldn't delete the file");
        return send(res, 200, { ok: true });
      }
    }

    if (sub === "list" && method === "GET") {
      const path = url.searchParams.get("path") ?? ".";
      const why = checkPath(path);
      if (why) throw new HttpError(403, why);
      await requireDocker(); await requireSandbox(id);
      const r = await exec(id, ["find", ws(path), "-mindepth", "1", "-maxdepth", "1", "-printf", "%y\t%s\t%f\n"]);
      if (r.code !== 0) throw new HttpError(404, "folder not found");
      const entries = r.stdout.toString("utf8").split("\n").filter(Boolean).map((line) => {
        const [type, size, name] = line.split("\t");
        return { name: name!, type: type === "d" ? "dir" : "file", size: Number(size) || 0 };
      }).filter((e) => e.name !== ".git").sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
      return send(res, 200, { entries });
    }

    if (sub === "exec" && method === "POST") {
      const body = await readJson(req);
      const d = checkCommand(body.argv);
      if (d.decision === "deny") throw new HttpError(403, d.reason);
      if (d.decision === "require_approval" && body.approved !== true) throw new HttpError(403, `needs a person's approval: ${d.reason}`);
      await requireDocker(); await requireSandbox(id);
      const r = await exec(id, body.argv as string[], { timeoutMs: 10 * 60_000 });
      return send(res, 200, { exitCode: r.code, stdout: r.stdout.toString("utf8"), stderr: r.stderr.toString("utf8"), timedOut: r.timedOut });
    }

    if (sub === "env" && method === "PUT") {
      const body = await readJson(req);
      const vars = body.vars;
      if (!vars || typeof vars !== "object" || Array.isArray(vars)) throw new HttpError(400, "vars must be an object");
      for (const [k, v] of Object.entries(vars as Record<string, unknown>)) {
        const why = platformEnvRefusal(k);
        if (why) throw new HttpError(403, why);
        if (typeof v !== "string" || v.length > 32_768) throw new HttpError(400, `${k} must be text`);
        if (v === opts.token) throw new HttpError(403, "refusing to write the broker token into a sandbox");
      }
      await requireDocker(); await requireSandbox(id);
      await writeFile(id, ".env.local", Buffer.from(toDotenv(vars as Record<string, string>)));
      return send(res, 200, { ok: true });
    }

    if (sub === "serve" && method === "POST") {
      const body = await readJson(req);
      await requireDocker(); await requireSandbox(id);
      const stopped = await exec(id, ["sh", "-c", stopDevScript()], { timeoutMs: 30_000 });
      if (body.onlyIfRunning === true && stopped.code === 3) return send(res, 200, { ok: true, started: false });
      const r = await exec(id, ["sh", "-c", startDevScript()], { detach: true });
      if (r.code !== 0) throw new HttpError(500, "couldn't start the dev server");
      return send(res, 200, { ok: true });
    }

    if (sub === "port" && method === "GET") {
      await requireDocker(); await requireSandbox(id);
      const r = await docker.run(["port", id, "3000/tcp"], { timeoutMs: 10_000 });
      const match = /127\.0\.0\.1:(\d{2,5})/.exec(r.stdout.toString());
      if (r.code !== 0 || !match) throw new HttpError(409, "the dev server isn't published; the sandbox has no network");
      return send(res, 200, { port: Number(match[1]) });
    }

    throw new HttpError(405, "method not allowed");
  }

  return createServer((req, res) => {
    handle(req, res).catch((e) => {
      if (e instanceof HttpError) send(res, e.status, { error: e.message });
      else { console.error("[broker]", (e as Error).message); send(res, 500, { error: "internal error" }); }
    });
  });
}

if (process.argv[1] && /sandbox-broker\/server\.ts$/.test(process.argv[1])) {
  const token = process.env.BROKER_TOKEN ?? "";
  const server = createBroker({
    token, docker: realDocker(), appOrigin: process.env.KW_APP_ORIGIN,
    image: process.env.SANDBOX_IMAGE, network: process.env.SANDBOX_NETWORK, runtime: process.env.SANDBOX_RUNTIME,
    memoryMb: process.env.SANDBOX_MEMORY_MB ? Number(process.env.SANDBOX_MEMORY_MB) : undefined,
  });
  const port = Number(process.env.PORT ?? 7070);
  const host = process.env.HOST || "0.0.0.0";
  server.listen(port, host, () => console.log(`[broker] listening on ${host}:${port}`));
}
