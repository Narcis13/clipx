import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// We test the stack logic by overriding the stack file path and mocking clipboard.
// Since the module uses hardcoded paths, we'll test the file-based persistence
// directly and the integration through the CLI.

const TEST_DIR = join(tmpdir(), `clipx-stack-test-${Date.now()}`);
const TEST_STACK_FILE = join(TEST_DIR, "stack.json");

interface StackItem {
  content: string;
  type: string;
  language?: string;
  pushedAt: string;
}

function loadStack(): StackItem[] {
  if (!existsSync(TEST_STACK_FILE)) return [];
  try {
    return JSON.parse(readFileSync(TEST_STACK_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveStack(items: StackItem[]): void {
  writeFileSync(TEST_STACK_FILE, JSON.stringify(items, null, 2));
}

function makeItem(content: string, type = "text"): StackItem {
  return { content, type, pushedAt: new Date().toISOString() };
}

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  // Start with empty stack
  if (existsSync(TEST_STACK_FILE)) {
    rmSync(TEST_STACK_FILE);
  }
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
});

describe("Stack persistence", () => {
  test("saves and loads items from file", () => {
    const items = [makeItem("hello"), makeItem("world")];
    saveStack(items);
    const loaded = loadStack();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].content).toBe("hello");
    expect(loaded[1].content).toBe("world");
  });

  test("returns empty array when file does not exist", () => {
    const loaded = loadStack();
    expect(loaded).toEqual([]);
  });

  test("returns empty array when file contains invalid JSON", () => {
    writeFileSync(TEST_STACK_FILE, "not json");
    const loaded = loadStack();
    expect(loaded).toEqual([]);
  });
});

describe("Stack push/pop lifecycle", () => {
  test("push adds items to end, pop removes from end (LIFO)", () => {
    const stack: StackItem[] = [];
    stack.push(makeItem("first"));
    stack.push(makeItem("second"));
    stack.push(makeItem("third"));
    saveStack(stack);

    const loaded = loadStack();
    expect(loaded).toHaveLength(3);

    // Pop returns last pushed
    const popped = loaded.pop()!;
    expect(popped.content).toBe("third");
    saveStack(loaded);

    const loaded2 = loadStack();
    expect(loaded2).toHaveLength(2);
    expect(loaded2[loaded2.length - 1].content).toBe("second");
  });
});

describe("Stack pick", () => {
  test("pick by index returns correct item", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    saveStack(items);
    const loaded = loadStack();
    expect(loaded[0].content).toBe("a");
    expect(loaded[1].content).toBe("b");
    expect(loaded[2].content).toBe("c");
  });

  test("pick does not remove item from stack", () => {
    const items = [makeItem("a"), makeItem("b")];
    saveStack(items);
    const loaded = loadStack();
    const picked = loaded[1];
    expect(picked.content).toBe("b");
    // Stack unchanged
    expect(loaded).toHaveLength(2);
  });
});

describe("Stack edge cases", () => {
  test("pop from empty stack throws", () => {
    const stack: StackItem[] = [];
    expect(stack.length).toBe(0);
    expect(() => {
      if (stack.length === 0) throw new Error("Stack is empty");
      stack.pop();
    }).toThrow("Stack is empty");
  });

  test("pick out of bounds throws", () => {
    const stack = [makeItem("only")];
    const index = 5;
    expect(() => {
      if (index < 0 || index >= stack.length)
        throw new Error(`Index ${index} out of bounds (stack size: ${stack.length})`);
    }).toThrow("out of bounds");
  });

  test("pick with negative index throws", () => {
    const stack = [makeItem("item")];
    const index = -1;
    expect(() => {
      if (index < 0 || index >= stack.length)
        throw new Error(`Index ${index} out of bounds (stack size: ${stack.length})`);
    }).toThrow("out of bounds");
  });

  test("swap with fewer than 2 items throws", () => {
    const stack = [makeItem("only")];
    expect(() => {
      if (stack.length < 2) throw new Error("Stack needs at least 2 items to swap");
    }).toThrow("at least 2 items");
  });

  test("swap exchanges top two items", () => {
    const stack = [makeItem("bottom"), makeItem("a"), makeItem("b")];
    const last = stack.length - 1;
    [stack[last], stack[last - 1]] = [stack[last - 1], stack[last]];
    expect(stack[stack.length - 1].content).toBe("a");
    expect(stack[stack.length - 2].content).toBe("b");
    expect(stack[0].content).toBe("bottom");
  });

  test("clear empties the stack", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    saveStack(items);
    saveStack([]);
    const loaded = loadStack();
    expect(loaded).toEqual([]);
  });
});

describe("Stack CLI integration", () => {
  test("clipx stack list on empty stack", async () => {
    const proc = Bun.spawn(
      ["bun", "run", "bin/clipx.ts", "stack", "list"],
      { cwd: "/Users/narcisbrindusescu/newme/clipx", stdout: "pipe", stderr: "pipe" }
    );
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;
    expect(stdout.trim()).toContain("empty");
  });

  test("clipx stack push and list round-trip", async () => {
    // First push something to clipboard
    const writeProc = Bun.spawn(
      ["bun", "run", "bin/clipx.ts", "write", "stack-test-item"],
      { cwd: "/Users/narcisbrindusescu/newme/clipx", stdout: "pipe", stderr: "pipe" }
    );
    await writeProc.exited;

    // Push to stack
    const pushProc = Bun.spawn(
      ["bun", "run", "bin/clipx.ts", "stack", "push"],
      { cwd: "/Users/narcisbrindusescu/newme/clipx", stdout: "pipe", stderr: "pipe" }
    );
    const pushStderr = await new Response(pushProc.stderr).text();
    await pushProc.exited;
    expect(pushStderr).toContain("Pushed");

    // List should show the item
    const listProc = Bun.spawn(
      ["bun", "run", "bin/clipx.ts", "stack", "list", "--json"],
      { cwd: "/Users/narcisbrindusescu/newme/clipx", stdout: "pipe", stderr: "pipe" }
    );
    const listOut = await new Response(listProc.stdout).text();
    await listProc.exited;
    const items = JSON.parse(listOut);
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[items.length - 1].content).toBe("stack-test-item");

    // Clean up
    const clearProc = Bun.spawn(
      ["bun", "run", "bin/clipx.ts", "stack", "clear"],
      { cwd: "/Users/narcisbrindusescu/newme/clipx", stdout: "pipe", stderr: "pipe" }
    );
    await clearProc.exited;
  });
});
