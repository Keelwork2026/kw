# keelwork/runtime-node:22 — the image every project sandbox runs.
# Build on the broker host:  docker build -f runtime.Dockerfile -t keelwork/runtime-node:22 .
FROM node:22-bookworm-slim
# pnpm is installed globally (not through a Corepack shim): Corepack keeps its
# cache under $HOME, which is the per-sandbox /workspace at run time, so a
# prepared version wouldn't be found and the latest pnpm would be fetched.
RUN corepack disable && npm install -g pnpm@10.28.0 && rm -rf /root/.npm \
 && apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && printf '%s\n' '.pnpm-store/' '.pnpm-home/' '.npm-cache/' '.npm/' '.cache/' '.local/' > /etc/gitignore-sandbox \
 && git config --system core.excludesFile /etc/gitignore-sandbox
# HOME is the project folder (/workspace), so package-manager stores and caches
# land beside the code. The system-wide excludes file above keeps them out of
# commits, exports and code scans.
# pnpm's store lives in the writable /workspace tmpfs (the root filesystem is read-only).
# Lower install concurrency: with the defaults pnpm's own memory peaked above
# 2 GB, and the sandbox's memory limit also has to hold the /workspace tmpfs.
ENV npm_config_network_concurrency=4 npm_config_child_concurrency=2 npm_config_workspace_concurrency=1
ENV PNPM_HOME=/workspace/.pnpm-home \
    npm_config_store_dir=/workspace/.pnpm-store \
    npm_config_cache=/workspace/.npm-cache \
    HOME=/workspace \
    NEXT_TELEMETRY_DISABLED=1
USER 1000:1000
WORKDIR /workspace
CMD ["sleep", "infinity"]
