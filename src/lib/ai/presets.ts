import type { Catalog } from "./catalog";

/**
 * Keelwork's stack catalogue: Kimi (Moonshot AI) for architecture,
 * planning and reasoning; DeepSeek for code and review. Each is the
 * other's fallback.
 *
 * PRICES MUST BE CHECKED BEFORE LAUNCH. Billing charges customers exactly
 * these numbers (micros per million tokens). DeepSeek is priced at its peak
 * rate so off-peak calls are never under-charged.
 */
export function keelworkStackCatalog({ kimiRegion = "global" }: { kimiRegion?: "global" | "china" } = {}): Catalog {
  return {
    models: [
      {
        id: "kimi",
        provider: "openai-compatible",
        model: "kimi-k3.1-pro",
        baseUrl: kimiRegion === "china" ? "https://api.moonshot.cn/v1" : "https://api.moonshot.ai/v1",
        apiKeyEnv: "MOONSHOT_API_KEY",
        inputPerMTokMicros: 2_000_000,
        outputPerMTokMicros: 10_000_000,
        maxOutputTokens: 16_000,
      },
      {
        id: "deepseek",
        provider: "openai-compatible",
        model: "deepseek-flash",
        baseUrl: "https://api.deepseek.com",
        apiKeyEnv: "DEEPSEEK_API_KEY",
        inputPerMTokMicros: 300_000,
        outputPerMTokMicros: 1_200_000,
        maxOutputTokens: 8_000,
      },
    ],
    routes: {
      plan: ["kimi", "deepseek"],
      reason: ["kimi", "deepseek"],
      chat: ["kimi", "deepseek"],
      code: ["deepseek", "kimi"],
      review: ["deepseek", "kimi"],
    },
  };
}
