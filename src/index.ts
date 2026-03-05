// clipx — AI-Powered Clipboard Intelligence
// Library entry point for programmatic use

export { detect, type DetectionResult, type ContentType } from "./core/detector.js";
export { detectSecret, redactContent, shannonEntropy } from "./core/secrets.js";
export {
  readClipboard,
  readClipboardRaw,
  peekClipboard,
  typeClipboard,
  type ReadResult,
  type PeekResult,
} from "./core/reader.js";
export { writeClipboard, restoreClipboard } from "./core/writer.js";
