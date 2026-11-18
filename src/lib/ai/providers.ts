import type { ModelSpec } from "./catalog";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type Completion = { text: string; inputTokens: number; outputTokens: number; model: string };

/** A provider failure. Retryable failures fall back to the next model. */
export class ProviderError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly status?: number) {
    super(message);
  }
}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Calls an OpenAI-compatible /chat/completions endpoint (Kimi and DeepSeek
 * both speak it). The API key is read from the environment variable the
 * catalogue names and is never logged or included in errors.
 */
export async function callOpenAICompatible(
  spec: ModelSpec,
  messages: ChatMessage[],
  opts: { maxOutputTokens: number; temperature?: number; json?: boolean; timeoutMs: number; apiKey: string; fetch?: FetchLike },
): Promise<Completion> {
  const doFetch: FetchLike = opts.fetch ?? ((u, i) => fetch(u, i));
  let res: Response;
  try {
    res = await doFetch(`${spec.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: spec.model,
        messages,
        max_tokens: Math.min(opts.maxOutputTokens, spec.maxOutputTokens),
        temperature: opts.temperature ?? 0.2,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
  } catch (e) {
    const name = (e as Error)?.name;
    throw new ProviderError(name === "TimeoutError" || name === "AbortError" ? "timeout" : "network error", true);
  }
  if (res.status === 429 || res.status >= 500) throw new ProviderError(`provider returned ${res.status}`, true, res.status);
  if (!res.ok) throw new ProviderError("The AI provider rejected the request.", false, res.status);

  let body: { choices?: { message?: { content?: unknown } }[]; usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } };
  try { body = await res.json(); } catch { throw new ProviderError("provider returned invalid JSON", true, res.status); }
  const text = body.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new ProviderError("provider returned no text", true, res.status);
  const inputTokens = Number(body.usage?.prompt_tokens);
  const outputTokens = Number(body.usage?.completion_tokens);
  return {
    text,
    // If a provider omits usage, meter conservatively from the text sizes.
    inputTokens: Number.isFinite(inputTokens) && inputTokens >= 0 ? inputTokens : Math.ceil(JSON.stringify(messages).length / 3),
    outputTokens: Number.isFinite(outputTokens) && outputTokens >= 0 ? outputTokens : Math.ceil(text.length / 3),
    model: spec.id,
  };
}
