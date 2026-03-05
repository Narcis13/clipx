import {
  readClipboard,
  readClipboardRaw,
  peekClipboard,
  typeClipboard,
} from "../core/reader.js";
import { writeClipboard } from "../core/writer.js";

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
