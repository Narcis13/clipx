// clipx — AI-Powered Clipboard Intelligence
// Library entry point for programmatic use

export { detect, type DetectionResult, type ContentType } from "./core/detector.js";
export { detectSecret, redactContent, shannonEntropy } from "./core/secrets.js";
export {
  readClipboard,
  readClipboardRaw,
  readClipboardHTML,
  readClipboardRTF,
  readClipboardRich,
  peekClipboard,
  typeClipboard,
  type ReadResult,
  type PeekResult,
  type RichReadResult,
} from "./core/reader.js";
export { writeClipboard, restoreClipboard } from "./core/writer.js";
export { autoFormat, formatJSON, formatSQL, formatCode } from "./transforms/formatter.js";
export {
  push as stackPush,
  pop as stackPop,
  list as stackList,
  pick as stackPick,
  clear as stackClear,
  swap as stackSwap,
  type StackItem,
} from "./history/stack.js";
export {
  autoValidate,
  validateJSON,
  validateURL,
  validateSQL,
  type ValidationResult,
  type ValidationError,
} from "./transforms/validator.js";
export {
  addEntry as historyAdd,
  query as historyQuery,
  prune as historyPrune,
  clearHistory,
  closeDb as historyClose,
  type HistoryEntry,
  type QueryOptions as HistoryQueryOptions,
} from "./history/store.js";
export { watch as historyWatch, type WatchOptions } from "./history/watcher.js";
export {
  transform as aiTransform,
  type TransformOp,
  type TransformOptions,
} from "./ai/transforms.js";
export {
  getConfig as aiGetConfig,
  setConfig as aiSetConfig,
  type AIConfig,
  type AIProvider,
} from "./ai/config.js";
export {
  complete as aiComplete,
  type ChatMessage,
  type CompletionResult,
} from "./ai/provider.js";
