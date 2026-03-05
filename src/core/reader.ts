import { getClipboard } from "../platform/index.js";
import { detect, type DetectionResult } from "./detector.js";
import { detectSecret, redactContent } from "./secrets.js";
import { addEntry } from "../history/store.js";

export interface ReadResult {
  type: string;
  language?: string;
  confidence: number;
  content: string;
  length: number;
  meta?: Record<string, unknown>;
}

export interface PeekResult {
  type: string;
  language?: string;
  confidence: number;
  length: number;
  preview: string;
}

export async function readClipboard(): Promise<ReadResult> {
  const clipboard = getClipboard();
  const content = await clipboard.readPlain();
  const detection = detect(content);

  // Redact secrets by default
  const outputContent =
    detection.type === "secret" ? redactContent(content) : content;

  // Auto-record to history (dedup handled by addEntry)
  try {
    addEntry({
      content,
      type: detection.type,
      language: detection.language,
      confidence: detection.confidence,
    });
  } catch {
    // History recording is best-effort
  }

  return {
    type: detection.type,
    ...(detection.language ? { language: detection.language } : {}),
    confidence: detection.confidence,
    content: outputContent,
    length: content.length,
    ...(detection.meta ? { meta: detection.meta } : {}),
  };
}

export async function readClipboardRaw(): Promise<string> {
  const clipboard = getClipboard();
  return await clipboard.readPlain();
}

export async function peekClipboard(): Promise<PeekResult> {
  const clipboard = getClipboard();
  const content = await clipboard.readPlain();
  const detection = detect(content);

  const previewLength = 200;
  let preview: string;
  if (detection.type === "secret") {
    preview = redactContent(content);
  } else if (content.length > previewLength) {
    preview = content.slice(0, previewLength) + "...";
  } else {
    preview = content;
  }

  return {
    type: detection.type,
    ...(detection.language ? { language: detection.language } : {}),
    confidence: detection.confidence,
    length: content.length,
    preview,
  };
}

export async function typeClipboard(): Promise<DetectionResult> {
  const clipboard = getClipboard();
  const content = await clipboard.readPlain();
  return detect(content);
}

export interface RichReadResult {
  plain: string;
  html?: string | null;
  rtf?: string | null;
  types?: string[];
}

export async function readClipboardHTML(): Promise<string | null> {
  const clipboard = getClipboard();
  if (!clipboard.readHTML) {
    throw new Error("HTML clipboard reading is not supported on this platform");
  }
  return clipboard.readHTML();
}

export async function readClipboardRTF(): Promise<string | null> {
  const clipboard = getClipboard();
  if (!clipboard.readRTF) {
    throw new Error("RTF clipboard reading is not supported on this platform");
  }
  return clipboard.readRTF();
}

export async function readClipboardRich(): Promise<RichReadResult> {
  const clipboard = getClipboard();
  const plain = await clipboard.readPlain();

  const result: RichReadResult = { plain };

  if (clipboard.readRichTypes) {
    result.types = await clipboard.readRichTypes();
  }
  if (clipboard.readHTML) {
    result.html = await clipboard.readHTML();
  }
  if (clipboard.readRTF) {
    result.rtf = await clipboard.readRTF();
  }

  return result;
}
