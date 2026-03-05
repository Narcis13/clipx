import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { getClipboard } from "../platform/index.js";
import { detect } from "../core/detector.js";

export interface StackItem {
  content: string;
  type: string;
  language?: string;
  pushedAt: string;
}

const STACK_DIR = join(homedir(), ".local", "share", "clipx");
const STACK_FILE = join(STACK_DIR, "stack.json");

function loadStack(): StackItem[] {
  if (!existsSync(STACK_FILE)) return [];
  try {
    const data = readFileSync(STACK_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStack(stack: StackItem[]): void {
  if (!existsSync(STACK_DIR)) {
    mkdirSync(STACK_DIR, { recursive: true });
  }
  writeFileSync(STACK_FILE, JSON.stringify(stack, null, 2));
}

export async function push(): Promise<StackItem> {
  const clipboard = getClipboard();
  const content = await clipboard.readPlain();
  const detection = detect(content);

  const item: StackItem = {
    content,
    type: detection.type,
    ...(detection.language ? { language: detection.language } : {}),
    pushedAt: new Date().toISOString(),
  };

  const stack = loadStack();
  stack.push(item);
  saveStack(stack);

  return item;
}

export async function pop(): Promise<StackItem> {
  const stack = loadStack();
  if (stack.length === 0) {
    throw new Error("Stack is empty");
  }

  const item = stack.pop()!;
  saveStack(stack);

  const clipboard = getClipboard();
  await clipboard.writePlain(item.content);

  return item;
}

export function list(): StackItem[] {
  return loadStack();
}

export async function pick(index: number): Promise<StackItem> {
  const stack = loadStack();
  if (index < 0 || index >= stack.length) {
    throw new Error(`Index ${index} out of bounds (stack size: ${stack.length})`);
  }

  const item = stack[index];
  const clipboard = getClipboard();
  await clipboard.writePlain(item.content);

  return item;
}

export function clear(): void {
  saveStack([]);
}

export async function swap(): Promise<void> {
  const stack = loadStack();
  if (stack.length < 2) {
    throw new Error("Stack needs at least 2 items to swap");
  }

  const last = stack.length - 1;
  [stack[last], stack[last - 1]] = [stack[last - 1], stack[last]];
  saveStack(stack);
}
