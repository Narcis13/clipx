import { getClipboard } from "../platform/index.js";
import { detect } from "./detector.js";
import { addEntry } from "../history/store.js";

let savedContent: string | null = null;
let restoreTimer: ReturnType<typeof setTimeout> | null = null;

export async function writeClipboard(
  content: string,
  options?: { restore?: boolean; restoreDelay?: number }
): Promise<void> {
  const clipboard = getClipboard();

  if (options?.restore) {
    // Save current clipboard for restoration
    savedContent = await clipboard.readPlain();

    // Clear any existing restore timer
    if (restoreTimer) {
      clearTimeout(restoreTimer);
    }

    // Set up auto-restore
    const delay = options.restoreDelay ?? 30000; // 30 seconds default
    restoreTimer = setTimeout(async () => {
      if (savedContent !== null) {
        await clipboard.writePlain(savedContent);
        savedContent = null;
        restoreTimer = null;
      }
    }, delay);
  }

  await clipboard.writePlain(content);

  // Auto-record to history (dedup handled by addEntry)
  try {
    const detection = detect(content);
    addEntry({
      content,
      type: detection.type,
      language: detection.language,
      confidence: detection.confidence,
    });
  } catch {
    // History recording is best-effort
  }
}

export async function restoreClipboard(): Promise<boolean> {
  if (savedContent === null) return false;

  const clipboard = getClipboard();
  await clipboard.writePlain(savedContent);

  if (restoreTimer) {
    clearTimeout(restoreTimer);
    restoreTimer = null;
  }
  savedContent = null;
  return true;
}
