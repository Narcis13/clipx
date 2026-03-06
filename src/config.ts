import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface ClipxConfig {
  history: {
    enabled: boolean;
    maxEntries: number;
    dbPath: string;
    excludeTypes: string[];
    excludeApps: string[];
  };
  ai: {
    provider: string;
    model: string;
    apiKey: string | null;
  };
  detection: {
    secretRedaction: boolean;
    minConfidence: number;
  };
  watch: {
    pollInterval: number;
    debounce: number;
  };
}

const CONFIG_DIR = join(homedir(), ".config", "clipx");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const DEFAULTS: ClipxConfig = {
  history: {
    enabled: true,
    maxEntries: 1000,
    dbPath: join(homedir(), ".local", "share", "clipx", "history.db"),
    excludeTypes: ["secret"],
    excludeApps: ["1Password", "Keychain Access"],
  },
  ai: {
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4",
    apiKey: null,
  },
  detection: {
    secretRedaction: true,
    minConfidence: 0.7,
  },
  watch: {
    pollInterval: 300,
    debounce: 500,
  },
};

// Env var overrides mapping: ENV_VAR -> config path
const ENV_OVERRIDES: Record<string, { path: string[]; parse: (v: string) => unknown }> = {
  CLIPX_HISTORY_ENABLED: { path: ["history", "enabled"], parse: (v) => v === "true" || v === "1" },
  CLIPX_HISTORY_MAX_ENTRIES: { path: ["history", "maxEntries"], parse: (v) => parseInt(v, 10) },
  CLIPX_HISTORY_DB_PATH: { path: ["history", "dbPath"], parse: (v) => v },
  CLIPX_AI_PROVIDER: { path: ["ai", "provider"], parse: (v) => v },
  CLIPX_AI_MODEL: { path: ["ai", "model"], parse: (v) => v },
  CLIPX_AI_API_KEY: { path: ["ai", "apiKey"], parse: (v) => v },
  CLIPX_DETECTION_SECRET_REDACTION: { path: ["detection", "secretRedaction"], parse: (v) => v === "true" || v === "1" },
  CLIPX_DETECTION_MIN_CONFIDENCE: { path: ["detection", "minConfidence"], parse: (v) => parseFloat(v) },
  CLIPX_WATCH_POLL_INTERVAL: { path: ["watch", "pollInterval"], parse: (v) => parseInt(v, 10) },
  CLIPX_WATCH_DEBOUNCE: { path: ["watch", "debounce"], parse: (v) => parseInt(v, 10) },
};

// Legacy ai/config.ts saved provider/model/apiKey at root level.
// Migrate them into the ai section.
const LEGACY_AI_KEYS = ["provider", "model", "apiKey"];

function readConfigFile(configPath: string = CONFIG_FILE): Record<string, unknown> {
  if (!existsSync(configPath)) return {};
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;

    // Migrate flat legacy AI keys into ai section
    const hasLegacy = LEGACY_AI_KEYS.some((k) => k in raw && typeof raw[k] !== "object");
    if (hasLegacy) {
      if (!raw.ai || typeof raw.ai !== "object") raw.ai = {};
      const ai = raw.ai as Record<string, unknown>;
      for (const key of LEGACY_AI_KEYS) {
        if (key in raw && typeof raw[key] !== "object") {
          if (!(key in ai)) ai[key] = raw[key];
          delete raw[key];
        }
      }
    }

    return raw;
  } catch {
    return {};
  }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      typeof target[key] === "object" &&
      target[key] !== null &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (typeof current[path[i]] !== "object" || current[path[i]] === null) {
      current[path[i]] = {};
    }
    current = current[path[i]] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}

function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function applyEnvOverrides(config: Record<string, unknown>): void {
  for (const [envVar, { path, parse }] of Object.entries(ENV_OVERRIDES)) {
    const value = process.env[envVar];
    if (value !== undefined) {
      setNestedValue(config, path, parse(value));
    }
  }
}

let _cached: ClipxConfig | null = null;

export function loadConfig(configPath?: string): ClipxConfig {
  if (_cached && !configPath) return _cached;

  const fileConfig = readConfigFile(configPath);
  const merged = deepMerge(
    DEFAULTS as unknown as Record<string, unknown>,
    fileConfig
  );
  applyEnvOverrides(merged);

  const config = merged as unknown as ClipxConfig;
  if (!configPath) _cached = config;
  return config;
}

export function resetConfigCache(): void {
  _cached = null;
}

export function saveConfig(
  key: string,
  value: unknown,
  configPath: string = CONFIG_FILE
): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const existing = readConfigFile(configPath);
  const path = key.split(".");
  setNestedValue(existing, path, value);

  writeFileSync(configPath, JSON.stringify(existing, null, 2) + "\n");
  _cached = null;
}

export function getConfigValue(key: string, configPath?: string): unknown {
  const config = loadConfig(configPath);
  const path = key.split(".");
  return getNestedValue(config as unknown as Record<string, unknown>, path);
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export { DEFAULTS as CONFIG_DEFAULTS };
