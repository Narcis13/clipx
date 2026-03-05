import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { addEntry, query, getDb, closeDb } from "../src/history/store.js";
import { detectSecret } from "../src/core/secrets.js";
import { detect } from "../src/core/detector.js";

let dbPath: string;

beforeEach(() => {
  closeDb();
  dbPath = mkdtempSync(join(tmpdir(), "clipx-watcher-test-")) + "/history.db";
  getDb(dbPath);
});

afterEach(() => {
  closeDb();
  try {
    rmSync(join(dbPath, ".."), { recursive: true });
  } catch {}
});

describe("watcher integration - change detection", () => {
  it("stores detected entries correctly", () => {
    const content = '{"key": "value"}';
    const detection = detect(content);

    addEntry({
      content,
      type: detection.type,
      language: detection.language,
      confidence: detection.confidence,
    }, dbPath);

    const entries = query({}, dbPath);
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("json");
    expect(entries[0].confidence).toBe(0.99);
  });

  it("detects code with language", () => {
    const content = "def hello():\n    print('world')\n\nif __name__ == '__main__':\n    hello()";
    const detection = detect(content);

    addEntry({
      content,
      type: detection.type,
      language: detection.language,
      confidence: detection.confidence,
    }, dbPath);

    const entries = query({}, dbPath);
    expect(entries[0].type).toBe("code");
    expect(entries[0].language).toBe("python");
  });

  it("deduplicates same content", () => {
    const content = "same content";
    const detection = detect(content);

    addEntry({ content, type: detection.type, confidence: detection.confidence }, dbPath);
    addEntry({ content, type: detection.type, confidence: detection.confidence }, dbPath);

    const entries = query({}, dbPath);
    expect(entries).toHaveLength(1);
  });

  it("stores different content as separate entries", () => {
    addEntry({ content: "first clip", type: "text", confidence: 0.6 }, dbPath);
    addEntry({ content: "second clip", type: "text", confidence: 0.6 }, dbPath);

    const entries = query({}, dbPath);
    expect(entries).toHaveLength(2);
  });
});

describe("watcher integration - secret filtering", () => {
  it("detects secrets that should be filtered", () => {
    const secret = "sk-ant-abc123456789012345678901234567890";
    const result = detectSecret(secret);
    expect(result.isSecret).toBe(true);
  });

  it("allows non-secret content", () => {
    const normal = "Hello, this is just a normal text message";
    const result = detectSecret(normal);
    expect(result.isSecret).toBe(false);
  });

  it("can store secrets when not filtering", () => {
    const secret = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";
    const detection = detect(secret);

    addEntry({
      content: secret,
      type: detection.type,
      confidence: detection.confidence,
    }, dbPath);

    const entries = query({}, dbPath);
    expect(entries).toHaveLength(1);
  });
});
