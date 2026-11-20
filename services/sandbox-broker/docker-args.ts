/**
 * Deny-first `docker run` flags for a project sandbox. Everything is an
 * argument array: there is no shell anywhere in the broker.
 */
export type SandboxOptions = {
  projectId: string;
  image?: string;
  /** Name of a dedicated, egress-allowlisted Docker network. Default: none. */
  network?: string;
  /** "runsc" for gVisor. */
  runtime?: string;
  /** Size of /workspace when it's a tmpfs (workspace: "tmpfs"). */
  diskMb?: number;
  /**
   * Where the project's code lives. "volume" (default): a named Docker volume
   * per project (kw-ws-<id>) that survives container restarts, recreation and
   * host reboots. "tmpfs": in memory, lost when the container goes — only for
   * throwaway sandboxes.
   */
  workspace?: "volume" | "tmpfs";
  /** Memory limit. A tmpfs workspace counts against it. */
  memoryMb?: number;
  cpus?: string;
  appOrigin?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function containerName(projectId: string): string {
  if (!UUID_RE.test(projectId)) throw new Error("invalid project id");
  return `kw-${projectId}`;
}

/** The persistent volume holding a project's /workspace (code, git history, installed packages). */
export function workspaceVolume(projectId: string): string {
  if (!UUID_RE.test(projectId)) throw new Error("invalid project id");
  return `kw-ws-${projectId}`;
}

/** Only https origins (or localhost for development) are passed into the sandbox. */
export function safeAppOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  try {
    const u = new URL(origin);
    if (u.pathname !== "/" || u.search || u.hash || u.username || u.password) return null;
    if (u.protocol === "https:") return u.origin;
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return u.origin;
  } catch { /* invalid */ }
  return null;
}

export function buildRunArgs(o: SandboxOptions): string[] {
  const name = containerName(o.projectId);
  const disk = Math.max(256, Math.min(8192, Math.floor(o.diskMb ?? 2048)));
  const memory = Math.max(1024, Math.min(16384, Math.floor(o.memoryMb ?? 3072)));
  const cpus = /^\d+(\.\d+)?$/.test(o.cpus ?? "") ? o.cpus! : "1";
  const network = o.network && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/.test(o.network) && o.network !== "host" ? o.network : "none";
  const args = [
    "run", "--detach",
    "--name", name,
    "--label", "keelwork.sandbox=1",
    "--label", `keelwork.project=${o.projectId}`,
    "--memory", `${memory}m`, "--memory-swap", `${memory}m`,
    "--cpus", cpus,
    "--pids-limit", "256",
    "--read-only",
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=256m",
    ...(o.workspace === "tmpfs"
      ? ["--tmpfs", `/workspace:rw,exec,nosuid,size=${disk}m,uid=1000,gid=1000`]
      // A new named volume copies /workspace from the image, owned by uid 1000 (see runtime.Dockerfile).
      : ["--mount", `type=volume,source=${workspaceVolume(o.projectId)},target=/workspace`]),
    "--workdir", "/workspace",
    "--user", "1000:1000",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "--network", network,
  ];
  if (network !== "none") args.push("--publish", "127.0.0.1::3000");
  if (o.runtime && /^[a-z0-9_-]{1,32}$/.test(o.runtime)) args.push("--runtime", o.runtime);
  const origin = safeAppOrigin(o.appOrigin);
  if (origin) args.push("--env", `NEXT_PUBLIC_KW_APP_ORIGIN=${origin}`);
  args.push(o.image && /^[a-z0-9][a-z0-9._\/:-]{0,200}$/.test(o.image) ? o.image : "keelwork/runtime-node:22");
  args.push("sleep", "infinity");
  return args;
}
