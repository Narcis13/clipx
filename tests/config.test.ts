import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// We test the functions directly by importing and using a temp config path
import { loadConfig, saveConfig, getConfigValue, resetConfigCache, CONFIG_DEFAULTS } from "../src/config.js";

const TEST_DIR = join(tmpdir(), `clipx-config-test-${Date.now()}`);
const TEST_CONFIG = join(TEST_DIR, "config.json");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  resetConfigCache();
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  resetConfigCache();
});

describe("config - defaults", () => {
  it("returns all defaults when no config file exists", () => {
    const config = loadConfig(join(TEST_DIR, "nonexistent.json"));
    expect(config.history.enabled).toBe(true);
    expect(config.history.maxEntries).toBe(1000);
    expect(config.history.excludeTypes).toEqual(["secret"]);
    expect(config.detection.secretRedaction).toBe(true);
    expect(config.detection.minConfidence).toBe(0.7);
    expect(config.watch.pollInterval).toBe(300);
    expect(config.watch.debounce).toBe(500);
    expect(config.ai.provider).toBe("openrouter");
  });

  it("has correct default structure", () => {
    expect(CONFIG_DEFAULTS).toHaveProperty("history");
    expect(CONFIG_DEFAULTS).toHaveProperty("ai");
    expect(CONFIG_DEFAULTS).toHaveProperty("detection");
    expect(CONFIG_DEFAULTS).toHaveProperty("watch");
  });
});

describe("config - file loading", () => {
  it("merges file config with defaults", () => {
    const partial = { history: { maxEntries: 500 } };
    Bun.write(TEST_CONFIG, JSON.stringify(partial));

    const config = loadConfig(TEST_CONFIG);
    expect(config.history.maxEntries).toBe(500);
    expect(config.history.enabled).toBe(true); // default preserved
    expect(config.detection.secretRedaction).toBe(true); // other section defaults preserved
  });

  it("handles malformed config file gracefully", () => {
    Bun.write(TEST_CONFIG, "not valid json{{{");

    const config = loadConfig(TEST_CONFIG);
    // Should fall back to all defaults
    expect(config.history.enabled).toBe(true);
    expect(config.watch.debounce).toBe(500);
  });

  it("handles empty config file", () => {
    Bun.write(TEST_CONFIG, "{}");

    const config = loadConfig(TEST_CONFIG);
    expect(config.history.maxEntries).toBe(1000);
  });
});

describe("config - save", () => {
  it("saves a top-level nested key", () => {
    saveConfig("history.maxEntries", 2000, TEST_CONFIG);

    const raw = JSON.parse(readFileSync(TEST_CONFIG, "utf-8"));
    expect(raw.history.maxEntries).toBe(2000);
  });

  it("saves a deeply nested key", () => {
    saveConfig("detection.minConfidence", 0.5, TEST_CONFIG);

    const raw = JSON.parse(readFileSync(TEST_CONFIG, "utf-8"));
    expect(raw.detection.minConfidence).toBe(0.5);
  });

  it("preserves existing keys when saving", () => {
    saveConfig("history.maxEntries", 2000, TEST_CONFIG);
    saveConfig("watch.debounce", 1000, TEST_CONFIG);

    const raw = JSON.parse(readFileSync(TEST_CONFIG, "utf-8"));
    expect(raw.history.maxEntries).toBe(2000);
    expect(raw.watch.debounce).toBe(1000);
  });

  it("saves array values", () => {
    saveConfig("history.excludeTypes", ["secret", "image"], TEST_CONFIG);

    const raw = JSON.parse(readFileSync(TEST_CONFIG, "utf-8"));
    expect(raw.history.excludeTypes).toEqual(["secret", "image"]);
  });

  it("saves boolean values", () => {
    saveConfig("history.enabled", false, TEST_CONFIG);

    const raw = JSON.parse(readFileSync(TEST_CONFIG, "utf-8"));
    expect(raw.history.enabled).toBe(false);
  });
});

describe("config - getConfigValue", () => {
  it("gets a nested value", () => {
    Bun.write(TEST_CONFIG, JSON.stringify({ watch: { debounce: 999 } }));

    const val = getConfigValue("watch.debounce", TEST_CONFIG);
    expect(val).toBe(999);
  });

  it("gets a section object", () => {
    const val = getConfigValue("history", join(TEST_DIR, "nonexistent.json"));
    expect(val).toHaveProperty("enabled");
    expect(val).toHaveProperty("maxEntries");
  });

  it("returns undefined for unknown keys", () => {
    const val = getConfigValue("nonexistent.key", join(TEST_DIR, "nonexistent.json"));
    expect(val).toBeUndefined();
  });
});

describe("config - env overrides", () => {
  it("CLIPX_HISTORY_MAX_ENTRIES overrides file value", () => {
    Bun.write(TEST_CONFIG, JSON.stringify({ history: { maxEntries: 500 } }));

    const original = process.env.CLIPX_HISTORY_MAX_ENTRIES;
    process.env.CLIPX_HISTORY_MAX_ENTRIES = "9999";
    resetConfigCache();

    try {
      const config = loadConfig(TEST_CONFIG);
      expect(config.history.maxEntries).toBe(9999);
    } finally {
      if (original !== undefined) {
        process.env.CLIPX_HISTORY_MAX_ENTRIES = original;
      } else {
        delete process.env.CLIPX_HISTORY_MAX_ENTRIES;
      }
    }
  });

  it("CLIPX_WATCH_DEBOUNCE overrides default", () => {
    const original = process.env.CLIPX_WATCH_DEBOUNCE;
    process.env.CLIPX_WATCH_DEBOUNCE = "1500";
    resetConfigCache();

    try {
      const config = loadConfig(join(TEST_DIR, "nonexistent.json"));
      expect(config.watch.debounce).toBe(1500);
    } finally {
      if (original !== undefined) {
        process.env.CLIPX_WATCH_DEBOUNCE = original;
      } else {
        delete process.env.CLIPX_WATCH_DEBOUNCE;
      }
    }
  });

  it("CLIPX_DETECTION_SECRET_REDACTION boolean parsing", () => {
    const original = process.env.CLIPX_DETECTION_SECRET_REDACTION;
    process.env.CLIPX_DETECTION_SECRET_REDACTION = "false";
    resetConfigCache();

    try {
      const config = loadConfig(join(TEST_DIR, "nonexistent.json"));
      expect(config.detection.secretRedaction).toBe(false);
    } finally {
      if (original !== undefined) {
        process.env.CLIPX_DETECTION_SECRET_REDACTION = original;
      } else {
        delete process.env.CLIPX_DETECTION_SECRET_REDACTION;
      }
    }
  });
});
