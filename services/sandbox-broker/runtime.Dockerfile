# keelwork/runtime-node:22 — the image every project sandbox runs.
# Build on the broker host:  docker build -f runtime.Dockerfile -t keelwork/runtime-node:22 .
FROM node:22-bookworm-slim
# pnpm is installed globally (not through a Corepack shim): Corepack keeps its
# cache under $HOME, which is the per-sandbox /workspace at run time, so a
# prepared version wouldn't be found and the latest pnpm would be fetched.
RUN corepack disable && npm install -g pnpm@10.28.0 && rm -rf /root/.npm \
 && apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*
# pnpm's store lives in the writable /workspace tmpfs (the root filesystem is read-only).
ENV PNPM_HOME=/workspace/.pnpm-home \
    npm_config_store_dir=/workspace/.pnpm-store \
    npm_config_cache=/workspace/.npm-cache \
    HOME=/workspace \
    NEXT_TELEMETRY_DISABLED=1
USER 1000:1000
WORKDIR /workspace
CMD ["sleep", "infinity"]
