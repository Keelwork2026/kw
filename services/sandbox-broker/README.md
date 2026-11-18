# Sandbox broker

Runs generated code in isolated Docker containers on a **dedicated host**, never on the web app's servers.

```sh
docker build -f services/sandbox-broker/runtime.Dockerfile -t keelwork/runtime-node:22 .
BROKER_TOKEN=$(openssl rand -hex 32) KW_APP_ORIGIN=https://app.keelwork.example SANDBOX_RUNTIME=runsc pnpm broker
```

- Every request (except `GET /health`) needs `Authorization: Bearer $BROKER_TOKEN`, compared in constant time.
- Docker is driven with argument arrays only — there is no shell anywhere.
- Every path and command is re-checked with the agents' policy engine (`src/lib/agents/policy.ts`).
- Containers run read-only, as uid 1000, with all capabilities dropped, `no-new-privileges`, 1 GB memory, 256 pids, `--network none` by default and gVisor when `SANDBOX_RUNTIME=runsc`.
- `/workspace` is a tmpfs: stopping a sandbox discards its files. The Git history lives in the sandbox; export the project to keep a copy.
- Without Docker, every sandbox endpoint answers an honest `503`.

| Endpoint | Purpose |
|---|---|
| `GET /health` | `{ ok, docker }` |
| `POST /sandboxes {projectId}` / `DELETE /sandboxes/:id` | create / stop |
| `POST /sandboxes/:id/files {path, content(base64)}` | write a file |
| `GET /sandboxes/:id/files?path=` / `DELETE …?path=&approved=1` | read / delete (deleting needs a person's approval) |
| `GET /sandboxes/:id/list?path=` | list a folder |
| `POST /sandboxes/:id/exec {argv, approved?}` | run an allowed command (10-minute timeout) |
| `PUT /sandboxes/:id/env {vars}` | write `.env.local` from approved secrets (platform names refused) |
| `POST /sandboxes/:id/serve` / `GET /sandboxes/:id/port` | start the dev server / its loopback port for the preview proxy |
