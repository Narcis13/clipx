import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { addEntry, query, prune, clearHistory, getDb, closeDb, type AddEntryInput } from "../src/history/store.js";

function makeTempDb(): string {
  const dir = mkdtempSync(join(tmpdir(), "clipx-test-"));
  return join(dir, "history.db");
}

let dbPath: string;

beforeEach(() => {
  closeDb();
  dbPath = makeTempDb();
  getDb(dbPath);
});

afterEach(() => {
  closeDb();
  try {
    rmSync(join(dbPath, ".."), { recursive: true });
  } catch {}
});

describe("addEntry", () => {
  it("inserts a new entry and returns it", () => {
    const input: AddEntryInput = {
      content: "hello world",
      type: "text",
      confidence: 0.8,
    };
    const entry = addEntry(input, dbPath);
    expect(entry.id).toBeGreaterThan(0);
    expect(entry.content).toBe("hello world");
    expect(entry.type).toBe("text");
    expect(entry.language).toBeNull();
    expect(entry.confidence).toBe(0.8);
    expect(entry.length).toBe(11);
    expect(entry.preview).toBe("hello world");
  });

  it("deduplicates consecutive identical entries", () => {
    const input: AddEntryInput = {
      content: "duplicate text",
      type: "text",
      confidence: 0.8,
    };
    const first = addEntry(input, dbPath);
    const second = addEntry(input, dbPath);
    expect(first.id).toBe(second.id);

    const entries = query({ limit: 10 }, dbPath);
    expect(entries).toHaveLength(1);
  });

  it("allows different content after a duplicate", () => {
    addEntry({ content: "first", type: "text", confidence: 0.8 }, dbPath);
    addEntry({ content: "first", type: "text", confidence: 0.8 }, dbPath);
    addEntry({ content: "second", type: "text", confidence: 0.8 }, dbPath);

    const entries = query({ limit: 10 }, dbPath);
    expect(entries).toHaveLength(2);
  });

  it("stores language when provided", () => {
    const entry = addEntry({
      content: "const x = 1;",
      type: "code",
      language: "javascript",
      confidence: 0.9,
    }, dbPath);
    expect(entry.language).toBe("javascript");
  });

  it("truncates preview for long content", () => {
    const longContent = "a".repeat(200);
    const entry = addEntry({
      content: longContent,
      type: "text",
      confidence: 0.6,
    }, dbPath);
    expect(entry.preview.length).toBeLessThan(200);
    expect(entry.preview).toEndWith("...");
  });
});

describe("query", () => {
  beforeEach(() => {
    addEntry({ content: "json content {}", type: "json", confidence: 0.99 }, dbPath);
    addEntry({ content: "some code", type: "code", language: "python", confidence: 0.85 }, dbPath);
    addEntry({ content: "https://example.com", type: "url", confidence: 0.99 }, dbPath);
    addEntry({ content: "SELECT * FROM users", type: "sql", confidence: 0.9 }, dbPath);
    addEntry({ content: "plain text", type: "text", confidence: 0.6 }, dbPath);
  });

  it("returns entries in reverse chronological order", () => {
    const entries = query({}, dbPath);
    expect(entries[0].content).toBe("plain text");
    expect(entries[entries.length - 1].content).toBe("json content {}");
  });

  it("respects limit", () => {
    const entries = query({ limit: 2 }, dbPath);
    expect(entries).toHaveLength(2);
  });

  it("filters by type", () => {
    const entries = query({ type: "url" }, dbPath);
    expect(entries).toHaveLength(1);
    expect(entries[0].content).toBe("https://example.com");
  });

  it("searches content", () => {
    const entries = query({ search: "SELECT" }, dbPath);
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("sql");
  });

  it("returns empty array for no matches", () => {
    const entries = query({ search: "nonexistent" }, dbPath);
    expect(entries).toHaveLength(0);
  });
});

describe("prune", () => {
  it("removes oldest entries when over max", () => {
    for (let i = 0; i < 10; i++) {
      addEntry({ content: `entry ${i}`, type: "text", confidence: 0.6 }, dbPath);
    }

    const deleted = prune(5, dbPath);
    expect(deleted).toBe(5);

    const entries = query({ limit: 100 }, dbPath);
    expect(entries).toHaveLength(5);
    // Should keep the newest entries
    expect(entries[0].content).toBe("entry 9");
  });

  it("does nothing when under max", () => {
    addEntry({ content: "only one", type: "text", confidence: 0.6 }, dbPath);
    const deleted = prune(100, dbPath);
    expect(deleted).toBe(0);
  });
});

describe("clearHistory", () => {
  it("removes all entries", () => {
    addEntry({ content: "one", type: "text", confidence: 0.6 }, dbPath);
    addEntry({ content: "two", type: "text", confidence: 0.6 }, dbPath);

    clearHistory(dbPath);
    const entries = query({}, dbPath);
    expect(entries).toHaveLength(0);
  });
});
