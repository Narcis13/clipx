import {
  readClipboard,
  readClipboardRaw,
  peekClipboard,
  typeClipboard,
} from "../core/reader.js";
import { writeClipboard } from "../core/writer.js";
import { query as historyQuery } from "../history/store.js";
import { push as stackPush, pop as stackPop } from "../history/stack.js";

export async function handleClipboardRead(args: {
  format?: string;
}): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const format = args.format ?? "auto";

  if (format === "raw") {
    const content = await readClipboardRaw();
    return {
      content: [{ type: "text", text: content }],
    };
  }

  // auto format — structured with type detection
  const result = await readClipboard();
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleClipboardWrite(args: {
  content: string;
  restore?: boolean;
}): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  await writeClipboard(args.content, { restore: args.restore });

  const message = args.restore
    ? `Written to clipboard (${args.content.length} chars). Previous content will be restored in 30s.`
    : `Written to clipboard (${args.content.length} chars).`;

  return {
    content: [{ type: "text", text: message }],
  };
}

export async function handleClipboardPeek(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const result = await peekClipboard();
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleClipboardType(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const result = await typeClipboard();
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleClipboardHistory(args: {
  limit?: number;
  type?: string;
  search?: string;
}): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const entries = historyQuery({
    limit: args.limit,
    type: args.type,
    search: args.search,
  });

  return {
    content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
  };
}

export async function handleClipboardStackPush(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const item = await stackPush();
  const preview =
    item.content.length > 80
      ? item.content.slice(0, 80) + "..."
      : item.content;

  return {
    content: [
      {
        type: "text",
        text: `Pushed to stack: [${item.type}] ${preview}`,
      },
    ],
  };
}

export async function handleClipboardStackPop(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const item = await stackPop();
  const preview =
    item.content.length > 80
      ? item.content.slice(0, 80) + "..."
      : item.content;

  return {
    content: [
      {
        type: "text",
        text: `Popped from stack and written to clipboard: [${item.type}] ${preview}`,
      },
    ],
  };
}
