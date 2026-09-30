import { AbortError, withRetry } from "./retry";



export interface ChatJsonParams {
  apiKey: string;
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}

export class LlmResponseError extends Error {}

const DEFAULT_MODEL = "gpt-4o-mini";

export async function chatJson(params: ChatJsonParams): Promise<unknown> {
  const model = params.model ?? DEFAULT_MODEL;

  return withRetry(
    async () => {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: params.temperature ?? 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: params.user },
          ],
        }),
      });

      if (res.status === 429 || res.status >= 500) {
        // Retryable: rate-limited or a transient provider-side failure.
        throw new Error(`OpenAI transient error (status ${res.status})`);
      }
      if (!res.ok) {
        const body = await res.text();
        throw new AbortError(`OpenAI request failed (status ${res.status}): ${body}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new LlmResponseError("OpenAI response missing message content");
      }

      try {
        return JSON.parse(content);
      } catch {
        // A JSON-mode response can still occasionally be truncated or
        // malformed — worth a retry rather than an immediate failure.
        throw new Error("Model returned invalid JSON");
      }
    },
    { retries: 4 },
  );
}
