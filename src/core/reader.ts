import { getClipboard } from "../platform/index.js";
import { detect, detectWithContext, type DetectionResult, type RichContext } from "./detector.js";
import { detectSecret, redactContent } from "./secrets.js";
import { addEntry, shouldExcludeType } from "../history/store.js";

export interface SourceInfo {
  app?: string;
  bundleId?: string;
  url?: string;
}

export interface ReadResult {
  type: string;
  language?: string;
  confidence: number;
  content: string;
  length: number;
  source?: SourceInfo;
  meta?: Record<string, unknown>;
}

export interface PeekResult {
  type: string;
  language?: string;
  confidence: number;
  length: number;
  preview: string;
}

async function getRichContext(clipboard: ReturnType<typeof getClipboard>): Promise<import("./detector.js").RichContext> {
  const context: import("./detector.js").RichContext = {};
  if (clipboard.hasImage) context.hasImage = await clipboard.hasImage();
  if (clipboard.hasFiles) context.hasFiles = await clipboard.hasFiles();
  return context;
}

export async function readClipboard(): Promise<ReadResult> {
  const clipboard = getClipboard();
  const content = await clipboard.readPlain();

  // Capture source app immediately
  let source: SourceInfo | undefined;
  if (clipboard.readSource) {
    const raw = await clipboard.readSource();
    if (raw) {
      source = {};
      if (raw.app) source.app = raw.app;
      if (raw.bundleId) source.bundleId = raw.bundleId;
      if (raw.url) source.url = raw.url;
    }
  }

  // Use rich context if Swift bridge is available
  const richContext = await getRichContext(clipboard);
  const detection = (richContext.hasImage || richContext.hasFiles)
    ? detectWithContext(content, richContext)
    : detect(content);

  // For images: pbpaste returns empty string — fetch actual binary data via Swift bridge
  if (detection.type === "image" && clipboard.readImage) {
    const imageData = await clipboard.readImage();
    const imageContent = imageData ?? "";
    try {
      if (!shouldExcludeType("image")) {
        addEntry({
          content: `[image data: ${imageContent.length} bytes base64]`,
          type: "image",
          confidence: detection.confidence,
          sourceApp: source?.app,
          sourceBundleId: source?.bundleId,
          sourceUrl: source?.url,
        });
      }
    } catch {
      // best-effort
    }
    return {
      type: "image",
      confidence: detection.confidence,
      content: imageContent,
      length: imageContent.length,
      ...(source ? { source } : {}),
      meta: { ...detection.meta, encoding: "base64", format: "png" },
    };
  }

  // Redact secrets by default
  const outputContent =
    detection.type === "secret" ? redactContent(content) : content;

  // Auto-record to history (dedup handled by addEntry)
  try {
    if (!shouldExcludeType(detection.type)) {
      addEntry({
        content,
        type: detection.type,
        language: detection.language,
        confidence: detection.confidence,
        sourceApp: source?.app,
        sourceBundleId: source?.bundleId,
        sourceUrl: source?.url,
      });
    }
  } catch {
    // History recording is best-effort
  }

  return {
    type: detection.type,
    ...(detection.language ? { language: detection.language } : {}),
    confidence: detection.confidence,
    content: outputContent,
    length: content.length,
    ...(source ? { source } : {}),
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

  const richContext = await getRichContext(clipboard);
  const detection = (richContext.hasImage || richContext.hasFiles)
    ? detectWithContext(content, richContext)
    : detect(content);

  // For images: show size info without fetching full data into preview
  if (detection.type === "image" && clipboard.readImage) {
    const imageData = await clipboard.readImage();
    const b64len = imageData ? imageData.length : 0;
    const approxKB = Math.round(b64len * 0.75 / 1024);
    return {
      type: "image",
      confidence: detection.confidence,
      length: b64len,
      preview: imageData ? `[PNG image, ~${approxKB}KB]` : "[image - no data available]",
    };
  }

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

  // Use rich context if Swift bridge is available
  if (clipboard.hasImage && clipboard.hasFiles) {
    const [hasImage, hasFiles] = await Promise.all([
      clipboard.hasImage(),
      clipboard.hasFiles(),
    ]);
    if (hasImage || hasFiles) {
      return detectWithContext(content, { hasImage, hasFiles });
    }
  }

  return detect(content);
}

export interface ImageReadResult {
  type: "image";
  data: string; // base64-encoded PNG
  encoding: "base64";
}

export async function readClipboardImage(): Promise<ImageReadResult | null> {
  const clipboard = getClipboard();
  if (!clipboard.readImage) return null;
  const data = await clipboard.readImage();
  if (!data) return null;

  try {
    addEntry({
      content: `[image data: ${data.length} bytes base64]`,
      type: "image",
      confidence: 0.99,
    });
  } catch {
    // best-effort
  }

  return { type: "image", data, encoding: "base64" };
}

export async function readClipboardFiles(): Promise<string[] | null> {
  const clipboard = getClipboard();
  if (!clipboard.readFiles) return null;
  const files = await clipboard.readFiles();
  if (!files || files.length === 0) return files;

  const content = files.join("\n");
  try {
    addEntry({
      content,
      type: "file-ref",
      confidence: 0.99,
    });
  } catch {
    // best-effort
  }

  return files;
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
