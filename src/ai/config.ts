import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { $ } from "bun";

export type AIProvider = "openrouter" | "anthropic" | "openai";

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
}

const CONFIG_DIR = join(homedir(), ".config", "clipx");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openrouter: "anthropic/claude-sonnet-4",
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
};

const ENV_KEY_MAP: Record<AIProvider, string> = {
  openrouter: "OPENROUTER_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

const KEYCHAIN_SERVICE = "clipx";

function readConfigFile(): Partial<AIConfig> {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeConfigFile(config: Partial<AIConfig>): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const existing = readConfigFile();
  writeFileSync(
    CONFIG_FILE,
    JSON.stringify({ ...existing, ...config }, null, 2) + "\n"
  );
}

async function readKeychain(provider: AIProvider): Promise<string | null> {
  if (process.platform !== "darwin") return null;
  try {
    const account = `${provider}-api-key`;
    const result =
      await $`security find-generic-password -s ${KEYCHAIN_SERVICE} -a ${account} -w 2>/dev/null`.text();
    const key = result.trim();
    return key || null;
  } catch {
    return null;
  }
}

async function writeKeychain(
  provider: AIProvider,
  key: string
): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("Keychain storage is only supported on macOS");
  }
  const account = `${provider}-api-key`;
  // Delete existing entry if present (ignore errors)
  try {
    await $`security delete-generic-password -s ${KEYCHAIN_SERVICE} -a ${account} 2>/dev/null`.quiet();
  } catch {
    // ignore
  }
  await $`security add-generic-password -s ${KEYCHAIN_SERVICE} -a ${account} -w ${key}`;
}

export async function resolveApiKey(
  provider: AIProvider
): Promise<string | null> {
  // 1. Environment variable
  const envKey = process.env[ENV_KEY_MAP[provider]];
  if (envKey) return envKey;

  // 2. OS keychain (macOS)
  const keychainKey = await readKeychain(provider);
  if (keychainKey) return keychainKey;

  // 3. Config file
  const config = readConfigFile();
  if (config.apiKey) return config.apiKey;

  return null;
}

export async function getConfig(): Promise<AIConfig> {
  const file = readConfigFile();
  const provider = (file.provider as AIProvider) || "openrouter";
  const model = file.model || DEFAULT_MODELS[provider];
  const apiKey = (await resolveApiKey(provider)) ?? undefined;
  return { provider, model, apiKey };
}

export async function setConfig(opts: {
  provider?: AIProvider;
  model?: string;
  key?: string;
  keychain?: boolean;
}): Promise<void> {
  const updates: Partial<AIConfig> = {};
  if (opts.provider) updates.provider = opts.provider;
  if (opts.model) updates.model = opts.model;

  if (opts.key) {
    const provider = opts.provider || (readConfigFile().provider as AIProvider) || "openrouter";
    if (opts.keychain) {
      await writeKeychain(provider, opts.key);
    } else {
      updates.apiKey = opts.key;
    }
  }

  writeConfigFile(updates);
}

export { DEFAULT_MODELS, ENV_KEY_MAP };
