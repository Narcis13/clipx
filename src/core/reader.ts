import { getClipboard } from "../platform/index.js";
import { detect, type DetectionResult } from "./detector.js";
import { detectSecret, redactContent } from "./secrets.js";

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
