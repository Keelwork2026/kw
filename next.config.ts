import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Security headers (CSP with a per-request nonce) are set in src/middleware.ts.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default config;
