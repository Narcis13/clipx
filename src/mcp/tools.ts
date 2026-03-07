import { z } from "zod";

export const clipboardReadSchema = z.object({
  format: z
    .enum(["auto", "raw", "html", "rtf"])
    .default("auto")
    .describe(
      "Which clipboard representation to read. 'auto' returns plain text with type metadata (default). 'raw' returns plain text with no metadata."
    ),
});

export const clipboardWriteSchema = z.object({
  content: z.string().describe("Content to write to clipboard"),
  restore: z
    .boolean()
    .default(false)
    .describe(
      "If true, saves current clipboard content and restores it after 30 seconds"
    ),
});

export const clipboardPeekSchema = z.object({});

export const clipboardTypeSchema = z.object({});

export const clipboardHistorySchema = z.object({
  limit: z.number().optional().describe("Number of entries to return (default 20)"),
  type: z.string().optional().describe("Filter by content type (e.g. code, json, url, text)"),
  search: z.string().optional().describe("Full-text search in content"),
});

export const clipboardStackPushSchema = z.object({});

export const clipboardStackPopSchema = z.object({});

export const TOOL_DEFINITIONS = [
  {
    name: "clipboard_read" as const,
    description:
      "Read the current clipboard contents with automatic type detection. Returns the content, detected type (code, json, url, error, table, sql, text, secret, file-ref), language (for code), and confidence score. Use this when the user says 'fix this', 'look at this', 'what is this' without providing content — they likely copied it to clipboard.",
    inputSchema: {
      type: "object" as const,
      properties: {
        format: {
          type: "string",
          enum: ["auto", "raw", "html", "rtf"],
          description:
            "Which clipboard representation to read. 'auto' returns plain text with type metadata (default). 'raw' returns plain text with no metadata.",
          default: "auto",
        },
      },
    },
  },
  {
    name: "clipboard_write" as const,
    description:
      "Write content to the clipboard. Use after generating code, fixing errors, or producing any output the user will want to paste into another application. Optionally saves the previous clipboard content for restoration.",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string",
          description: "Content to write to clipboard",
        },
        restore: {
          type: "boolean",
          description:
            "If true, saves current clipboard content and restores it after 30 seconds",
          default: false,
        },
      },
      required: ["content"],
    },
  },
  {
    name: "clipboard_peek" as const,
    description:
      "Quick, low-cost preview of clipboard contents. Returns type, length, and first 200 characters. Use this to check what's on the clipboard before deciding whether to do a full read. Costs fewer tokens than clipboard_read.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "clipboard_type" as const,
    description:
      "Detect the type of content currently on the clipboard without returning the full content. Returns type, language (if code), confidence, and metadata. Use when you need to know what kind of content is on the clipboard to decide your next action.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "clipboard_history" as const,
    description:
      "Query the clipboard history stored in SQLite. Returns recent clipboard entries with type detection metadata. Use to find previously copied content, search for specific clips, or filter by content type.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of entries to return (default 20)",
        },
        type: {
          type: "string",
          description:
            "Filter by content type (e.g. code, json, url, text, sql, error, secret)",
        },
        search: {
          type: "string",
          description: "Full-text search in clipboard content",
        },
      },
    },
  },
  {
    name: "clipboard_stack_push" as const,
    description:
      "Push the current clipboard contents onto the clipboard stack. The stack preserves multiple clipboard items for later retrieval. Use when you need to save the current clipboard before overwriting it.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "clipboard_stack_pop" as const,
    description:
      "Pop the top item from the clipboard stack and write it to the clipboard. Removes the item from the stack. Use to restore a previously saved clipboard entry.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "clipboard_read_image" as const,
    description:
      "Read an image from the clipboard and return it as visual content that Claude can see and analyze. Use when the user says 'look at this screenshot', 'what's in this image', 'analyze this', or after a CMD+CTRL+SHIFT+4 screenshot capture. Returns the actual PNG image for visual inspection.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];
