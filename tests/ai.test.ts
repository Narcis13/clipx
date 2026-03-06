import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

// --- Provider tests ---

describe("ai/provider", () => {
  test("complete() calls OpenRouter endpoint correctly", async () => {
    const mockResponse = {
      choices: [{ message: { content: "fixed code" } }],
      model: "anthropic/claude-sonnet-4",
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async (url: string, init: any) => {
      expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
      const headers = init.headers;
      expect(headers["Authorization"]).toBe("Bearer test-key");
      expect(headers["X-Title"]).toBe("clipx");
      const body = JSON.parse(init.body);
      expect(body.model).toBe("anthropic/claude-sonnet-4");
      expect(body.messages).toHaveLength(2);
      return new Response(JSON.stringify(mockResponse));
    }) as any;

    const { complete } = await import("../src/ai/provider.js");
    const result = await complete("openrouter", "test-key", "anthropic/claude-sonnet-4", [
      { role: "system", content: "Fix code" },
      { role: "user", content: "const x = " },
    ]);

    expect(result.content).toBe("fixed code");
    expect(result.usage?.input_tokens).toBe(10);
    expect(result.usage?.output_tokens).toBe(20);

    globalThis.fetch = originalFetch;
  });

  test("complete() calls Anthropic endpoint correctly", async () => {
    const mockResponse = {
      content: [{ text: "explained" }],
      model: "claude-sonnet-4-20250514",
      usage: { input_tokens: 5, output_tokens: 15 },
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async (url: string, init: any) => {
      expect(url).toBe("https://api.anthropic.com/v1/messages");
      const headers = init.headers;
      expect(headers["x-api-key"]).toBe("test-key");
      expect(headers["anthropic-version"]).toBe("2023-06-01");
      const body = JSON.parse(init.body);
      expect(body.system).toBe("Explain code");
      expect(body.messages).toHaveLength(1); // system extracted
      expect(body.messages[0].role).toBe("user");
      expect(body.max_tokens).toBe(4096);
      return new Response(JSON.stringify(mockResponse));
    }) as any;

    const { complete } = await import("../src/ai/provider.js");
    const result = await complete("anthropic", "test-key", "claude-sonnet-4-20250514", [
      { role: "system", content: "Explain code" },
      { role: "user", content: "function foo() {}" },
    ]);

    expect(result.content).toBe("explained");
    globalThis.fetch = originalFetch;
  });

  test("complete() calls OpenAI endpoint correctly", async () => {
    const mockResponse = {
      choices: [{ message: { content: "summary" } }],
      model: "gpt-4o",
      usage: { prompt_tokens: 8, completion_tokens: 12 },
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async (url: string, init: any) => {
      expect(url).toBe("https://api.openai.com/v1/chat/completions");
      const headers = init.headers;
      expect(headers["Authorization"]).toBe("Bearer test-key");
      return new Response(JSON.stringify(mockResponse));
    }) as any;

    const { complete } = await import("../src/ai/provider.js");
    const result = await complete("openai", "test-key", "gpt-4o", [
      { role: "system", content: "Summarize" },
      { role: "user", content: "Long text..." },
    ]);

    expect(result.content).toBe("summary");
    globalThis.fetch = originalFetch;
  });

  test("complete() throws on API error", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      return new Response("Unauthorized", { status: 401 });
    }) as any;

    const { complete } = await import("../src/ai/provider.js");
    expect(
      complete("openrouter", "bad-key", "model", [
        { role: "user", content: "hi" },
      ])
    ).rejects.toThrow("openrouter API error (401)");

    globalThis.fetch = originalFetch;
  });
});

// --- Config tests ---

describe("ai/config", () => {
  const { existsSync, readFileSync, writeFileSync, mkdirSync } = require("fs");
  const { join } = require("path");
  const { homedir } = require("os");

  const CONFIG_DIR = join(homedir(), ".config", "clipx");
  const CONFIG_FILE = join(CONFIG_DIR, "config.json");

  let originalContent: string | null = null;

  beforeEach(() => {
    if (existsSync(CONFIG_FILE)) {
      originalContent = readFileSync(CONFIG_FILE, "utf-8");
    } else {
      originalContent = null;
    }
  });

  afterEach(() => {
    if (originalContent !== null) {
      writeFileSync(CONFIG_FILE, originalContent);
    } else if (existsSync(CONFIG_FILE)) {
      // Remove the file we created
      require("fs").unlinkSync(CONFIG_FILE);
    }
  });

  test("getConfig() returns defaults when no config exists", async () => {
    // Temporarily move config if it exists
    const tmpPath = CONFIG_FILE + ".bak";
    if (existsSync(CONFIG_FILE)) {
      require("fs").renameSync(CONFIG_FILE, tmpPath);
    }

    try {
      const { getConfig } = await import("../src/ai/config.js");
      const config = await getConfig();
      expect(config.provider).toBe("openrouter");
      expect(config.model).toBe("anthropic/claude-sonnet-4");
    } finally {
      if (existsSync(tmpPath)) {
        require("fs").renameSync(tmpPath, CONFIG_FILE);
      }
    }
  });

  test("setConfig() writes provider and model", async () => {
    const { setConfig } = await import("../src/ai/config.js");
    await setConfig({ provider: "anthropic", model: "claude-haiku-4-5-20251001" });

    const saved = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    expect(saved.ai.provider).toBe("anthropic");
    expect(saved.ai.model).toBe("claude-haiku-4-5-20251001");
  });

  test("resolveApiKey() prefers env var", async () => {
    const key = "test-env-key-12345";
    process.env.OPENROUTER_API_KEY = key;

    try {
      const { resolveApiKey } = await import("../src/ai/config.js");
      const resolved = await resolveApiKey("openrouter");
      expect(resolved).toBe(key);
    } finally {
      delete process.env.OPENROUTER_API_KEY;
    }
  });
});
