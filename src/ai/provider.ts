import type { AIProvider } from "./config.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionResult {
  content: string;
  model: string;
  usage?: { input_tokens: number; output_tokens: number };
}

interface ProviderEndpoint {
  url: string;
  headers: (apiKey: string) => Record<string, string>;
  body: (model: string, messages: ChatMessage[]) => Record<string, unknown>;
  parse: (json: unknown) => CompletionResult;
}

const ENDPOINTS: Record<AIProvider, ProviderEndpoint> = {
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    headers: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "clipx",
    }),
    body: (model, messages) => ({ model, messages }),
    parse: (json: any) => ({
      content: json.choices[0].message.content,
      model: json.model,
      usage: json.usage
        ? {
            input_tokens: json.usage.prompt_tokens,
            output_tokens: json.usage.completion_tokens,
          }
        : undefined,
    }),
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    headers: (apiKey) => ({
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    }),
    body: (model, messages) => {
      const system = messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n");
      const userMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));
      return {
        model,
        max_tokens: 4096,
        ...(system ? { system } : {}),
        messages: userMessages,
      };
    },
    parse: (json: any) => ({
      content: json.content[0].text,
      model: json.model,
      usage: json.usage
        ? {
            input_tokens: json.usage.input_tokens,
            output_tokens: json.usage.output_tokens,
          }
        : undefined,
    }),
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    headers: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    body: (model, messages) => ({ model, messages }),
    parse: (json: any) => ({
      content: json.choices[0].message.content,
      model: json.model,
      usage: json.usage
        ? {
            input_tokens: json.usage.prompt_tokens,
            output_tokens: json.usage.completion_tokens,
          }
        : undefined,
    }),
  },
};

export async function complete(
  provider: AIProvider,
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<CompletionResult> {
  const endpoint = ENDPOINTS[provider];

  const response = await fetch(endpoint.url, {
    method: "POST",
    headers: endpoint.headers(apiKey),
    body: JSON.stringify(endpoint.body(model, messages)),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `${provider} API error (${response.status}): ${text}`
    );
  }

  const json = await response.json();
  return endpoint.parse(json);
}
