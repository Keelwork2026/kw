import { routeFor, costMicros, estimateMicros, type Catalog, type Route } from "./catalog";
import { callOpenAICompatible, ProviderError, type ChatMessage, type Completion, type FetchLike } from "./providers";

export class GatewayError extends Error {}

export type UsageRecord = { route: Route; model: string; inputTokens: number; outputTokens: number; costMicros: number };

export type GatewayDeps = {
  catalog: Catalog | null;
  env: Record<string, string | undefined>;
  /** Must throw when the organization can't spend this much (assert_can_spend). */
  assertCanSpend: (estimateMicros: number) => Promise<void>;
  /** Writes a usage_events row, which debits the credit ledger. */
  meter: (usage: UsageRecord) => Promise<void>;
  fetch?: FetchLike;
  timeoutMs?: number;
};

export type CompleteInput = { route: Route; messages: ChatMessage[]; maxOutputTokens?: number; json?: boolean; temperature?: number };

/**
 * The AI gateway. Tries each model of the route in order; timeouts, 429s,
 * 5xx and network errors fall back to the next model, other 4xx fail fast.
 * Every successful call is metered at the catalogue price.
 */
export function createGateway(deps: GatewayDeps) {
  return {
    configured: deps.catalog !== null,
    async complete(input: CompleteInput): Promise<Completion & { costMicros: number }> {
      if (!deps.catalog) throw new GatewayError("AI isn't configured on this Keelwork installation.");
      const models = routeFor(deps.catalog, input.route);
      if (models.length === 0) throw new GatewayError(`No model is configured for the ${input.route} route.`);

      const inputChars = input.messages.reduce((n, m) => n + m.content.length, 0);
      await deps.assertCanSpend(estimateMicros(models, inputChars, input.maxOutputTokens));

      let lastRetryable = "";
      for (const spec of models) {
        const apiKey = deps.env[spec.apiKeyEnv];
        if (!apiKey) { lastRetryable = `${spec.id} has no API key`; continue; }
        try {
          const result = await callOpenAICompatible(spec, input.messages, {
            maxOutputTokens: input.maxOutputTokens ?? spec.maxOutputTokens,
            json: input.json, temperature: input.temperature,
            timeoutMs: deps.timeoutMs ?? 120_000, apiKey, fetch: deps.fetch,
          });
          const cost = costMicros(spec, result.inputTokens, result.outputTokens);
          await deps.meter({ route: input.route, model: spec.id, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costMicros: cost });
          return { ...result, costMicros: cost };
        } catch (e) {
          if (e instanceof ProviderError && e.retryable) { lastRetryable = `${spec.id}: ${e.message}`; continue; }
          if (e instanceof ProviderError) throw new GatewayError("The AI provider rejected the request.");
          throw e;
        }
      }
      throw new GatewayError(`AI is unavailable right now (${lastRetryable || "no model answered"}). Try again shortly.`);
    },
  };
}
export type Gateway = ReturnType<typeof createGateway>;
