import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { TOOL_DEFINITIONS } from "../src/mcp/tools.js";
import { handleClipboardHistory } from "../src/mcp/handlers.js";
import { addEntry, getDb, closeDb } from "../src/history/store.js";

let dbPath: string;

beforeEach(() => {
  closeDb();
  dbPath = mkdtempSync(join(tmpdir(), "clipx-mcp-test-")) + "/history.db";
  getDb(dbPath);
});

afterEach(() => {
  closeDb();
  try {
    rmSync(join(dbPath, ".."), { recursive: true });
  } catch {}
});

describe("MCP tool definitions", () => {
  it("includes clipboard_history tool", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "clipboard_history");
    expect(tool).toBeDefined();
    expect(tool!.description).toContain("history");
    expect(tool!.inputSchema.properties).toHaveProperty("limit");
    expect(tool!.inputSchema.properties).toHaveProperty("type");
    expect(tool!.inputSchema.properties).toHaveProperty("search");
  });

  it("includes clipboard_stack_push tool", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "clipboard_stack_push");
    expect(tool).toBeDefined();
    expect(tool!.description).toContain("Push");
  });

  it("includes clipboard_stack_pop tool", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "clipboard_stack_pop");
    expect(tool).toBeDefined();
    expect(tool!.description).toContain("Pop");
  });

  it("has 8 total tools", () => {
    expect(TOOL_DEFINITIONS).toHaveLength(8);
  });

  it("all tools have name, description, and inputSchema", () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(typeof tool.name).toBe("string");
      expect(typeof tool.description).toBe("string");
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});

describe("handleClipboardHistory", () => {
  it("returns empty array when no history", async () => {
    const result = await handleClipboardHistory({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual([]);
  });

  it("returns entries after adding to store", async () => {
    addEntry({ content: "test content", type: "text", confidence: 0.6 }, dbPath);
    addEntry({ content: "SELECT * FROM users", type: "sql", confidence: 0.9 }, dbPath);

    const result = await handleClipboardHistory({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].type).toBe("sql");
    expect(parsed[1].type).toBe("text");
  });

  it("filters by type", async () => {
    addEntry({ content: "plain text", type: "text", confidence: 0.6 }, dbPath);
    addEntry({ content: '{"key": "val"}', type: "json", confidence: 0.99 }, dbPath);

    const result = await handleClipboardHistory({ type: "json" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("json");
  });

  it("searches content", async () => {
    addEntry({ content: "hello world", type: "text", confidence: 0.6 }, dbPath);
    addEntry({ content: "foo bar baz", type: "text", confidence: 0.6 }, dbPath);

    const result = await handleClipboardHistory({ search: "hello" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].content).toBe("hello world");
  });

  it("respects limit", async () => {
    for (let i = 0; i < 5; i++) {
      addEntry({ content: `entry ${i}`, type: "text", confidence: 0.6 }, dbPath);
    }

    const result = await handleClipboardHistory({ limit: 2 });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(2);
  });

  it("returns proper MCP response shape", async () => {
    const result = await handleClipboardHistory({});
    expect(result).toHaveProperty("content");
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty("type", "text");
    expect(result.content[0]).toHaveProperty("text");
  });
});
